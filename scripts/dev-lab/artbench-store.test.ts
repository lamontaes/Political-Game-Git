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
import { candidateNotes } from "../../src/authoring/art-desk-cards";
import { tinyPng } from "./art-desk-inputs.test";
import { hashBytes } from "./art-desk-inputs";
import { ArtbenchError, ArtbenchStore } from "./artbench-store";

const OWNER = { kind: "owner" as const, id: "test-owner-fixture" };
const CONTRACT = {
  fitContractHash: "f".repeat(64),
  sceneContractHash: "s".repeat(64),
  contractVersion: "alive43-art-desk-v1",
  authority: "session-capability" as const,
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
    ownerId: OWNER.id,
    driveRoot: null,
    now: () => `2026-09-16T00:00:${String(counter++).padStart(2, "0")}.000Z`,
  });
}

it("keeps questions and attributed replies across restart without changing decisions", () => {
  const workspace = workspaceWith([request("discussion")]);
  const store = makeStore(workspace);
  const candidate = store.ingest(
    tinyPng(8, 4),
    { requestId: "discussion" },
    OWNER,
  ).candidate;
  const payload = {
    requestId: "discussion",
    candidateId: candidate.candidateId,
    kind: "question" as const,
    text: "Is this finished artwork or a request?",
  };
  expect(() => store.postMessage(payload, OWNER)).toThrow(/Art Desk/);
  const question = store.postMessage(payload, OWNER, "session-capability");
  const actor = { kind: "agent" as const, id: "art-team" };
  const reply = {
    ...payload,
    kind: "reply" as const,
    replyTo: question.eventId,
    text: "This is artwork ready for review.",
  };
  expect(() =>
    store.postMessage({ ...reply, replyTo: "missing" }, actor),
  ).toThrow(/Replies/);
  store.postMessage(reply, actor);
  const recovered = makeStore(workspace, store.dataRoot).projection();
  expect(recovered.messages?.map((message) => message.payload.text)).toEqual([
    payload.text,
    reply.text,
  ]);
  expect(recovered.candidates[candidate.candidateId].decisions).toHaveLength(0);
  expect(recovered.candidates[candidate.candidateId].status).toBe(
    "awaiting-review",
  );
});

it("a running store sees external appended events before projection and conflict checks", () => {
  const workspace = workspaceWith([request("fresh-state")]);
  const first = makeStore(workspace);
  const second = makeStore(workspace, first.dataRoot);
  const c = first.ingest(
    tinyPng(7, 4),
    { requestId: "fresh-state" },
    OWNER,
  ).candidate;
  expect(second.projection().candidates[c.candidateId].sha256).toBe(c.sha256);
  first.setTags({
    entity: "candidate",
    entityId: c.candidateId,
    tags: { upscaleMinimum: ["1920x1080"] },
    baseVersion: 0,
    author: OWNER,
  });
  expect(() =>
    second.setTags({
      entity: "candidate",
      entityId: c.candidateId,
      tags: { reviewQueue: ["archived"] },
      baseVersion: 0,
      author: OWNER,
    }),
  ).toThrow(/Tags changed/);
  expect(
    second.projection().candidates[c.candidateId].tags.upscaleMinimum,
  ).toEqual(["1920x1080"]);
  second.setTags({
    entity: "candidate",
    entityId: c.candidateId,
    tags: { reviewQueue: [`${c.candidateId}:reference`] },
    baseVersion: 1,
    author: OWNER,
  });
  expect(first.projection().candidates[c.candidateId].tagsVersion).toBe(2);
  const sequences = first.allEvents().map((event) => event.seq);
  expect(new Set(sequences).size).toBe(sequences.length);
});

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

  it("shows rejection after installation while retaining the installed receipt", () => {
    const store = makeStore(workspaceWith([request("env-a")]));
    const { candidate } = store.ingest(
      tinyPng(7, 4),
      { requestId: "env-a" },
      OWNER,
    );
    const decision = {
      candidateId: candidate.candidateId,
      viewedCandidateId: candidate.candidateId,
      viewedSha256: candidate.sha256,
      actor: OWNER,
      ...CONTRACT,
    };
    store.decide({ ...decision, decision: "approve" });
    const item = store.projection().integrationQueue[0]!;
    store.recordIntegration(
      {
        itemId: item.itemId,
        state: "installed",
        receipt: { build: "private-test" },
      },
      { kind: "agent", id: "integrator" },
    );
    expect(store.projection().candidates[candidate.candidateId].status).toBe(
      "installed",
    );
    store.decide({ ...decision, decision: "reject" });
    const after = store.projection();
    expect(after.candidates[candidate.candidateId].status).toBe("rejected");
    expect(after.integrationQueue[0]!.receipts).toHaveLength(1);
    expect(after.assets[candidate.assetId].activeRuntimeCandidateId).toBe(
      candidate.candidateId,
    );
    expect(
      after.assets[candidate.assetId].currentApprovedCandidateId,
    ).toBeUndefined();
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

  it("keeps child role overrides and parent facets with attributed history", () => {
    const local = makeStore(workspaceWith([request("parts")]));
    const actor = { kind: "worker" as const, id: "prepared-parts" };
    const parent = local.ingest(
      tinyPng(4, 4),
      {
        requestId: "parts",
        tags: { body: ["fuller"], assetType: ["person"], outfit: ["shirt"] },
      },
      actor,
    ).candidate;
    const child = local.ingest(
      tinyPng(5, 5),
      {
        parentCandidateId: parent.candidateId,
        tags: { assetType: ["material-map"], outfit: [] },
      },
      actor,
    ).candidate;
    expect(child.tags).toEqual({
      body: ["fuller"],
      assetType: ["material-map"],
    });
    expect(child.tags.outfit).toBeUndefined();
    expect(candidateNotes(local.projection(), child).inheritedTags).toEqual(
      parent.tags,
    );
    expect(local.projection().candidates[parent.candidateId].tags).toEqual(
      parent.tags,
    );
    expect(child.status).toBe("awaiting-review");
    const events = readFileSync(
      join(local.dataRoot, "events/events.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.at(-1)).toMatchObject({
      type: "tags.set",
      actor,
      payload: { entityId: child.candidateId },
    });
  });

  it("shows an edited reimport with the parent's note and tags beside its own", () => {
    const original = store.ingest(
      tinyPng(6, 6),
      { requestId: "env-b", note: "Native plate from the approved master." },
      OWNER,
    );
    store.setTags({
      entity: "candidate",
      entityId: original.candidate.candidateId,
      tags: { region: ["alaska"], season: ["winter"] },
      baseVersion: 0,
      author: OWNER,
    });
    const edited = store.ingest(
      tinyPng(7, 6),
      {
        requestId: "env-b",
        parentCandidateId: original.candidate.candidateId,
        editKind: "crop",
        note: "Cropped to 16:9 outside the bench.",
      },
      OWNER,
    );
    const projection = store.projection();
    const notes = candidateNotes(projection, edited.candidate);
    expect(notes.own).toBe("Cropped to 16:9 outside the bench.");
    expect(notes.inherited).toEqual([
      {
        candidateId: original.candidate.candidateId,
        stage: "original",
        note: "Native plate from the approved master.",
      },
    ]);
    expect(notes.inheritedTags).toEqual({
      region: ["alaska"],
      season: ["winter"],
    });
    // New bytes and its own review state, on the same asset.
    expect(edited.candidate.sha256).not.toBe(original.candidate.sha256);
    expect(edited.candidate.status).toBe("awaiting-review");
    expect(edited.candidate.assetId).toBe(original.candidate.assetId);
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
      ownerId: OWNER.id,
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

  it("refuses decisions without proven capability, fixture identities on production requests, and self-declared owners", () => {
    const projection = store.projection();
    const b = projection.requests["env-a"].candidateIds[1];
    const base = {
      candidateId: b,
      viewedCandidateId: b,
      viewedSha256: projection.candidates[b].sha256,
      decision: "reject" as const,
    };
    expect(() =>
      store.decide({ ...base, ...CONTRACT, actor: OWNER, authority: null }),
    ).toThrow(/capability/);
    expect(() =>
      store.decide({
        ...base,
        ...CONTRACT,
        actor: { kind: "owner", id: "hub-qa-fixture" },
      }),
    ).toThrow(/QA requests only/);
    expect(() =>
      store.decide({
        ...base,
        ...CONTRACT,
        actor: { kind: "worker", id: "producer" },
      }),
    ).toThrow(/owner/);
  });

  it("records QA approvals as QA and never queues them for integration", () => {
    store.createRequest({
      request: request("qa-disposable"),
      actor: OWNER,
      origin: "owner",
      qa: true,
    });
    const c = store.ingest(
      tinyPng(6, 6),
      { requestId: "qa-disposable" },
      OWNER,
    );
    const events = store.decide({
      candidateId: c.candidate.candidateId,
      viewedCandidateId: c.candidate.candidateId,
      viewedSha256: c.candidate.sha256,
      decision: "approve",
      actor: { kind: "owner", id: "hub-qa-fixture" },
      ...CONTRACT,
    });
    expect(events.map((e) => e.type)).toEqual(["review.decided"]);
    expect(events[0].type === "review.decided" && events[0].payload.qa).toBe(
      true,
    );
    const after = store.projection();
    expect(after.requests["qa-disposable"].qa).toBe(true);
    expect(after.candidates[c.candidate.candidateId].qa).toBe(true);
    expect(after.candidates[c.candidate.candidateId].status).toBe("approved");
    expect(
      after.integrationQueue.some(
        (i) => i.candidateId === c.candidate.candidateId,
      ),
    ).toBe(false);
  });

  it("returns an existing integration item by QA disposition and exposes current tags to receiving", () => {
    const before = store.projection();
    const item = before.integrationQueue[0];
    expect(item.tagsState).toBe("untagged");
    expect(item.currentTags.region).toEqual(["southwest"]);
    store.dispositionQa(
      {
        itemId: item.itemId,
        requestId: "env-a",
        reason: "bench proof, not production cargo",
      },
      { kind: "system", id: "artbench-qa-disposition" },
      "session-capability",
    );
    const after = store.projection();
    const returned = after.integrationQueue.find(
      (i) => i.itemId === item.itemId,
    )!;
    expect(returned.state).toBe("returned");
    expect(returned.qa).toBe(true);
    expect(after.requests["env-a"].qa).toBe(true);
    expect(after.candidates[item.candidateId].decisions).toHaveLength(1);
    expect(() =>
      store.dispositionQa({ itemId: item.itemId, reason: "x" }, OWNER, null),
    ).toThrow(/capability/);
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
  const store = new ArtbenchStore({
    dataRoot,
    workspace,
    driveRoot: drive,
    ownerId: OWNER.id,
  });

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

  it("defers an item whose file has not arrived yet, and says nothing about the batch until it has", () => {
    // The sender's contract is manifest.json last. A sender that writes it
    // first announces a batch whose payload is still uploading, and this is
    // the case that used to be eaten: the missing file took a permanent
    // "rejected" marker, the next pass skipped it for having one, and the
    // batch reported completed with nothing in it.
    const batch = join(drive, "01_INBOX", "batch-2026-09-22-late-upload");
    mkdirSync(batch, { recursive: true });
    const items = [
      { itemId: "early", file: "early.png", requestId: "env-c" },
      { itemId: "late", file: "late.png", requestId: "env-c" },
    ];
    writeFileSync(join(batch, "early.png"), tinyPng(21, 4));
    writeFileSync(
      join(batch, "manifest.json"),
      JSON.stringify({ batchId: "batch-2026-09-22-late-upload", items }),
    );

    const before = store
      .allEvents()
      .filter((e) => e.type === "batch.completed").length;
    store.syncOnce();
    // The one file that is here is taken, and the batch stays quiet.
    expect(
      store.allEvents().filter((e) => e.type === "batch.completed"),
    ).toHaveLength(before);

    // The upload finishes.
    writeFileSync(join(batch, "late.png"), tinyPng(22, 4));
    store.syncOnce();
    const completed = store
      .allEvents()
      .filter((e) => e.type === "batch.completed");
    expect(completed).toHaveLength(before + 1);
    const last = completed[completed.length - 1];
    expect(
      last.type === "batch.completed" && last.payload.ingestedCandidateIds,
    ).toHaveLength(2);
    expect(
      last.type === "batch.completed" && last.payload.rejected,
    ).toHaveLength(0);

    // And it is not re-announced once it is done.
    store.syncOnce();
    expect(
      store.allEvents().filter((e) => e.type === "batch.completed"),
    ).toHaveLength(before + 1);
  });

  it("keeps rejecting a file that is present and is not an image", () => {
    // The other half of the split: this one never becomes true on its own,
    // so it keeps its permanent marker and is not retried for ever.
    const batch = join(drive, "01_INBOX", "batch-2026-09-22-not-an-image");
    mkdirSync(batch, { recursive: true });
    writeFileSync(join(batch, "note.txt"), "not an image");
    writeFileSync(
      join(batch, "manifest.json"),
      JSON.stringify({
        batchId: "batch-2026-09-22-not-an-image",
        items: [{ itemId: "note", file: "note.txt", requestId: "env-c" }],
      }),
    );
    const before = store
      .allEvents()
      .filter((e) => e.type === "batch.completed").length;
    store.syncOnce();
    const completed = store
      .allEvents()
      .filter((e) => e.type === "batch.completed");
    expect(completed).toHaveLength(before + 1);
    const last = completed[completed.length - 1];
    expect(
      last.type === "batch.completed" && last.payload.rejected,
    ).toHaveLength(1);
    store.syncOnce();
    expect(
      store.allEvents().filter((e) => e.type === "batch.completed"),
    ).toHaveLength(before + 1);
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

  it("quarantines an imported owner review as evidence instead of applying it", () => {
    const projection = store.projection();
    const candidateId = projection.requests["env-c"].candidateIds[2];
    const candidate = projection.candidates[candidateId];
    const decisionsBefore = candidate.decisions.length;
    writeFileSync(
      join(drive, "03_REVIEW_AND_INTEGRATION_EVENTS", "foreign-review.json"),
      JSON.stringify({
        contractVersion: "artbench-events/v1",
        eventId: "foreign-review-1",
        seq: 9,
        at: "2026-09-16T03:00:00.000Z",
        actor: { kind: "owner", id: OWNER.id },
        source: "bench",
        origin: "store-somewhere-else",
        type: "review.decided",
        payload: {
          reviewId: "rev-foreign",
          requestId: "env-c",
          requestVersion: 1,
          candidateId,
          viewedCandidateId: candidateId,
          outputSha256: candidate.sha256,
          decision: "approve",
          contractVersion: "alive43-art-desk-v1",
          fitContractHash: "f".repeat(64),
          sceneContractHash: "s".repeat(64),
          rightsStatus: "unknown",
          sourceDeclaration: "forged",
        },
      }),
    );
    store.syncOnce();
    store.syncOnce();
    const after = store.projection();
    expect(after.candidates[candidateId].decisions).toHaveLength(
      decisionsBefore,
    );
    expect(after.candidates[candidateId].status).not.toBe("integration-ready");
    expect(after.importedReviews.map((r) => r.imported.reviewId)).toEqual([
      "rev-foreign",
    ]);
    expect(
      store
        .allEvents()
        .filter((e) => e.eventId === "imported:foreign-review-1"),
    ).toHaveLength(1);
  });

  it("does not let another bench's integration.queued enter this queue", () => {
    const before = store.projection().integrationQueue.length;
    writeFileSync(
      join(drive, "03_REVIEW_AND_INTEGRATION_EVENTS", "foreign-queue.json"),
      JSON.stringify({
        contractVersion: "artbench-events/v1",
        eventId: "foreign-queue-1",
        seq: 11,
        at: "2026-09-16T04:00:00.000Z",
        actor: { kind: "system", id: "artbench" },
        source: "bench",
        origin: "store-somewhere-else",
        type: "integration.queued",
        payload: {
          itemId: "int-foreign",
          candidateId: store.projection().requests["env-c"].candidateIds[0],
          assetId: "asset:env-c",
          requestId: "env-c",
          sha256: "d".repeat(64),
          consumerId: "c",
          runtimeComponent: "none",
          target: request("env-c").target,
          tagsState: "untagged",
          missingFacts: [],
          approvalReviewId: "rev-foreign",
        },
      }),
    );
    store.syncOnce();
    expect(store.projection().integrationQueue.length).toBe(before);
    expect(store.allEvents().some((e) => e.eventId === "foreign-queue-1")).toBe(
      false,
    );
  });

  it("admits foreign events in authoring order even when filenames sort otherwise", () => {
    const eventsDir = join(drive, "03_REVIEW_AND_INTEGRATION_EVENTS");
    const base = {
      contractVersion: "artbench-events/v1",
      actor: { kind: "owner", id: "hub-qa-fixture" },
      source: "bench",
      origin: "store-hub",
    };
    const req = request("qa-foreign-order");
    // "zzz" (request.created, earlier) sorts after "aaa" (candidate, later).
    writeFileSync(
      join(eventsDir, "zzz-request.json"),
      JSON.stringify({
        ...base,
        eventId: "foreign-req-1",
        seq: 1,
        at: "2026-09-16T02:00:00.000Z",
        type: "request.created",
        payload: {
          request: req,
          assetId: "asset:qa-foreign-order",
          origin: "owner",
        },
      }),
    );
    writeFileSync(
      join(eventsDir, "aaa-candidate.json"),
      JSON.stringify({
        ...base,
        eventId: "foreign-cand-1",
        seq: 2,
        at: "2026-09-16T02:00:01.000Z",
        type: "candidate.ingested",
        payload: {
          candidateId: "cand-foreign-1",
          assetId: "asset:qa-foreign-order",
          requestId: "qa-foreign-order",
          requestVersion: 1,
          sha256: "c".repeat(64),
          byteLength: 1,
          container: "png",
          width: 1,
          height: 1,
          hasAlpha: false,
          storagePath: "bytes/none.png",
          editKind: "original",
          provenance: {},
          nativeDetail: "unverified",
          calibrationRecheck: [],
        },
      }),
    );
    store.syncOnce();
    const projection = store.projection();
    expect(projection.requests["qa-foreign-order"]?.candidateIds).toEqual([
      "cand-foreign-1",
    ]);
    expect(projection.rejectedEvents.map((r) => r.eventId)).not.toContain(
      "foreign-cand-1",
    );
  });

  it("queues decisions durably while the mirror is absent and exports them later", () => {
    const offline = new ArtbenchStore({
      dataRoot: mkdtempSync(join(tmpdir(), "artbench-offline-")),
      workspace,
      ownerId: OWNER.id,
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

it("revises a request append-only with optimistic version checks and retained candidates", () => {
  const workspace = workspaceWith([]);
  const store = makeStore(workspace);
  const actor = { kind: "agent" as const, id: "request-author" };
  const original = request("room-reference");
  store.createRequest({ request: original, actor, origin: "worker" });
  const candidate = store.ingest(
    tinyPng(8, 4),
    { requestId: original.requestId },
    actor,
  ).candidate;
  const prefix = store.allEvents();
  const updated = {
    ...original,
    requestVersion: 2,
    title: "Clearer room",
    generatorParameters: { fireflyPrompt: "Keep the room geometry." },
  };
  store.reviseRequest({ request: updated, baseVersion: 1, actor });
  expect(() =>
    store.reviseRequest({ request: updated, baseVersion: 1, actor }),
  ).toThrow(/Reload/);
  expect(store.allEvents().slice(0, prefix.length)).toEqual(prefix);
  const reopened = makeStore(workspace, store.dataRoot);
  const row = reopened.projection().requests[original.requestId]!;
  expect(row.request).toEqual(updated);
  expect(row.candidateIds).toEqual([candidate.candidateId]);
  expect(
    reopened.projection().candidates[candidate.candidateId]!.requestVersion,
  ).toBe(1);
});

it("persists per-reply notification reads across stores without changing art history", () => {
  const workspace = workspaceWith([request("notifications")]);
  const store = makeStore(workspace);
  const question = store.postMessage(
    { requestId: "notifications", kind: "question", text: "Is this ready?" },
    OWNER,
    "session-capability",
  );
  const actor = { kind: "agent" as const, id: "art-team" };
  const first = store.postMessage(
    {
      requestId: "notifications",
      kind: "reply",
      text: "First answer",
      replyTo: question.eventId,
    },
    actor,
  );
  const second = store.postMessage(
    {
      requestId: "notifications",
      kind: "reply",
      text: "Second answer",
      replyTo: question.eventId,
    },
    actor,
  );
  const history = readFileSync(join(store.dataRoot, "events/events.jsonl"));
  expect(() => store.markNotificationsRead([first.eventId], null)).toThrow(
    /Art Desk/,
  );
  expect(() =>
    store.markNotificationsRead(["future-event"], "session-capability"),
  ).toThrow(/no longer available/);
  expect(() =>
    store.markNotificationsRead([question.eventId], "session-capability"),
  ).toThrow(/no longer available/);
  expect(store.notificationReadEventIds()).toEqual([]);
  store.markNotificationsRead([first.eventId], "session-capability");
  const reopened = makeStore(workspace, store.dataRoot);
  expect(reopened.notificationReadEventIds()).toEqual([first.eventId]);
  reopened.markNotificationsRead([second.eventId], "session-capability");
  store.markNotificationsRead([first.eventId], "session-capability");
  expect(store.notificationReadEventIds()).toEqual([
    first.eventId,
    second.eventId,
  ]);
  expect(readFileSync(join(store.dataRoot, "events/events.jsonl"))).toEqual(
    history,
  );
  expect(
    existsSync(join(store.dataRoot, "preferences/notifications.json")),
  ).toBe(true);
});

it("allocates stable request codes once and preserves them through revisions and restart", () => {
  const workspace = workspaceWith([
    request("background", {
      generatorParameters: { fireflyPrompt: "Paint the coast." },
    }),
  ]);
  const store = makeStore(workspace);
  const row = store.projection().requests.background!;
  const code = store.projection().assets[row.assetId]!.tags.requestCode;
  expect(code).toEqual(["background:A01"]);
  const events = store.allEvents();
  store.ensureRequestCodes();
  expect(store.allEvents()).toEqual(events);
  store.reviseRequest({
    request: { ...row.request, requestVersion: 2 },
    baseVersion: 1,
    actor: { kind: "worker", id: "art-team" },
  });
  const asset = store.projection().assets[row.assetId]!;
  store.setTags({
    entity: "asset",
    entityId: row.assetId,
    tags: { category: ["coast"] },
    baseVersion: asset.tagsVersion,
    author: { kind: "worker", id: "art-team" },
  });
  const reopened = makeStore(workspace, store.dataRoot);
  expect(reopened.projection().assets[row.assetId]!.tags.requestCode).toEqual(
    code,
  );
  expect(reopened.allEvents().slice(0, events.length)).toEqual(events);
});
