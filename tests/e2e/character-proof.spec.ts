import { expect, test, type Locator, type Page } from "@playwright/test";

// This suite is the DEV-fixture regression surface, so it names that set
// explicitly. The route now defaults to the banked production candidates,
// which are covered by character-proof-real.spec.ts.
const PROOF_URL = "/?view=character-proof&set=dev";

async function recipeKeys(page: Page): Promise<string[]> {
  return page
    .getByTestId("character-proof-stage-character")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-recipe-key") ?? ""),
    );
}

async function loadedLayerCount(character: Locator): Promise<number> {
  return character
    .locator("img.modular-character-layer")
    .evaluateAll(
      (images) =>
        images.filter(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ).length,
    );
}

test.describe("Modular character runtime proof", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROOF_URL);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(PROOF_URL);
  });

  test("renders four distinct complete characters through one compositor", async ({
    page,
  }) => {
    const proof = page.getByTestId("character-proof");
    await expect(proof).toHaveAttribute("data-world-source", "fresh");
    await expect(proof).toHaveAttribute("data-catalog-generation", "2");
    await expect(proof).toHaveAttribute("data-proof-set", "dev");

    const characters = page.getByTestId("character-proof-stage-character");
    await expect(characters).toHaveCount(4);
    const keys = await recipeKeys(page);
    expect(new Set(keys).size).toBe(4);

    for (let index = 0; index < 4; index += 1) {
      const character = characters.nth(index);
      await expect(character).toHaveAttribute("data-complete", "true");
      await expect(character).toHaveAttribute("data-pinned-by-person", "true");
      const layers = character.locator("img.modular-character-layer");
      const count = await layers.count();
      expect(count).toBeGreaterThanOrEqual(5);
      await expect.poll(() => loadedLayerCount(character)).toBe(count);
      // DOM order equals ascending draw order.
      const drawOrder = await layers.evaluateAll((nodes) =>
        nodes.map((node) => Number(node.getAttribute("data-layer"))),
      );
      expect([...drawOrder].sort((a, b) => a - b)).toEqual(drawOrder);
      await expect(
        character.getByTestId("character-proof-stage-character-missing-layer"),
      ).toHaveCount(0);
    }

    // Shared body, multiple heads, hair, and wardrobe across the four.
    const rows = page.getByTestId("character-proof-reuse").locator("tbody tr");
    const usage = await rows.evaluateAll((nodes) =>
      nodes.map((node) => ({
        assetId: node.getAttribute("data-asset-id") ?? "",
        usedBy: node.querySelectorAll("td")[2]?.textContent ?? "",
      })),
    );
    // Bodies now come in two frames across three complexion bands, so the
    // four are no longer built on one shared body raster. What must still
    // hold is that they RECOMBINE: shared components used by more than one.
    const shared = usage.filter((row) => row.usedBy.includes(","));
    expect(shared.length).toBeGreaterThanOrEqual(3);
    const bodies = usage.filter((row) => row.assetId.includes("_body_"));
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    const heads = usage.filter((row) => row.assetId.includes("_head_"));
    expect(heads.length).toBeGreaterThanOrEqual(2);
    const hair = usage.filter((row) => row.assetId.includes("_hair_"));
    expect(hair.length).toBeGreaterThanOrEqual(2);
    const tops = usage.filter((row) => row.assetId.includes("_top_"));
    expect(tops.length).toBeGreaterThanOrEqual(2);

    // The same person seated in the second scene keeps the stage identity.
    const side = page.getByTestId("character-proof-side-character");
    await expect(side).toHaveCount(1);
    await expect(side).toHaveAttribute("data-recipe-key", keys[0]!);
    await expect(side).toHaveAttribute("data-pose-family", "seated-at-desk");

    // This person wears a generation-1 footwear family that was authored for
    // the standing pose only. Sitting them down leaves a REQUIRED slot empty,
    // and the proof reports that rather than presenting a barefoot figure as
    // a finished person.
    await expect(side).toHaveAttribute("data-complete", "false");
    await expect(page.getByTestId("character-proof-side-status")).toContainText(
      "footwear",
    );

    await page.screenshot({
      path: "test-results/character-proof/stage.png",
      fullPage: false,
    });
  });

  test("head, hair, and eyewear layers physically overlap the body layer", async ({
    page,
  }) => {
    const character = page
      .getByTestId("character-proof-stage-character")
      .first();
    const body = character.locator('img[data-kind="body"]');
    const head = character.locator('img[data-kind="head"]');
    const bodyBox = (await body.boundingBox())!;
    const headBox = (await head.boundingBox())!;
    expect(bodyBox).toBeTruthy();
    expect(headBox).toBeTruthy();
    // Head sits at the top of the body and horizontally centered on it.
    expect(headBox.y).toBeLessThan(bodyBox.y + bodyBox.height * 0.2);
    expect(
      Math.abs(headBox.x + headBox.width / 2 - (bodyBox.x + bodyBox.width / 2)),
    ).toBeLessThan(2);
    const top = character.locator('img[data-kind="top"]');
    const topBox = (await top.boundingBox())!;
    expect(topBox.y).toBeGreaterThan(bodyBox.y);
    expect(topBox.y + topBox.height).toBeLessThan(bodyBox.y + bodyBox.height);
  });

  test("developer anchor toggle shows root and attachment markers separate from scene anchors", async ({
    page,
  }) => {
    const stage = page.getByTestId("character-proof-stage");
    await expect(
      page.getByTestId("character-proof-stage-character-root-marker"),
    ).toHaveCount(0);
    await page.getByTestId("character-proof-debug-anchors").check();
    await expect(
      page.getByTestId("character-proof-stage-character-root-marker"),
    ).toHaveCount(4);
    await expect(
      page.getByTestId("character-proof-stage-character-attachment-marker"),
    ).toHaveCount(16);
    await expect(
      page.getByTestId("character-proof-stage-scene-anchor-marker"),
    ).toHaveCount(4);
    // Root markers are DOM overlays, never raster pixels.
    await expect(
      page.getByTestId("character-proof-stage-character-root-marker").first(),
    ).toHaveClass(/character-anchor-marker--root/);
    await stage.screenshot({
      path: "test-results/character-proof/anchors.png",
    });
    await page.getByTestId("character-proof-debug-anchors").uncheck();
    await expect(
      page.getByTestId("character-proof-stage-character-root-marker"),
    ).toHaveCount(0);
  });

  test("save, reload, and restore yield the same modular recipes and rendered layers", async ({
    page,
  }) => {
    const before = await recipeKeys(page);
    const layersBefore = await page
      .getByTestId("character-proof-stage-character-layer")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-asset-id")),
      );
    const worldId = await page
      .getByTestId("character-proof")
      .getAttribute("data-world-id");

    await page.getByTestId("character-proof-save").click();
    await expect(page.getByTestId("character-proof-status")).toContainText(
      "Saved",
    );
    await page.reload();

    const proof = page.getByTestId("character-proof");
    await expect(proof).toHaveAttribute(
      "data-world-source",
      "restored-snapshot",
    );
    await expect(proof).toHaveAttribute("data-world-id", worldId!);
    expect(await recipeKeys(page)).toEqual(before);
    const layersAfter = await page
      .getByTestId("character-proof-stage-character-layer")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-asset-id")),
      );
    expect(layersAfter).toEqual(layersBefore);
    await expect(
      page.getByTestId("character-proof-side-character"),
    ).toHaveAttribute("data-recipe-key", before[0]!);
    await page.screenshot({
      path: "test-results/character-proof/restored.png",
    });

    await page.getByTestId("character-proof-clear").click();
    await expect(proof).toHaveAttribute("data-world-source", "fresh");
    expect(await recipeKeys(page)).toEqual(before);
  });

  test("the authored office path still renders A01/B01", async ({ page }) => {
    await page.goto("/?view=office-fixture");
    await expect(
      page.getByTestId("scene-character-art-primary"),
    ).toHaveAttribute(
      "data-asset-id",
      "human_candidate_A01_primary_desk_seated_v1",
    );
    await expect(page.getByTestId("scene-character-art-guest")).toHaveAttribute(
      "data-asset-id",
      "human_candidate_B01_left_guest_seated_v1",
    );
    await expect(page.locator(".modular-character")).toHaveCount(0);
  });
});
