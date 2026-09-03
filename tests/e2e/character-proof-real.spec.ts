import { expect, test, type Locator } from "@playwright/test";

const PROOF_URL = "/?view=character-proof&set=real";

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

test.describe("Real Political Game modular characters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROOF_URL);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(PROOF_URL);
  });

  test("renders four real modular people from shared body families with lineage and reload stability", async ({
    page,
  }) => {
    const proof = page.getByTestId("character-proof");
    await expect(proof).toHaveAttribute("data-proof-set", "real");
    await expect(proof).toHaveAttribute("data-world-source", "fresh");

    const characters = page.getByTestId("character-proof-stage-character");
    await expect(characters).toHaveCount(4);
    const keys = await characters.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-recipe-key") ?? ""),
    );
    expect(new Set(keys).size).toBe(4);
    for (let index = 0; index < 4; index += 1) {
      const character = characters.nth(index);
      await expect(character).toHaveAttribute("data-complete", "true");
      await expect(character).toHaveAttribute("data-catalog-generation", "2");
      const layers = character.locator("img.modular-character-layer");
      const count = await layers.count();
      expect(count).toBeGreaterThanOrEqual(5);
      await expect.poll(() => loadedLayerCount(character)).toBe(count);
      const ids = await layers.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-asset-id") ?? ""),
      );
      expect(ids.every((id) => id.startsWith("pg_"))).toBe(true);
      const drawOrder = await layers.evaluateAll((nodes) =>
        nodes.map((node) => Number(node.getAttribute("data-layer"))),
      );
      expect([...drawOrder].sort((a, b) => a - b)).toEqual(drawOrder);
    }

    const rows = page.getByTestId("character-proof-reuse").locator("tbody tr");
    const usage = await rows.evaluateAll((nodes) =>
      nodes.map((node) => ({
        assetId: node.getAttribute("data-asset-id") ?? "",
        usedBy: node.querySelectorAll("td")[2]?.textContent ?? "",
      })),
    );
    expect(
      usage
        .find((r) => r.assetId === "pg_body_fl_standing_v1")
        ?.usedBy.split(", "),
    ).toHaveLength(2);
    expect(
      usage
        .find((r) => r.assetId === "pg_body_ml_standing_v1")
        ?.usedBy.split(", "),
    ).toHaveLength(2);
    expect(
      usage.filter((r) => r.assetId.startsWith("pg_head_")).length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      usage.filter((r) => r.assetId.startsWith("pg_hair_")).length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      usage.filter((r) => r.assetId.startsWith("pg_top_")).length,
    ).toBeGreaterThanOrEqual(3);

    // Every component card cites its source master lineage.
    const lineage = page
      .getByTestId("character-proof-lineage")
      .locator("tbody tr");
    expect(await lineage.count()).toBeGreaterThanOrEqual(10);
    await expect(lineage.first().locator("td").nth(2)).toContainText(
      "art/references/masters/pg-modular/",
    );

    // The seated side view fails closed: no real seated body exists.
    const side = page.getByTestId("character-proof-side-character");
    await expect(side).toHaveAttribute("data-complete", "false");
    await expect(side).toHaveAttribute("data-layer-count", "0");

    // The office path panel shows the authored A01/B01 recipes as flattened.
    const paths = page.getByTestId("character-proof-paths").locator("tbody tr");
    await expect(paths).toHaveCount(4);
    await expect(paths.nth(0)).toContainText("flattened");
    await expect(paths.nth(1)).toContainText("flattened");
    await expect(paths.nth(2)).toContainText("modular (generation 1)");
    await expect(paths.nth(3)).toContainText("placeholder");

    await page.screenshot({
      path: "test-results/character-proof/real-stage.png",
    });

    await page.getByTestId("character-proof-save").click();
    await page.reload();
    await expect(proof).toHaveAttribute(
      "data-world-source",
      "restored-snapshot",
    );
    const restored = await characters.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-recipe-key") ?? ""),
    );
    expect(restored).toEqual(keys);
  });

  test("the repaired office seats both authored characters on their chairs", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const guest = page.getByTestId("scene-character-art-guest");
    const primary = page.getByTestId("scene-character-art-primary");
    await expect(guest).toHaveAttribute(
      "data-asset-id",
      "human_candidate_B01_left_guest_seated_v1",
    );
    const guestBox = (await guest.boundingBox())!;
    const primaryBox = (await primary.boundingBox())!;
    const stage = (await page
      .getByTestId("office-art-compositor")
      .boundingBox())!;
    const scale = stage.width / 1024;
    // Root (seat contact) lands on the anchor: the guest chair seat at ~29.1%, 66.1%.
    expect(guestBox.x + guestBox.width * 0.497).toBeCloseTo(
      stage.x + 1024 * 0.291 * scale,
      0,
    );
    expect(guestBox.y + guestBox.height * 0.62).toBeCloseTo(
      stage.y + 572 * 0.661 * scale,
      0,
    );
    expect(primaryBox.y + primaryBox.height * 0.624).toBeCloseTo(
      stage.y + 572 * 0.691 * scale,
      0,
    );
    await page.screenshot({
      path: "test-results/character-proof/office-after.png",
    });
  });
});
