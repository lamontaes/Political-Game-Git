import { expect, test } from "./fixtures";
import { saveLife, startLife } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import type { BrowserSaveStore as SaveStore } from "../../src/presentation/browser-world-repository";

// Golden steps 2/3: six fresh games. Missing placement metadata is reported,
// never filled from a guess. Capture success is not slot-engine acceptance.
for (let draw = 0; draw < 6; draw += 1) {
  const seed = `session4-session11-intro-tags:${draw}`;
  const place = drawRandomPlace(seed, (row) => row.scope === "locality");
  const state = lifePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === place.stateJurisdictionKey,
  )!;
  test(`intro placement capture ${draw} ${place.displayName}`, async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/?seed=${encodeURIComponent(seed)}`);
    await startLife(page, {
      age: 18,
      state: state.name,
      place: place.displayName,
      route: "normal",
      givenName: "Avery",
      familyName: "Morgan",
    });
    const intro = page.getByTestId("world-orientation");
    await expect(intro).toBeVisible();
    const cards = [];
    while (await intro.isVisible()) {
      const heading = intro
        .locator('[data-testid^="orientation-step-"]')
        .first();
      const key = (await heading.getAttribute("data-testid"))!.slice(
        "orientation-step-".length,
      );
      const people = await intro
        .locator("[data-person-id]")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            personId: node.getAttribute("data-person-id"),
            slotId: node.getAttribute("data-slot-id"),
            slotRole: node.getAttribute("data-slot-role"),
            pose: node.getAttribute("data-pose-id"),
            facing: node.getAttribute("data-facing"),
            depth: node.getAttribute("data-depth"),
            selectionRecordIds: node.getAttribute("data-selection-record-ids"),
          })),
        );
      const screenshot = `${draw}-${key}-full-size.png`;
      await page.screenshot({
        path: info.outputPath(screenshot),
        fullPage: true,
      });
      cards.push({ key, title: await heading.innerText(), screenshot, people });
      const next = intro.getByTestId("orientation-next");
      await next.focus();
      await page.keyboard.press("Enter");
    }
    await saveLife(page);
    const recorded = await page.evaluate(async () => {
      const storePath = "/src/presentation/browser-world-repository.ts";
      const sourcePath = "/src/presentation/living-scene-facts.ts";
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      const { projectLivingSceneOpening } = await import(
        /* @vite-ignore */ sourcePath
      );
      const store: SaveStore = new BrowserSaveStore();
      const summary = (await store.list()).saves[0]!;
      const world = await store.inspectSnapshot(summary.saveId);
      if (!world) throw new Error("Actual captured life was not saved.");
      return {
        worldId: world.id,
        seed: world.seed,
        moment: world.currentMoment,
        playerPersonId: summary.playerPersonId,
        selectionProjection: projectLivingSceneOpening(
          world,
          summary.playerPersonId,
        ),
      };
    });
    await info.attach("six-place-intro-card-receipt", {
      body: JSON.stringify(
        {
          seed,
          place,
          state,
          cards,
          recorded,
          method:
            "DOM placement attributes observed on each card; selection projection read from the actual saved World afterward. Null fields remain missing proof, not inferred defaults.",
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    expect(cards.length).toBeGreaterThan(0);
  });
}
