import { expect, test } from "./fixtures";
import { enterLife, goTo, saveLife, startLife } from "./support/creator";
import type { BrowserSaveStore } from "../../src/presentation/browser-world-repository";
import { drawRandomPlace } from "../support/random-place";

// Browser-only evidence: fresh normal games, no injected Worlds or speakers.
// Every step records the complete offered list, the clicked words, and result.
test.use({ video: "on", viewport: { width: 1920, height: 1080 } });

for (let draw = 0; draw < 4; draw += 1) {
  const seed = `session4-played-workshop-2026-10-06:${draw}`;
  const place = drawRandomPlace(
    seed,
    (candidate) => candidate.scope === "locality",
  );
  test(`played workshop ${draw} ${place.key}`, async ({ page }, info) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const path: unknown[] = [];
    await page.goto(`/?seed=${encodeURIComponent(seed)}`);
    await startLife(page, {
      age: 18,
      givenName: "Avery",
      familyName: "Morgan",
      place: place.displayName,
      route: "normal",
    });
    await enterLife(page);
    await goTo(page, "nav-calendar");
    const meeting = page
      .getByTestId("calendar-upcoming")
      .locator('[data-testid^="calendar-entry-"]')
      .filter({ hasText: "Posted public meeting" })
      .first();
    await expect(meeting).toBeVisible();
    await page.screenshot({ path: info.outputPath("00-calendar.png") });
    await meeting.click();
    await page.getByTestId("calendar-play-event").click();
    const scene = page.getByTestId("scene-conversation");
    await expect(scene).toBeVisible({ timeout: 60_000 });
    await expect(scene.getByTestId("talk-lie-toggle")).toBeEnabled();
    for (let step = 0; step < 3; step += 1) {
      if (step === 2) await scene.getByTestId("talk-lie-toggle").click();
      const choices = scene.getByTestId("scene-record-reply");
      const offered = await choices.evaluateAll((buttons) =>
        buttons.map((button) => ({
          text: button.textContent?.trim() ?? "",
          sourceEventId: button.getAttribute("data-source-event"),
        })),
      );
      expect(offered.length).toBeGreaterThan(0);
      const candidate = offered.findIndex((choice) =>
        step === 0
          ? choice.text.endsWith("?")
          : step === 1
            ? !choice.text.endsWith("?") &&
              !/leave|go\.|think|rather/i.test(choice.text)
            : /not|isn't|can't|neither/i.test(choice.text),
      );
      expect(
        candidate,
        "The intended act must actually be offered",
      ).toBeGreaterThanOrEqual(0);
      await page.screenshot({
        path: info.outputPath(`${step + 1}-offered.png`),
      });
      const selected = offered[candidate]!;
      await choices.nth(candidate).click();
      await expect(scene.getByTestId("talk-you")).toHaveText(selected.text);
      await expect(scene.getByTestId("talk-reply")).toBeVisible();
      const consequence = await scene
        .getByTestId("talk-reply")
        .allTextContents();
      path.push({ step, offered, selected, consequence });
      await page.screenshot({
        path: info.outputPath(`${step + 1}-consequence.png`),
      });
    }
    await scene
      .getByRole("button", { name: "Return to the room", exact: true })
      .click();
    await expect(scene).toHaveCount(0);
    await saveLife(page);
    const saved = await page.evaluate(async () => {
      const storePath = "/src/presentation/browser-world-repository.ts";
      const traitsPath = "/src/presentation/speaker-traits.ts";
      const { BrowserSaveStore: Store } = await import(
        /* @vite-ignore */ storePath
      );
      const { speakerTraits } = await import(/* @vite-ignore */ traitsPath);
      const store: BrowserSaveStore = new Store();
      const shelf = await store.list();
      if (shelf.saves.length !== 1)
        throw new Error("Expected this fresh game's actual save.");
      const summary = shelf.saves[0]!;
      const world = await store.inspectSnapshot(summary.saveId);
      if (!world) throw new Error("The actual saved World is missing.");
      const turns = world.history.events.filter((event) =>
        event.tags.includes("scene.composed-turn"),
      );
      const speakerIds = [
        ...new Set(
          turns.flatMap((turn) =>
            turn.participants.map((person) => person.personId),
          ),
        ),
      ];
      return {
        worldId: world.id,
        seed: world.seed,
        currentMoment: world.currentMoment,
        playerPersonId: summary.playerPersonId,
        turns,
        speakers: speakerIds.map((id) => ({
          id,
          traits: speakerTraits(world, id),
        })),
      };
    });
    expect(saved.turns).toHaveLength(3);
    await page.screenshot({ path: info.outputPath("04-return-and-save.png") });
    await info.attach("played-path", {
      body: JSON.stringify({ seed, place, path, saved, errors }, null, 2),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
  });
}
