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
  const original = await intake(page, png(64, 36, Number(stamp)), {
    originalName: `corridor_native_${stamp}.png`,
    note: "Owner-generated native plate.",
  });
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
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
  const served = await (
    await request.get(
      `${BENCH}/brief?requestId=inbox&candidateId=${encodeURIComponent(repair)}`,
    )
  ).text();
  expect(copied).toBe(served);

  // Download brief writes the same text under a readable name.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("art-desk-download-brief").click(),
  ]);
  expect(download.suggestedFilename()).toBe(`corridor-fix-${stamp}-brief.md`);
  const saved = await download.path();
  expect(readFileSync(saved, "utf8")).toBe(served);
});
