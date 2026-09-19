import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetRequest } from "../../src/authoring/asset-request";
import type { ArtbenchEvent } from "../../src/authoring/artbench";
import { tinyPng } from "./art-desk-inputs.test";
import { hashBytes } from "./art-desk-inputs";
import { ArtbenchStore, logicalCandidateId } from "./artbench-store";

const OWNER = { kind: "owner" as const, id: "test-owner-fixture" };
const CONTRACT = {
  fitContractHash: "f".repeat(64),
  sceneContractHash: "s".repeat(64),
  contractVersion: "alive43-art-desk-v1",
  authority: "session-capability" as const,
};
const EVENTS = "03_REVIEW_AND_INTEGRATION_EVENTS";

function request(id: string): AssetRequest {
  return {
    requestId: id,
    requestVersion: 1,
    priority: "P2",
    status: "queued",
    title: id,
    consumer: {
      consumerId: `consumer-${id}`,
      runtimeComponent: "none",
      playerVisibleUse: "Test.",
    },
    whyNeeded: "Tests.",
    inventoryCheck: {
      repositoryPathsSearched: [],
      driveLocationsSearched: [],
      found: "",
      shortfall: "",
    },
    target: {
      targetClass: "environment-plate",
      minimumWidth: 1,
      aspectRatio: "any",
      alphaRequired: false,
      container: "either",
      styleAuthority: "fixture",
    },
    generationRecipe: [],
    acceptanceCriteria: [],
    dependsOn: [],
  };
}

function setup() {
  const workspace = mkdtempSync(join(tmpdir(), "artbench-dup-ws-"));
  mkdirSync(join(workspace, "art/requests"), { recursive: true });
  writeFileSync(
    join(workspace, "art/requests/asset-requests.json"),
    JSON.stringify({
      documentVersion: 1,
      generatedFrom: "test",
      requests: [request("env-white-house"), request("env-other")],
    }),
  );
  const drive = mkdtempSync(join(tmpdir(), "artbench-dup-drive-"));
  for (const folder of ["01_INBOX", "02_CATALOG", EVENTS])
    mkdirSync(join(drive, folder), { recursive: true });
  const open = (dataRoot: string) =>
    new ArtbenchStore({
      dataRoot,
      workspace,
      driveRoot: drive,
      ownerId: OWNER.id,
    });
  return { workspace, drive, open };
}

function dropBatch(
  drive: string,
  batchId: string,
  items: { itemId: string; bytes: Buffer; requestId: string }[],
) {
  const folder = join(drive, "01_INBOX", batchId);
  mkdirSync(folder, { recursive: true });
  for (const item of items)
    writeFileSync(join(folder, `${item.itemId}.png`), item.bytes);
  writeFileSync(
    join(folder, "manifest.json"),
    JSON.stringify({
      batchId,
      items: items.map((item) => ({
        itemId: item.itemId,
        file: `${item.itemId}.png`,
        requestId: item.requestId,
        worker: "fixture-producer",
        referenceInputs: [
          {
            ref: "drive:style-fixture",
            sha256: "c".repeat(64),
            role: "drawing-style",
          },
        ],
      })),
    }),
  );
}

const cards = (store: ArtbenchStore, requestId: string) =>
  store.projection().requests[requestId]?.candidateIds ?? [];

describe("one delivered item stays one review card across stores", () => {
  for (const order of ["A first", "B first"] as const) {
    it(`two stores ingesting the same item converge (${order}) and survive a restart`, () => {
      const { drive, open } = setup();
      const rootA = mkdtempSync(join(tmpdir(), "artbench-dup-a-"));
      const rootB = mkdtempSync(join(tmpdir(), "artbench-dup-b-"));
      const a = open(rootA);
      const b = open(rootB);
      const bytes = tinyPng(6, 4);
      dropBatch(drive, "batch-white-house-001", [
        { itemId: "exterior-001", bytes, requestId: "env-white-house" },
      ]);
      const [first, second] = order === "A first" ? [a, b] : [b, a];
      first.syncOnce();
      second.syncOnce();
      first.syncOnce();
      for (const store of [a, b]) {
        expect(cards(store, "env-white-house")).toHaveLength(1);
      }
      const id = cards(a, "env-white-house")[0]!;
      expect(cards(b, "env-white-house")[0]).toBe(id);
      expect(id).toBe(
        logicalCandidateId({
          requestId: "env-white-house",
          requestVersion: 1,
          batchId: "batch-white-house-001",
          itemId: "exterior-001",
          sha256: hashBytes(bytes),
          editKind: "original",
        }),
      );
      const candidate = a.projection().candidates[id]!;
      expect(candidate.provenance.referenceInputs).toEqual([
        {
          ref: "drive:style-fixture",
          sha256: "c".repeat(64),
          role: "drawing-style",
        },
      ]);
      expect(a.projection().rejectedEvents).toEqual([]);
      // Restart both stores from their logs: still one card each.
      expect(cards(open(rootA), "env-white-house")).toEqual([id]);
      expect(cards(open(rootB), "env-white-house")).toEqual([id]);
    });
  }

  it("keeps different bytes, different requests and different lineages distinct, and surfaces a reused item id", () => {
    const { drive, open } = setup();
    const store = open(mkdtempSync(join(tmpdir(), "artbench-dup-c-")));
    dropBatch(drive, "batch-distinct", [
      {
        itemId: "same-item",
        bytes: tinyPng(5, 5),
        requestId: "env-white-house",
      },
      { itemId: "other-request", bytes: tinyPng(5, 5), requestId: "env-other" },
    ]);
    store.syncOnce();
    // The same item id comes back with changed content in a second batch
    // folder that declares the same batch id.
    const folder = join(drive, "01_INBOX", "batch-distinct-retry");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "same-item.png"), tinyPng(7, 5));
    writeFileSync(
      join(folder, "manifest.json"),
      JSON.stringify({
        batchId: "batch-distinct",
        items: [
          {
            itemId: "same-item",
            file: "same-item.png",
            requestId: "env-white-house",
          },
        ],
      }),
    );
    store.syncOnce();
    const projection = store.projection();
    expect(cards(store, "env-white-house")).toHaveLength(2);
    expect(cards(store, "env-other")).toHaveLength(1);
    expect(projection.intakeConflicts).toEqual([
      expect.objectContaining({
        requestId: "env-white-house",
        batchId: "batch-distinct",
        itemId: "same-item",
        sha256s: [hashBytes(tinyPng(5, 5)), hashBytes(tinyPng(7, 5))],
      }),
    ]);
    // Same bytes as two different edit lineages are not merged.
    const [original] = cards(store, "env-white-house");
    const bytes = tinyPng(9, 9);
    const editA = store.ingest(
      bytes,
      {
        requestId: "env-white-house",
        parentCandidateId: original,
        editKind: "repaint",
      },
      OWNER,
    );
    const editB = store.ingest(
      bytes,
      {
        requestId: "env-white-house",
        parentCandidateId: cards(store, "env-white-house")[1],
        editKind: "repaint",
      },
      OWNER,
    );
    expect(editB.candidate.candidateId).not.toBe(editA.candidate.candidateId);
    expect(editB.duplicate).toBe(false);
  });

  it("keeps distinct batch items with identical pixels as separate reviewable deliveries", () => {
    const { drive, open } = setup();
    const store = open(mkdtempSync(join(tmpdir(), "artbench-dup-same-bytes-")));
    const bytes = tinyPng(5, 5);
    dropBatch(drive, "batch-first", [
      { itemId: "exterior-001", bytes, requestId: "env-white-house" },
    ]);
    dropBatch(drive, "batch-second", [
      { itemId: "exterior-002", bytes, requestId: "env-white-house" },
    ]);
    store.syncOnce();
    const ids = cards(store, "env-white-house");
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(
      ids.map((id) => store.projection().candidates[id]!.provenance.batchId),
    ).toEqual(["batch-first", "batch-second"]);
  });
});

function legacyIngest(
  eventId: string,
  origin: string,
  candidateId: string,
  bytes: Buffer,
  at: string,
): ArtbenchEvent {
  return {
    contractVersion: "artbench-events/v1",
    eventId,
    seq: 1,
    at,
    actor: { kind: "owner", id: OWNER.id },
    source: "bench",
    origin,
    type: "candidate.ingested",
    payload: {
      candidateId,
      assetId: "asset:env-white-house",
      requestId: "env-white-house",
      requestVersion: 1,
      sha256: hashBytes(bytes),
      byteLength: bytes.length,
      container: "png",
      width: 6,
      height: 6,
      hasAlpha: false,
      storagePath: `bytes/${hashBytes(bytes)}.png`,
      editKind: "original",
      provenance: {
        batchId: "batch-20260916-white-house-intro-001",
        itemId: "white-house-intro-exterior-001",
      },
      nativeDetail: "unverified",
      calibrationRecheck: [],
    },
  } as ArtbenchEvent;
}

describe("legacy duplicates from random ids", () => {
  function legacyStore(bytes: Buffer) {
    const { open } = setup();
    const root = mkdtempSync(join(tmpdir(), "artbench-dup-legacy-"));
    mkdirSync(join(root, "bytes"), { recursive: true });
    writeFileSync(join(root, "bytes", `${hashBytes(bytes)}.png`), bytes);
    const store = open(root);
    store.admitForeign(
      legacyIngest(
        "ev-hub",
        "store-hub",
        "cand-legacy-hub",
        bytes,
        "2026-09-16T18:00:00.000Z",
      ),
    );
    store.admitForeign(
      legacyIngest(
        "ev-standalone",
        "store-standalone",
        "cand-legacy-standalone",
        bytes,
        "2026-09-16T18:00:00.100Z",
      ),
    );
    return { store, root, open };
  }

  const decide = (
    store: ArtbenchStore,
    candidateId: string,
    decision: "reject" | "approve",
  ) => {
    const candidate = store.projection().candidates[candidateId]!;
    return store.decide({
      candidateId,
      viewedCandidateId: candidateId,
      viewedSha256: candidate.sha256,
      decision,
      actor: OWNER,
      ...CONTRACT,
    });
  };

  it("groups two rejected duplicates into one card and keeps both ids and rejections", () => {
    const bytes = tinyPng(6, 6);
    const { store, root, open } = legacyStore(bytes);
    decide(store, "cand-legacy-hub", "reject");
    decide(store, "cand-legacy-standalone", "reject");
    for (const s of [store, open(root)]) {
      const projection = s.projection();
      const request = projection.requests["env-white-house"]!;
      expect(request.candidateIds).toEqual(["cand-legacy-hub"]);
      expect(request.lane).not.toBe("needs-review");
      const canonical = projection.candidates["cand-legacy-hub"]!;
      const alias = projection.candidates["cand-legacy-standalone"]!;
      expect(canonical.aliasIds).toEqual(["cand-legacy-standalone"]);
      expect(alias.aliasOf).toBe("cand-legacy-hub");
      expect(canonical.status).toBe("rejected");
      expect(alias.status).toBe("rejected");
      expect(canonical.decisions).toHaveLength(1);
      expect(alias.decisions).toHaveLength(1);
      expect(canonical.groupDecisions).toHaveLength(2);
      expect(canonical.duplicateDecisionConflict).toBe(false);
      expect(projection.integrationQueue).toEqual([]);
    }
  });

  it("refuses a reused logical candidate id with a different request version", () => {
    const bytes = tinyPng(6, 6);
    const { store } = legacyStore(bytes);
    const changed = legacyIngest(
      "ev-reused-id",
      "store-another",
      "cand-legacy-hub",
      bytes,
      "2026-09-16T18:01:00.000Z",
    );
    store.admitForeign({
      ...changed,
      payload: { ...changed.payload, requestVersion: 2 },
    } as ArtbenchEvent);
    const projection = store.projection();
    expect(
      projection.candidates["cand-legacy-hub"]!.ingestReceipts,
    ).toHaveLength(1);
    expect(projection.rejectedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "ev-reused-id",
          reason: expect.stringContaining("different content"),
        }),
      ]),
    );
  });

  it("does not show the group as pending when only the alias was decided, and never transfers an imported review", () => {
    const bytes = tinyPng(6, 6);
    const { store } = legacyStore(bytes);
    decide(store, "cand-legacy-standalone", "reject");
    const canonical = store.projection().candidates["cand-legacy-hub"]!;
    expect(canonical.decisions).toHaveLength(0);
    expect(canonical.status).toBe("rejected");
    store.admitForeign({
      contractVersion: "artbench-events/v1",
      eventId: "foreign-approval",
      seq: 1,
      at: "2026-09-16T19:00:00.000Z",
      actor: { kind: "owner", id: "someone-else" },
      source: "bench",
      origin: "store-elsewhere",
      type: "review.decided",
      payload: {
        reviewId: "rev-foreign",
        requestId: "env-white-house",
        requestVersion: 1,
        candidateId: "cand-legacy-hub",
        viewedCandidateId: "cand-legacy-hub",
        outputSha256: hashBytes(bytes),
        decision: "approve",
        contractVersion: "alive43-art-desk-v1",
        fitContractHash: "f".repeat(64),
        sceneContractHash: "s".repeat(64),
        rightsStatus: "unknown",
        sourceDeclaration: "fixture",
      },
    } as ArtbenchEvent);
    const after = store.projection();
    expect(after.candidates["cand-legacy-hub"]!.status).toBe("rejected");
    expect(after.importedReviews).toHaveLength(1);
    expect(after.integrationQueue).toEqual([]);
  });

  it("shows conflicting duplicate decisions instead of choosing one", () => {
    const bytes = tinyPng(6, 6);
    const { store } = legacyStore(bytes);
    decide(store, "cand-legacy-hub", "reject");
    decide(store, "cand-legacy-standalone", "approve");
    const projection = store.projection();
    const canonical = projection.candidates["cand-legacy-hub"]!;
    expect(canonical.duplicateDecisionConflict).toBe(true);
    expect(canonical.groupDecisions.map((d) => d.payload.decision)).toEqual([
      "reject",
      "approve",
    ]);
    expect(projection.candidates["cand-legacy-hub"]!.decisions).toHaveLength(1);
  });
});
