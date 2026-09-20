import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { expect, test, type Page } from "./fixtures";

/**
 * CRUNCH46 H5/H6: the human Art Desk, on the isolated data root the web
 * server is started with (PG_ARTBENCH_DATA_ROOT). A two-step delivery (an
 * original and its repair) becomes one named card with a lineage; the tabs
 * count real cards; filters stay small; Copy brief and Download brief produce
 * the named result. Nothing here touches production approvals.
 */

const require = createRequire(import.meta.url);
const BENCH = "/__dev/artbench";
const ACTOR = { kind: "owner", id: "e2e-fixture-owner" };
const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
] as const;

function png(width: number, height: number, seed: number): Buffer {
  const { PNG } = require("pngjs") as {
    PNG: new (o: { width: number; height: number }) => { data: Buffer };
  };
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = (i * 5 + seed) % 256;
    image.data[i + 1] = (i * 11 + seed * 3) % 256;
    image.data[i + 2] = 120;
    image.data[i + 3] = 255;
  }
  return Buffer.from(
    (PNG as unknown as { sync: { write(p: unknown): Buffer } }).sync.write(
      image,
    ),
  );
}

async function intake(
  page: Page,
  bytes: Buffer,
  meta: Record<string, unknown>,
): Promise<string> {
  const result = await page.evaluate(
    async ({ bench, data, meta }) => {
      const params = new URLSearchParams({ meta: JSON.stringify(meta) });
      const response = await fetch(`${bench}/intake?${params}`, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(data),
      });
      const body = await response.json();
      return { ok: response.ok, id: body.candidate?.candidateId as string };
    },
    { bench: BENCH, data: [...bytes], meta },
  );
  expect(result.ok).toBe(true);
  return result.id;
}

test("the human Art Desk: named cards, lineage, small filters, brief copy and download", async ({
  page,
  request,
  baseURL,
  context,
}, info) => {
  test.setTimeout(150_000);
  const origin = baseURL ?? "http://127.0.0.1";
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/art-desk.html");
  await expect(page.getByTestId("art-desk")).toBeVisible();

  const stamp = String(info.workerIndex * 1000 + (Date.now() % 1000));
  const requestId = `e2e-corridor-${stamp}`;
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
  const created = await request.post(`${BENCH}/events`, {
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-OCD-Owner-Capability": session.capability,
    },
    data: {
      type: "request.created",
      actor: ACTOR,
      payload: {
        request: {
          requestId,
          requestVersion: 1,
          priority: "P2",
          status: "queued",
          title: "School corridor",
          consumer: {
            consumerId: "isolated-corridor-test",
            runtimeComponent: "none",
            playerVisibleUse: "Isolated UI fixture only.",
          },
          whyNeeded:
            "Verify review transitions without touching owner records.",
          inventoryCheck: {
            repositoryPathsSearched: ["art/families/"],
            driveLocationsSearched: ["none"],
            found: "Disposable generated test pixels.",
            shortfall: "None.",
          },
          target: {
            targetClass: "environment-plate",
            minimumWidth: 1,
            aspectRatio: "any",
            alphaRequired: false,
            container: "either",
            styleAuthority: "Test fixture",
          },
          generationRecipe: ["Do not generate."],
          acceptanceCriteria: ["Preserve exact revision and review history."],
          dependsOn: [],
        },
      },
    },
  });
  expect(created.status()).toBe(201);
  const original = await intake(page, png(64, 36, Number(stamp)), {
    requestId,
    originalName: `corridor_native_${stamp}.png`,
    note: "Owner-generated native plate.",
  });
  const tagged = await request.post(`${BENCH}/events`, {
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-OCD-Owner-Capability": session.capability,
    },
    data: JSON.stringify({
      type: "tags.set",
      actor: ACTOR,
      payload: {
        entity: "candidate",
        entityId: original,
        tags: {
          family: ["school-corridor-generic"],
          assetType: ["environment-plate"],
        },
        baseVersion: 0,
      },
    }),
  });
  expect(tagged.status()).toBe(201);
  const repair = await intake(page, png(64, 36, Number(stamp) + 1), {
    requestId,
    originalName: `corridor_fix_${stamp}.png`,
    parentCandidateId: original,
    editKind: "repaint",
    note: "TITLE: School corridor B - fountain fix (E2E). STAGE: ready for owner review (not approved). CHANGES: added a wall-mounted drinking fountain. Nothing else moved.",
  });

  await page.reload();
  const needs = page.getByTestId("art-desk-tab-needs-review");
  await expect(needs).toHaveAttribute("aria-current", "page");
  const card = page
    .getByTestId("art-desk-list")
    .getByRole("button", { name: /School corridor — fountain fix/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("added a wall-mounted drinking fountain.");
  await expect(card).toContainText("Awaiting review");
  await expect(card).toContainText("2 versions");
  await expect(card).not.toContainText(/\brev\s*\d/i);
  await card.click();
  const lineage = page.getByTestId("art-desk-asset-lineage");
  await lineage.locator("summary").click();
  await expect(lineage).toContainText("Original");
  await expect(lineage).toContainText("Repair");
  await expect(page.getByTestId(`art-desk-candidate-${repair}`)).toBeVisible();

  // Filters: three visible, the rest in one drawer; QA hidden by default.
  await expect(page.getByTestId("art-desk-asset-type")).toBeVisible();
  await expect(page.getByTestId("art-desk-more-drawer")).toHaveCount(0);
  await page.getByTestId("art-desk-more-filters").click();
  await expect(page.getByTestId("art-desk-more-drawer")).toBeVisible();
  await expect(page.getByTestId("art-desk-show-qa")).not.toBeChecked();
  await page
    .getByTestId("art-desk-filter-family")
    .selectOption("school-corridor-generic");
  await expect(page.getByTestId("art-desk-more-filters")).toContainText("(1)");
  await expect(card).toBeVisible();
  await page.getByTestId("art-desk-clear-filters").click();
  await expect(page.getByTestId("art-desk-more-filters")).not.toContainText(
    "(",
  );

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await expect(card).toBeVisible();
    await expect(page.getByTestId("art-desk-copy-brief")).toBeAttached();
    await page.screenshot({
      path: info.outputPath(`art-desk-human-${size.name}.png`),
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // Copy brief puts the actual brief on the clipboard and says so.
  await page.getByTestId("art-desk-copy-brief").click();
  await expect(page.getByTestId("art-desk-brief-status")).toContainText(
    "Copied the brief",
  );
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const served = await page.evaluate(
    async ({ candidateId, requestId }) => {
      const response = await fetch(
        `/__dev/artbench/brief?requestId=${encodeURIComponent(requestId)}&candidateId=${encodeURIComponent(candidateId)}`,
      );
      if (!response.ok)
        throw new Error(`Brief fetch failed (${response.status})`);
      return response.text();
    },
    { candidateId: repair, requestId },
  );
  expect(copied).toBe(served);

  // Download brief writes the same text under a readable name.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("art-desk-download-brief").click(),
  ]);
  expect(download.suggestedFilename()).toBe("school-corridor-brief.md");
  const saved = await download.path();
  expect(readFileSync(saved, "utf8")).toBe(served);

  // Download original: a readable name that keeps the hash, and a real signal.
  const [image] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("art-desk-download-original").click(),
  ]);
  expect(image.suggestedFilename()).toMatch(
    /^school-corridor-fountain-fix-[0-9a-f]{12}\.png$/,
  );
  await expect(page.getByTestId("art-desk-original-status")).toContainText(
    "hash verified",
  );

  await page
    .getByTestId("art-desk-question")
    .fill("Is this an image to review or a request?");
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(page.getByTestId("art-desk-message")).toContainText(
    "Is this an image to review or a request?",
  );
  await page.reload();
  await expect(page.getByTestId("art-desk-message")).toContainText(
    "Is this an image to review or a request?",
  );

  // A failed write keeps this exact review visible. A successful canonical
  // decision removes it immediately, without a browser reload or history loss.
  for (const [action, destination] of [
    ["Use as style reference", "references"],
    ["Remove from review", "archived"],
  ] as const) {
    await page
      .getByTestId("art-desk-detail")
      .getByRole("button", { name: action, exact: true })
      .click();
    await expect(card).toHaveCount(0);
    await page.getByTestId(`art-desk-tab-${destination}`).click();
    await expect(card).toBeVisible();
    await card.click();
    await page
      .getByRole("button", { name: "Return to review queue", exact: true })
      .click();
    await expect(card).toHaveCount(0);
    await page.getByTestId("art-desk-tab-needs-review").click();
    await expect(card).toBeVisible();
    await card.click();
  }
  const eventsRoute = "**/__dev/artbench/events";
  await page.route(eventsRoute, async (route) => {
    if (route.request().postDataJSON()?.type === "review.decided") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "fixture-conflict",
          message: "Disposable rejected-write proof",
        }),
      });
    } else await route.continue();
  });
  const approve = page
    .getByTestId("art-desk-detail")
    .getByRole("button", { name: "Approve", exact: true });
  await approve.click();
  await expect(page.getByTestId("art-desk-status")).toContainText(
    "Could not save your decision",
  );
  await expect(card).toBeVisible();
  await page.unroute(eventsRoute);
  await approve.click();
  await expect(page.getByTestId("art-desk-status")).toContainText(
    "Approved. Moved",
  );
  await expect(card).toHaveCount(0);
  await page.getByTestId("art-desk-tab-approved").click();
  await expect(card).toBeVisible();
  await expect(card).not.toContainText("Awaiting review");
  await card.click();
  await expect(page.getByTestId("art-desk-viewed")).toHaveAttribute(
    "data-candidate-id",
    repair,
  );
  const state = await page.evaluate(async () => {
    const response = await fetch("/__dev/artbench/state");
    if (!response.ok)
      throw new Error(`State fetch failed (${response.status})`);
    return response.json();
  });
  expect(state.projection.candidates[original].status).toBe("awaiting-review");
  expect(state.projection.candidates[repair].status).not.toBe(
    "awaiting-review",
  );
  await page.screenshot({
    path: info.outputPath("approved-kept-in-library.png"),
  });
  await page
    .getByTestId("art-desk-detail")
    .getByRole("button", { name: "Reject", exact: true })
    .click();
  await expect(page.getByTestId("art-desk-status")).toContainText(
    "Rejected. Moved",
  );
  await expect(card).toHaveCount(0);
  await page.getByTestId("art-desk-tab-rejected").click();
  await expect(card).toBeVisible();
  await expect(card).toContainText("Rejected");
  await page.screenshot({ path: info.outputPath("rejected-with-history.png") });
});

test("returned images keep the exact original reference accessible", async ({
  page,
  request,
  baseURL,
}, info) => {
  await page.goto("/art-desk.html");
  await expect(page.getByTestId("art-desk")).toBeVisible();
  const origin = baseURL!;
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
  const state = await (await request.get(`${BENCH}/state`)).json();
  const seed = Object.values(state.projection.requests)[0] as {
    request: Record<string, unknown>;
  };
  const reference = await intake(page, png(96, 64, 104), {
    originalName: "reference-proof.png",
  });
  const after = await (await request.get(`${BENCH}/state`)).json();
  const referenceRow = after.projection.candidates[reference];
  const requestId = "e2e-visible-original-reference";
  const created = await request.post(`${BENCH}/events`, {
    headers: { Origin: origin, "X-OCD-Owner-Capability": session.capability },
    data: {
      type: "request.created",
      actor: ACTOR,
      payload: {
        request: {
          ...seed.request,
          requestId,
          requestVersion: 1,
          title: "Visible original reference",
          target: {
            ...(seed.request.target as object),
            styleReferences: [
              {
                role: "subject-content",
                ref: `candidate:${reference}`,
                sha256: referenceRow.sha256,
                width: 96,
                height: 64,
              },
            ],
          },
        },
      },
    },
  });
  expect(created.status()).toBe(201);
  await intake(page, png(96, 64, 201), {
    requestId,
    originalName: "returned-image.png",
  });
  await page.reload();
  await page
    .getByTestId("art-desk-list")
    .getByRole("button", { name: /Visible original reference/ })
    .click();
  const ref = page.getByTestId("art-desk-style-reference");
  await expect(
    ref.getByRole("heading", { name: "Original reference" }),
  ).toBeVisible();
  await expect(ref.locator("img")).toBeVisible();
  await expect(
    page.getByText("Editing instructions", { exact: true }).locator(".."),
  ).not.toHaveAttribute("open", "");
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const download = ref.getByRole("link", { name: "Download reference" });
    await expect(download).toBeVisible();
    const [saved] = await Promise.all([
      page.waitForEvent("download"),
      download.click(),
    ]);
    expect(await saved.failure()).toBeNull();
    const filename = info.outputPath(`reference-${size.name}.png`);
    await saved.saveAs(filename);
    expect(readFileSync(filename)).toEqual(png(96, 64, 104));
    await ref.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(ref.locator("details")).toHaveAttribute("open", "");
    await ref.locator("summary").click();
    await page.screenshot({
      path: info.outputPath(`visible-reference-${size.name}.png`),
    });
  }
});
