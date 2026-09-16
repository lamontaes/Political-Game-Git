import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetRequest } from "../../src/authoring/asset-request";
import {
  catalogRows,
  facetCounts,
  filterCatalog,
} from "../../src/authoring/artbench";
import { tinyPng } from "./art-desk-inputs.test";
import { hashBytes } from "./art-desk-inputs";
import { ArtbenchError, ArtbenchStore } from "./artbench-store";

const OWNER = { kind: "owner" as const, id: "test-owner-fixture" };
const CONTRACT = {
  fitContractHash: "f".repeat(64),
  sceneContractHash: "s".repeat(64),
  contractVersion: "alive43-art-desk-v1",
};

function request(id: string, extra: Partial<AssetRequest> = {}): AssetRequest {
  return {
    requestId: id,
    requestVersion: 1,
    priority: "P1",
    status: "queued",
    title: `Request ${id}`,
    consumer: {
      consumerId: `consumer-${id}`,
      runtimeComponent: "none",
      playerVisibleUse: "Test use.",
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
      minimumWidth: 4,
      aspectRatio: "any",
      alphaRequired: false,
      container: "either",
      styleAuthority: "fixture",
    },
    generationRecipe: ["Nothing."],
    acceptanceCriteria: ["Decodes."],
    dependsOn: [],
    ...extra,
  };
}

function workspaceWith(requests: AssetRequest[]): string {
  const workspace = mkdtempSync(join(tmpdir(), "artbench-ws-"));
  mkdirSync(join(workspace, "art/requests"), { recursive: true });
  writeFileSync(
    join(workspace, "art/requests/asset-requests.json"),
    JSON.stringify({ documentVersion: 1, generatedFrom: "test", requests }),
  );
  return workspace;
}

function makeStore(
  workspace: string,
  dataRoot = mkdtempSync(join(tmpdir(), "artbench-data-")),
) {
  let counter = 0;
  return new ArtbenchStore({
    dataRoot,
    workspace,
    driveRoot: null,
    now: () => `2026-09-16T00:00:${String(counter++).padStart(2, "0")}.000Z`,
  });
}

describe("artbench store: intake, alternatives, lineage and decisions", () => {
  const workspace = workspaceWith([request("env-a"), request("env-b")]);
  const dataRoot = mkdtempSync(join(tmpdir(), "artbench-data-"));
  const store = makeStore(workspace, dataRoot);

  it("keeps several distinct candidates on one request and dedupes identical re-imports", () => {
    const first = store.ingest(tinyPng(4, 4), { requestId: "env-a" }, OWNER);
    const second = store.ingest(tinyPng(5, 4), { requestId: "env-a" }, OWNER);
    const again = store.ingest(tinyPng(4, 4), { requestId: "env-a" }, OWNER);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(again.duplicate).toBe(true);
    expect(again.candidate.candidateId).toBe(first.candidate.candidateId);
    const projection = store.projection();
    expect(projection.requests["env-a"].candidateIds).toHaveLength(2);
    expect(projection.candidates[second.candidate.candidateId].revision).toBe(
      2,
    );
    expect(
      existsSync(join(dataRoot, "bytes", `${first.candidate.sha256}.png`)),
    ).toBe(true);
  });

  it("refuses truncated bytes, unknown requests and unknown parents", () => {
    const truncated = Buffer.from(tinyPng(4, 4).subarray(0, 30));
    expect(() =>
      store.ingest(truncated, { requestId: "env-a" }, OWNER),
    ).toThrow(ArtbenchError);
    expect(() =>
      store.ingest(tinyPng(2, 2), { requestId: "nope" }, OWNER),
    ).toThrow(/No request/);
    expect(() =>
      store.ingest(
        tinyPng(2, 2),
        { requestId: "env-a", parentCandidateId: "cand-missing" },
        OWNER,
      ),
    ).toThrow(/parent/);
  });

  it("lands an upload without a request in the visible inbox", () => {
    const result = store.ingest(tinyPng(3, 3), {}, OWNER);
    expect(result.candidate.requestId).toBe("inbox");
    expect(store.projection().requests.inbox.lane).toBe("inbox");
  });

  it("binds decisions to the viewed candidate and verified bytes; approval queues integration once", () => {
    const projection = store.projection();
    const [a, b] = projection.requests["env-a"].candidateIds;
    const candidateA = projection.candidates[a];
    expect(() =>
      store.decide({
        candidateId: a,
        viewedCandidateId: b,
        viewedSha256: candidateA.sha256,
        decision: "approve",
        actor: OWNER,
        ...CONTRACT,
      }),
    ).toThrow(/viewing/);
    expect(() =>
      store.decide({
        candidateId: a,
        viewedCandidateId: a,
        viewedSha256: "0".repeat(64),
        decision: "approve",
        actor: OWNER,
        ...CONTRACT,
      }),
    ).toThrow(/viewing/);
    expect(() =>
      store.decide({
        candidateId: a,
        viewedCandidateId: a,
        viewedSha256: candidateA.sha256,
        decision: "approve",
        actor: { kind: "agent", id: "claude" },
        ...CONTRACT,
      }),
    ).toThrow(/owner/);
    const events = store.decide({
      candidateId: a,
      viewedCandidateId: a,
      viewedSha256: candidateA.sha256,
      decision: "approve",
      actor: OWNER,
      ...CONTRACT,
    });
    expect(events.map((e) => e.type)).toEqual([
      "review.decided",
      "integration.queued",
    ]);
    const after = store.projection();
    expect(after.candidates[a].status).toBe("integration-ready");
    expect(after.integrationQueue).toHaveLength(1);
    expect(after.integrationQueue[0].tagsState).toBe("untagged");
    expect(after.requests["env-a"].lane).toBe("approved-awaiting-integration");
    // A revision request on the other alternative carries exact text.
    const revision = store.decide({
      candidateId: b,
      viewedCandidateId: b,
      viewedSha256: projection.candidates[b].sha256,
      decision: "request-revision",
      note: "Remove the parked van; keep the stoop.",
      actor: OWNER,
      ...CONTRACT,
    });
    expect(revision).toHaveLength(1);
    expect(store.projection().candidates[b].latestDecision?.payload.note).toBe(
      "Remove the parked van; keep the stoop.",
    );
  });

  it("refuses a decision once the stored bytes change under the recorded hash", () => {
    const projection = store.projection();
    const b = projection.requests["env-a"].candidateIds[1];
    const candidate = projection.candidates[b];
    const path = join(dataRoot, candidate.storagePath);
    const original = readFileSync(path);
    writeFileSync(path, Buffer.concat([original, Buffer.from([0])]));
    expect(() =>
      store.decide({
        candidateId: b,
        viewedCandidateId: b,
        viewedSha256: candidate.sha256,
        decision: "approve",
        actor: OWNER,
        ...CONTRACT,
      }),
    ).toThrow(/hash-mismatch/);
    writeFileSync(path, original);
  });

  it("carries identity, tags and notes through an edited reimport but not approval", () => {
    const projection = store.projection();
    const a = projection.requests["env-a"].candidateIds[0];
    store.setTags({
      entity: "candidate",
      entityId: a,
      tags: { region: ["southwest"], assetType: ["environment-plate"] },
      baseVersion: 0,
      author: OWNER,
    });
    const edited = store.ingest(
      tinyPng(8, 8),
      {
        requestId: "env-a",
        parentCandidateId: a,
        editKind: "upscale",
        note: "2x",
      },
      OWNER,
    );
    const c = edited.candidate;
    expect(c.assetId).toBe(projection.candidates[a].assetId);
    expect(c.parentCandidateId).toBe(a);
    expect(c.tags).toEqual({
      region: ["southwest"],
      assetType: ["environment-plate"],
    });
    expect(c.nativeDetail).toBe("derived");
    expect(c.status).toBe("awaiting-review");
    expect(c.calibrationRecheck).toContain("dimensions-changed");
    const after = store.projection();
    expect(after.candidates[a].status).toBe("integration-ready");
    expect(after.assets[c.assetId].currentApprovedCandidateId).toBe(a);
    expect(after.requests["env-a"].selectedCandidateId).toBe(c.candidateId);
    expect(store.original(a).bytes.length).toBeGreaterThan(0);
  });

  it("surfaces tag conflicts instead of last-writer-wins", () => {
    const projection = store.projection();
    const a = projection.requests["env-a"].candidateIds[0];
    expect(() =>
      store.setTags({
        entity: "candidate",
        entityId: a,
        tags: { region: ["mountain"] },
        baseVersion: 0,
        author: { kind: "owner", id: "other-fixture" },
      }),
    ).toThrow(/Tags changed/);
    expect(store.projection().candidates[a].tags.region).toEqual(["southwest"]);
  });

  it("filters combined facets, text and untagged", () => {
    const rows = catalogRows(store.projection());
    const approvedSouthwest = filterCatalog(rows, {
      status: "integration-ready",
      tags: { region: ["southwest"] },
    });
    expect(approvedSouthwest).toHaveLength(1);
    expect(filterCatalog(rows, { untagged: true }).length).toBeGreaterThan(0);
    expect(filterCatalog(rows, { text: "parked van" })).toHaveLength(1);
    expect(facetCounts(rows).tags.region.southwest).toBe(2);
  });

  it("survives a restart: every candidate, decision and tag is rebuilt from the log", () => {
    const before = store.projection();
    const reopened = new ArtbenchStore({
      dataRoot,
      workspace,
      driveRoot: null,
    });
    const after = reopened.projection();
    expect(Object.keys(after.candidates).sort()).toEqual(
      Object.keys(before.candidates).sort(),
    );
    expect(after.integrationQueue).toEqual(before.integrationQueue);
    expect(
      after.candidates[before.requests["env-a"].candidateIds[0]].tags,
    ).toEqual({
      region: ["southwest"],
      assetType: ["environment-plate"],
    });
  });

  it("creates related requests and refuses duplicates", () => {
    const projection = store.projection();
    const a = projection.requests["env-a"].candidateIds[0];
    store.createRequest({
      request: request("env-a-variant"),
      actor: OWNER,
      parentRequestId: "env-a",
      parentCandidateId: a,
      origin: "owner",
    });
    expect(store.projection().requests["env-a-variant"].parentCandidateId).toBe(
      a,
    );
    expect(() =>
      store.createRequest({
        request: request("env-a"),
        actor: OWNER,
        origin: "owner",
      }),
    ).toThrow(/already exists/);
    expect(store.brief("env-a", a)).toContain("Parent candidate");
  });
});

describe("artbench store: inbox batches and the exchange", () => {
  const workspace = workspaceWith([request("env-c")]);
  const dataRoot = mkdtempSync(join(tmpdir(), "artbench-data-"));
  const drive = mkdtempSync(join(tmpdir(), "artbench-drive-"));
  for (const folder of [
    "01_INBOX",
    "02_CATALOG",
    "03_REVIEW_AND_INTEGRATION_EVENTS",
  ]) {
    mkdirSync(join(drive, folder), { recursive: true });
  }
  const store = new ArtbenchStore({ dataRoot, workspace, driveRoot: drive });

  it("ingests a complete ten-item batch with one invalid file, retries without duplicates", () => {
    const batch = join(drive, "01_INBOX", "batch-2026-09-16-a");
    mkdirSync(batch, { recursive: true });
    const items = [];
    for (let index = 0; index < 9; index += 1) {
      writeFileSync(join(batch, `item-${index}.png`), tinyPng(4 + index, 4));
      items.push({
        itemId: `item-${index}`,
        file: `item-${index}.png`,
        requestId: "env-c",
        worker: "fixture",
      });
    }
    writeFileSync(join(batch, "broken.png"), Buffer.from("not an image"));
    items.push({ itemId: "broken", file: "broken.png", requestId: "env-c" });
    // Without a manifest the batch is pending, not ingested.
    let status = store.syncOnce();
    expect(status.pendingBatches).toContain("batch-2026-09-16-a");
    expect(Object.keys(store.projection().candidates)).toHaveLength(0);
    writeFileSync(
      join(batch, "manifest.json"),
      JSON.stringify({ batchId: "batch-2026-09-16-a", items }),
    );
    status = store.syncOnce();
    expect(status.pendingBatches).not.toContain("batch-2026-09-16-a");
    const projection = store.projection();
    expect(projection.requests["env-c"].candidateIds).toHaveLength(9);
    const completed = store
      .allEvents()
      .filter((e) => e.type === "batch.completed");
    expect(completed).toHaveLength(1);
    expect(
      completed[0].type === "batch.completed" && completed[0].payload.rejected,
    ).toHaveLength(1);
    // Retry of the same batch (e.g. re-synced folder) adds nothing.
    store.syncOnce();
    expect(store.projection().requests["env-c"].candidateIds).toHaveLength(9);
    expect(
      store.allEvents().filter((e) => e.type === "batch.completed"),
    ).toHaveLength(1);
  });

  it("exports decisions as immutable event files and a readable catalog, and admits foreign events", () => {
    const projection = store.projection();
    const candidateId = projection.requests["env-c"].candidateIds[0];
    const events = store.decide({
      candidateId,
      viewedCandidateId: candidateId,
      viewedSha256: projection.candidates[candidateId].sha256,
      decision: "request-revision",
      note: "Warmer light, please.",
      actor: OWNER,
      ...CONTRACT,
    });
    const status = store.syncOnce();
    expect(status.lastError).toBeNull();
    expect(status.status).toBe("ok");
    expect(status.pendingOutbox).toBe(0);
    const exported = join(
      drive,
      "03_REVIEW_AND_INTEGRATION_EVENTS",
      `${events[0].eventId}.json`,
    );
    expect(existsSync(exported)).toBe(true);
    expect(JSON.parse(readFileSync(exported, "utf8")).payload.note).toBe(
      "Warmer light, please.",
    );
    const catalog = readFileSync(
      join(drive, "02_CATALOG", "CATALOG.md"),
      "utf8",
    );
    expect(catalog).toContain(events[0].eventId);
    expect(catalog).toContain(projection.candidates[candidateId].sha256);
    expect(
      existsSync(
        join(
          drive,
          "02_CATALOG",
          "candidates",
          `${projection.candidates[candidateId].sha256}.png`,
        ),
      ),
    ).toBe(true);
    // A foreign integration receipt written by LAND is admitted once.
    const approve = store.decide({
      candidateId: projection.requests["env-c"].candidateIds[1],
      viewedCandidateId: projection.requests["env-c"].candidateIds[1],
      viewedSha256:
        projection.candidates[projection.requests["env-c"].candidateIds[1]]
          .sha256,
      decision: "approve",
      actor: OWNER,
      ...CONTRACT,
    });
    const item = approve.find((e) => e.type === "integration.queued");
    const receipt = {
      contractVersion: "artbench-events/v1",
      eventId: "land-receipt-0001",
      seq: 1,
      at: "2026-09-16T01:00:00.000Z",
      actor: { kind: "agent", id: "LAND" },
      source: "bench",
      origin: "store-land",
      type: "integration.received",
      payload: {
        itemId:
          item && item.type === "integration.queued"
            ? item.payload.itemId
            : "?",
        state: "accepted",
        receipt: { commit: "abc123" },
      },
    };
    writeFileSync(
      join(drive, "03_REVIEW_AND_INTEGRATION_EVENTS", "land-receipt-0001.json"),
      JSON.stringify(receipt),
    );
    store.syncOnce();
    store.syncOnce();
    expect(
      store.allEvents().filter((e) => e.eventId === "land-receipt-0001"),
    ).toHaveLength(1);
    expect(
      store.projection().integrationQueue.find((i) => i.state === "accepted"),
    ).toBeTruthy();
  });

  it("queues decisions durably while the mirror is absent and exports them later", () => {
    const offline = new ArtbenchStore({
      dataRoot: mkdtempSync(join(tmpdir(), "artbench-offline-")),
      workspace,
      driveRoot: join(drive, "missing-mirror"),
    });
    const c = offline.ingest(tinyPng(4, 4), { requestId: "env-c" }, OWNER);
    offline.decide({
      candidateId: c.candidate.candidateId,
      viewedCandidateId: c.candidate.candidateId,
      viewedSha256: c.candidate.sha256,
      decision: "approve",
      actor: OWNER,
      ...CONTRACT,
    });
    const status = offline.syncOnce();
    expect(status.status).toBe("needs-mirror");
    expect(status.pendingOutbox).toBeGreaterThan(0);
    mkdirSync(
      join(drive, "missing-mirror", "03_REVIEW_AND_INTEGRATION_EVENTS"),
      { recursive: true },
    );
    mkdirSync(join(drive, "missing-mirror", "02_CATALOG"), { recursive: true });
    const later = offline.syncOnce();
    expect(later.lastError).toBeNull();
    expect(later.status).toBe("ok");
    expect(later.pendingOutbox).toBe(0);
    expect(
      readdirSync(
        join(drive, "missing-mirror", "03_REVIEW_AND_INTEGRATION_EVENTS"),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("ignores symlinked inbox entries and files outside the batch folder", () => {
    const batch = join(drive, "01_INBOX", "batch-links");
    mkdirSync(batch, { recursive: true });
    const outside = join(drive, "outside.png");
    writeFileSync(outside, tinyPng(2, 2));
    symlinkSync(outside, join(batch, "link.png"));
    writeFileSync(
      join(batch, "manifest.json"),
      JSON.stringify({
        items: [
          { itemId: "link", file: "link.png", requestId: "env-c" },
          { itemId: "esc", file: "../outside.png", requestId: "env-c" },
        ],
      }),
    );
    const before = Object.keys(store.projection().candidates).length;
    store.syncOnce();
    expect(Object.keys(store.projection().candidates).length).toBe(before);
    expect(hashBytes("x")).toHaveLength(64);
  });
});
