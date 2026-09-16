import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

import { expect, test, type Page } from "./fixtures";

/**
 * Combined owner journey on an isolated data root (PG_ARTBENCH_DATA_ROOT is
 * set by scripts/dev-lab/verify-server.ts's webServer command through the
 * environment the runner inherits; see playwright.config.ts). Nothing here
 * touches production approvals: the request is a disposable QA request in the
 * private sidecar and the actor is a named fixture.
 */

const require = createRequire(import.meta.url);
const BENCH = "/__dev/artbench";
const QA_SIDECAR = "art/generated/candidates/art-desk/qa-requests.json";
const QA_REQUEST_ID = "qa-artbench-journey";
const ACTOR = { kind: "owner", id: "e2e-fixture-owner" };

function fileUrl(path: string): string {
  return `/__dev/art-desk/file?path=${encodeURIComponent(path)}`;
}

function qaRequest() {
  return {
    requestId: QA_REQUEST_ID,
    requestVersion: 1,
    priority: "P2",
    status: "queued",
    title: "QA journey: a needed plate through the whole bench",
    consumer: {
      consumerId: "qa-bench-journey",
      runtimeComponent: "none",
      playerVisibleUse: "Bench proof only; never shown to a player.",
    },
    whyNeeded: "Proves the complete owner journey.",
    inventoryCheck: {
      repositoryPathsSearched: ["art/families/"],
      driveLocationsSearched: ["none"],
      found: "Existing tracked rasters are reused as candidates.",
      shortfall: "None; disposable QA request.",
    },
    target: {
      targetClass: "environment-plate",
      minimumWidth: 8,
      aspectRatio: "any",
      alphaRequired: false,
      container: "either",
      styleAuthority: "not applicable — QA fixture",
    },
    generationRecipe: ["Do not generate."],
    acceptanceCriteria: ["Survives restart; preview decodes after reimport."],
    dependsOn: [],
  };
}

/** Distinct small PNGs so a ten-item batch has ten different hashes. */
function png(width: number, height: number, alpha = false): Buffer {
  const { PNG } = require("pngjs") as {
    PNG: new (o: { width: number; height: number }) => { data: Buffer };
  } & { PNG: { sync: { write(p: unknown): Buffer } } };
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = (i * 7 + width) % 256;
    image.data[i + 1] = (i * 3 + height) % 256;
    image.data[i + 2] = 90;
    image.data[i + 3] = alpha && i % 8 === 0 ? 0 : 255;
  }
  return Buffer.from(
    (PNG as unknown as { sync: { write(p: unknown): Buffer } }).sync.write(
      image,
    ),
  );
}

async function benchState(page: Page) {
  return page.evaluate(async (bench) => {
    const r = await fetch(`${bench}/state`, { cache: "no-store" });
    return (await r.json()) as {
      projection: {
        requests: Record<
          string,
          { candidateIds: string[]; lane: string; selectedCandidateId?: string }
        >;
        candidates: Record<
          string,
          {
            candidateId: string;
            sha256: string;
            width: number;
            height: number;
            hasAlpha: boolean;
            status: string;
            tags: Record<string, string[]>;
            tagsVersion: number;
            parentCandidateId?: string;
            editKind: string;
            revision: number;
            calibrationRecheck: string[];
            decisions: {
              eventId: string;
              payload: { decision: string; note?: string; reviewId: string };
            }[];
          }
        >;
        integrationQueue: {
          itemId: string;
          candidateId: string;
          state: string;
          tagsState: string;
        }[];
      };
      sync: {
        status: string;
        driveRootPresent: boolean;
        pendingOutbox: number;
        lastSuccessAt: string | null;
      };
      bytes: Record<string, { state: string }>;
    };
  }, BENCH);
}

test("the owner journey: brief → batch → restart → filter → approve → tags → revision → download → edit → reimport → approve → integration", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const origin = baseURL ?? "http://127.0.0.1";
  const json = { "Content-Type": "application/json", Origin: origin };
  const priorQa = await request.get(fileUrl(QA_SIDECAR));
  const priorQaBody = priorQa.ok() ? await priorQa.text() : null;
  const putQa = async (body: string) => {
    const now = await request.get(fileUrl(QA_SIDECAR));
    const headers = now.ok()
      ? { ...json, "If-Match": now.headers()["x-art-desk-revision"] }
      : json;
    return request.put(fileUrl(QA_SIDECAR), { headers, data: body });
  };
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
  expect(session.ownerId).toBe(ACTOR.id);
  const auth = { ...json, "X-OCD-Owner-Capability": session.capability };
  const created = await request.post(`${BENCH}/events`, {
    headers: auth,
    data: JSON.stringify({
      type: "request.created",
      actor: ACTOR,
      payload: { request: qaRequest(), qa: false },
    }),
  });
  expect(created.status()).toBe(201);

  const inbox = join(
    process.env.PG_ARTBENCH_DATA_ROOT ?? join(tmpdir(), "artbench-e2e-missing"),
    "inbox",
  );
  try {
    await page.goto("/art-desk.html");
    await expect(page.getByTestId("art-desk-inputs")).toBeVisible();
    await expect(page.getByTestId("art-desk-sync")).toBeVisible();

    // 1. A needed request with no candidates, its brief copyable/downloadable.
    await page.getByTestId("art-desk-lane-awaiting-capable-worker").click();
    const row = page.getByTestId(`art-desk-row-${QA_REQUEST_ID}`);
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByTestId("art-desk-awaiting-worker")).toBeVisible();
    const brief = await request.get(
      `${BENCH}/brief?requestId=${QA_REQUEST_ID}`,
    );
    expect(brief.ok()).toBeTruthy();
    const briefText = await brief.text();
    expect(briefText).toContain(`requestId: ${QA_REQUEST_ID}`);
    expect(briefText).toContain("manifest.json written LAST");
    await expect(page.getByTestId("art-desk-download-brief")).toHaveAttribute(
      "href",
      /download=1/,
    );

    // 2. A ten-item batch lands in the local inbox: nine valid, one invalid,
    //    manifest written last. Two items are alternatives on the same request.
    const batchId = `batch-e2e-${Date.now()}`;
    const folder = join(inbox, batchId);
    mkdirSync(folder, { recursive: true });
    const items = [];
    for (let i = 0; i < 9; i += 1) {
      writeFileSync(join(folder, `alt-${i}.png`), png(16 + i, 12));
      items.push({
        itemId: `alt-${i}`,
        file: `alt-${i}.png`,
        requestId: QA_REQUEST_ID,
        worker: "e2e-producer",
        provider: "fixture",
        model: "none",
      });
    }
    writeFileSync(join(folder, "bad.png"), Buffer.from("not a png"));
    items.push({ itemId: "bad", file: "bad.png", requestId: QA_REQUEST_ID });
    // Partial: no manifest yet → pending, nothing ingested.
    let sync = await (
      await request.post(`${BENCH}/sync`, { headers: json })
    ).json();
    expect(sync.pendingBatches).toContain(batchId);
    writeFileSync(
      join(folder, "manifest.json"),
      JSON.stringify({ batchId, items }),
    );
    sync = await (
      await request.post(`${BENCH}/sync`, { headers: json })
    ).json();
    expect(sync.pendingBatches).not.toContain(batchId);
    let state = await benchState(page);
    expect(state.projection.requests[QA_REQUEST_ID].candidateIds).toHaveLength(
      9,
    );
    // Duplicate batch retry (same folder synced twice) adds nothing.
    await request.post(`${BENCH}/sync`, { headers: json });
    state = await benchState(page);
    expect(state.projection.requests[QA_REQUEST_ID].candidateIds).toHaveLength(
      9,
    );

    // 3. Restart the page: all nine distinct candidates and their history survive.
    await page.reload();
    await expect(page.getByTestId("art-desk-inputs")).toBeVisible();
    await page.getByTestId("art-desk-lane-needs-review").click();
    await page.getByTestId(`art-desk-row-${QA_REQUEST_ID}`).click();
    await expect(
      page.getByTestId("art-desk-alternatives").locator("li"),
    ).toHaveCount(9);

    // 4. Approve one with blank tags; it becomes integration-ready once.
    const ids = state.projection.requests[QA_REQUEST_ID].candidateIds;
    const first = state.projection.candidates[ids[0]];
    await page.getByTestId(`art-desk-candidate-${first.candidateId}`).click();
    await expect(page.getByTestId("art-desk-viewed")).toHaveAttribute(
      "data-candidate-id",
      first.candidateId,
    );
    await expect(page.getByTestId("art-desk-candidate-preview")).toBeVisible();
    await page
      .getByTestId("art-desk-detail")
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await expect(page.getByTestId("art-desk-status")).toContainText(
      "approve recorded",
    );
    await expect(page.getByTestId("art-desk-decision-approve")).toBeVisible();
    state = await benchState(page);
    expect(state.projection.candidates[first.candidateId].status).toBe(
      "integration-ready",
    );
    expect(
      state.projection.integrationQueue.filter(
        (i) => i.candidateId === first.candidateId,
      ),
    ).toHaveLength(1);
    expect(state.projection.integrationQueue[0].tagsState).toBe("untagged");
    const approvalEvent =
      state.projection.candidates[first.candidateId].decisions[0].eventId;

    // 5. Add tags after approval; the integration item stays; filters find it.
    await page.getByTestId("art-desk-tag-region").fill("southwest");
    await page.getByTestId("art-desk-tag-assetType").fill("environment-plate");
    await page.getByTestId("art-desk-tags-save").click();
    await expect(page.getByTestId("art-desk-status")).toContainText(
      "Tags saved",
    );
    state = await benchState(page);
    expect(state.projection.candidates[first.candidateId].tags.region).toEqual([
      "southwest",
    ]);
    await page
      .getByTestId("art-desk-lane-approved-awaiting-integration")
      .click();
    await expect(page.getByTestId("art-desk-integration-queue")).toContainText(
      first.sha256.slice(0, 12),
    );
    await page.getByRole("button", { name: /^southwest \(/ }).click();
    await expect(
      page.getByTestId(`art-desk-row-${QA_REQUEST_ID}`),
    ).toBeVisible();
    await page.getByRole("button", { name: /Clear tag filter/ }).click();

    // 6. Request a revision on another alternative with exact text.
    await page.getByTestId("art-desk-lane-needs-review").click();
    await page.getByTestId(`art-desk-row-${QA_REQUEST_ID}`).click();
    const second = state.projection.candidates[ids[1]];
    await page.getByTestId(`art-desk-candidate-${second.candidateId}`).click();
    await page
      .getByTestId("art-desk-detail")
      .getByRole("button", { name: "Request revision", exact: true })
      .click();
    const instructions = "Remove the parked van and keep the stoop railing.";
    await page.getByTestId("art-desk-revision-text").fill(instructions);
    await page.getByTestId("art-desk-revision-send").click();
    await expect(page.getByTestId("art-desk-status")).toContainText(
      "request-revision recorded",
    );
    state = await benchState(page);
    const revisionDecision =
      state.projection.candidates[second.candidateId].decisions[0];
    expect(revisionDecision.payload.note).toBe(instructions);

    // 7. Both decisions are exported as immutable event files (Drive mirror or
    //    the outbox when no mirror exists) and appear in the catalog projection.
    sync = await (
      await request.post(`${BENCH}/sync`, { headers: json })
    ).json();
    const dataRoot = process.env.PG_ARTBENCH_DATA_ROOT;
    expect(dataRoot).toBeTruthy();
    const catalogDir = sync.driveRootPresent ? null : join(dataRoot!, "cache");
    if (catalogDir) {
      const catalog = readFileSync(join(catalogDir, "CATALOG.md"), "utf8");
      expect(catalog).toContain(approvalEvent);
      expect(catalog).toContain(revisionDecision.eventId);
      expect(catalog).toContain(instructions);
      expect(sync.pendingOutbox).toBeGreaterThan(0); // queued durably, honestly unsynced
    } else {
      expect(sync.pendingOutbox).toBe(0);
    }

    // 8. Download the approved original: exact bytes, full size.
    await page.getByTestId(`art-desk-candidate-${first.candidateId}`).click();
    const originalResponse = await request.get(
      `${BENCH}/original?candidateId=${first.candidateId}&download=1`,
    );
    expect(originalResponse.ok()).toBeTruthy();
    expect(originalResponse.headers()["content-disposition"]).toContain(
      "attachment",
    );
    const originalBytes = Buffer.from(await originalResponse.body());
    const { createHash } = await import("node:crypto");
    expect(createHash("sha256").update(originalBytes).digest("hex")).toBe(
      first.sha256,
    );

    // 9. External edits: a larger upscale and a transparent background removal,
    //    reimported on the same card. Identity/tags/notes carry; approval does not.
    const larger = png(first.width * 2, first.height * 2);
    const transparent = png(first.width, first.height, true);
    const upscalePath = join(tmpdir(), `e2e-upscale-${Date.now()}.png`);
    const alphaPath = join(tmpdir(), `e2e-alpha-${Date.now()}.png`);
    writeFileSync(upscalePath, larger);
    writeFileSync(alphaPath, transparent);
    await page.getByTestId("art-desk-edit-kind").selectOption("upscale");
    await page.getByTestId("art-desk-edit-note").fill("2x external upscale");
    await page.getByTestId("art-desk-upload-edited").setInputFiles(upscalePath);
    await expect(page.getByTestId("art-desk-status")).toContainText(
      "stored as",
    );
    state = await benchState(page);
    const upscaled = Object.values(state.projection.candidates).find(
      (c) =>
        c.parentCandidateId === first.candidateId && c.editKind === "upscale",
    );
    expect(upscaled).toBeTruthy();
    expect(upscaled!.width).toBe(first.width * 2);
    expect(upscaled!.tags.region).toEqual(["southwest"]);
    expect(upscaled!.status).toBe("awaiting-review");
    expect(upscaled!.calibrationRecheck).toContain("dimensions-changed");
    expect(state.projection.candidates[first.candidateId].status).toBe(
      "integration-ready",
    );
    await expect(page.getByTestId("art-desk-viewed")).toHaveAttribute(
      "data-candidate-id",
      upscaled!.candidateId,
    );
    await expect(page.getByTestId("art-desk-lineage")).toContainText(
      "upscale of",
    );
    await expect(page.getByTestId("art-desk-decisions")).toContainText(
      "Awaiting review",
    );

    // Transparent edit from the original card: alpha measured, checkerboard shown.
    await page.getByTestId(`art-desk-candidate-${first.candidateId}`).click();
    await page
      .getByTestId("art-desk-edit-kind")
      .selectOption("background-removal");
    await page
      .getByTestId("art-desk-edit-note")
      .fill("background removed externally");
    await page.getByTestId("art-desk-upload-edited").setInputFiles(alphaPath);
    await expect(page.getByTestId("art-desk-status")).toContainText("α");
    state = await benchState(page);
    const cutout = Object.values(state.projection.candidates).find(
      (c) =>
        c.parentCandidateId === first.candidateId &&
        c.editKind === "background-removal",
    );
    expect(cutout).toBeTruthy();
    expect(cutout!.hasAlpha).toBe(true);
    expect(cutout!.calibrationRecheck).toEqual(
      expect.arrayContaining(["floor-contact", "occlusion"]),
    );
    await expect(
      page.getByTestId("art-desk-preview").locator(".art-desk-checker"),
    ).toBeVisible();
    // Transparent bytes remain transparent on disk.
    const cutoutBytes = Buffer.from(
      await (
        await request.get(
          `${BENCH}/original?candidateId=${cutout!.candidateId}`,
        )
      ).body(),
    );
    expect(cutoutBytes.equals(transparent)).toBe(true);

    // 10. Approve the chosen new revision → its own integration-ready item; the
    //     old approval stays as history on the parent.
    await page
      .getByTestId(`art-desk-candidate-${upscaled!.candidateId}`)
      .click();
    await page
      .getByTestId("art-desk-detail")
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await expect(page.getByTestId("art-desk-status")).toContainText(
      "approve recorded",
    );
    state = await benchState(page);
    expect(state.projection.candidates[upscaled!.candidateId].status).toBe(
      "integration-ready",
    );
    expect(
      state.projection.candidates[first.candidateId].decisions[0].payload
        .decision,
    ).toBe("approve");
    expect(state.projection.integrationQueue.map((i) => i.candidateId)).toEqual(
      expect.arrayContaining([first.candidateId, upscaled!.candidateId]),
    );

    // 11. Guards: stale/invalid approval and a concurrent tag edit conflict.
    const declared = await request.post(`${BENCH}/events`, {
      headers: json,
      data: JSON.stringify({
        type: "review.decided",
        actor: ACTOR,
        payload: {
          candidateId: second.candidateId,
          viewedCandidateId: second.candidateId,
          viewedSha256: second.sha256,
          decision: "approve",
          fitContractHash: "f".repeat(64),
          sceneContractHash: "s".repeat(64),
          contractVersion: "alive43-art-desk-v1",
        },
      }),
    });
    expect(declared.status()).toBe(403);
    const noActor = await request.post(`${BENCH}/events`, {
      headers: auth,
      data: JSON.stringify({ type: "review.decided", payload: {} }),
    });
    expect(noActor.status()).toBe(400);
    const stale = await request.post(`${BENCH}/events`, {
      headers: auth,
      data: JSON.stringify({
        type: "review.decided",
        actor: ACTOR,
        payload: {
          candidateId: second.candidateId,
          viewedCandidateId: second.candidateId,
          viewedSha256: "0".repeat(64),
          decision: "approve",
          fitContractHash: "f".repeat(64),
          sceneContractHash: "s".repeat(64),
          contractVersion: "alive43-art-desk-v1",
        },
      }),
    });
    expect(stale.status()).toBe(409);
    const agentApproval = await request.post(`${BENCH}/events`, {
      headers: auth,
      data: JSON.stringify({
        type: "review.decided",
        actor: { kind: "agent", id: "some-model" },
        payload: {
          candidateId: second.candidateId,
          viewedCandidateId: second.candidateId,
          viewedSha256: second.sha256,
          decision: "approve",
          fitContractHash: "f".repeat(64),
          sceneContractHash: "s".repeat(64),
          contractVersion: "alive43-art-desk-v1",
        },
      }),
    });
    expect(agentApproval.status()).toBe(403);
    const conflict = await request.post(`${BENCH}/events`, {
      headers: auth,
      data: JSON.stringify({
        type: "tags.set",
        actor: { kind: "owner", id: "another-editor" },
        payload: {
          entity: "candidate",
          entityId: first.candidateId,
          tags: { region: ["mountain"] },
          baseVersion: 0,
        },
      }),
    });
    expect(conflict.status()).toBe(409);
    state = await benchState(page);
    expect(state.projection.candidates[first.candidateId].tags.region).toEqual([
      "southwest",
    ]);

    // 12. Typing decision keys into a field never decides.
    const before =
      state.projection.candidates[upscaled!.candidateId].decisions.length;
    await page.getByLabel("Search requests").fill("");
    await page.getByLabel("Search requests").type("a x");
    state = await benchState(page);
    expect(
      state.projection.candidates[upscaled!.candidateId].decisions.length,
    ).toBe(before);
    rmSync(upscalePath, { force: true });
    rmSync(alphaPath, { force: true });
  } finally {
    await putQa(
      priorQaBody ?? JSON.stringify({ documentVersion: 1, requests: [] }),
    );
  }
});

test("source-switch persistence: the data root outlives the worktree and a second store sees the same events", async ({
  request,
  baseURL,
}) => {
  const state = await (await request.get(`${BENCH}/state`)).json();
  const events = await (await request.get(`${BENCH}/events?sinceSeq=0`)).json();
  expect(events.events.length).toBeGreaterThan(0);
  const dataRoot = process.env.PG_ARTBENCH_DATA_ROOT!;
  const log = readFileSync(join(dataRoot, "events", "events.jsonl"), "utf8")
    .trim()
    .split("\n");
  expect(log.length).toBe(events.events.length);
  expect(dataRoot.startsWith(process.cwd())).toBe(false);
  expect(state.store.dataRootLabel).toContain("outside the worktree");
  expect(baseURL).toMatch(/127\.0\.0\.1|localhost/);
});
