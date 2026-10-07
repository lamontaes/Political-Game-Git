import type { BrowserSaveStore as SaveStore } from "../../src/presentation/browser-world-repository";
import { expect, test } from "./fixtures";
import { enterLife, goTo, saveLife, startLife } from "./support/creator";
import { SeededRng } from "../../src/simulation/rng";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";

// Golden step 2: actual eighteen-year-old arrivals through the normal creator.
// The draw chooses a place, never an actor's decision or scene outcome.
const draw = new SeededRng("session4-live-place-block-one");
const state = draw.pick(lifePlaceStateIdentities());
const place = draw.pick(
  searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  }),
);
test.use({ video: "on", viewport: { width: 1440, height: 900 } });

for (const character of ["Avery", "Jordan"])
  test(`golden step 2 shared scene ${character} ${place.key}`, async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    await page.goto(`/?seed=session4-golden-two:${place.key}:${character}`);
    await startLife(page, {
      age: 18,
      givenName: character,
      familyName: "Morgan",
      state: state.name,
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
    await meeting.click();
    await page.getByTestId("calendar-play-event").click();
    const scene = page.getByTestId("scene-conversation");
    await expect(scene).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("ordinary-meeting-panel")).toHaveCount(0);
    await expect(scene.getByTestId("talk-lie-toggle")).toBeEnabled();
    await page.screenshot({ path: info.outputPath("actual-arrival.png") });
    const spoken = scene
      .getByTestId("scene-record-reply")
      .filter({
        hasText:
          /^(What do you think|Can we talk|Let's discuss|I'd like to hear)/,
      })
      .first();
    const words = await spoken.innerText();
    if (character === "Jordan") {
      await spoken.focus();
      await page.keyboard.press("Enter");
    } else await spoken.click();
    await expect(scene.getByTestId("talk-you")).toHaveText(words);
    await expect(scene.getByTestId("talk-reply")).toBeVisible();
    await page.screenshot({ path: info.outputPath("actual-exchange.png") });
    await scene.getByRole("button", { name: "History", exact: true }).click();
    await expect(scene.getByTestId("talk-you")).toHaveText(words);
    await scene
      .getByRole("button", { name: "Return to the room", exact: true })
      .click();
    await expect(scene).toHaveCount(0);
    await saveLife(page);
    const saved = await page.evaluate(async () => {
      const storePath = "/src/presentation/browser-world-repository.ts";
      const traitsPath = "/src/presentation/speaker-traits.ts";
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      const { speakerTraits } = await import(/* @vite-ignore */ traitsPath);
      const store: SaveStore = new BrowserSaveStore();
      const shelf = await store.list();
      if (shelf.saves.length !== 1)
        throw new Error("Expected the player's one actual saved life.");
      const summary = shelf.saves[0]!;
      const world = await store.inspectSnapshot(summary.saveId);
      if (!world) throw new Error("The actual save could not be inspected.");
      const turns = world.history.events.filter((event) =>
        event.tags.includes("scene.composed-turn"),
      );
      const turn = turns.at(-1);
      if (!turn) throw new Error("The played turn did not reach the save.");
      const counterpart = turn.participants.find(
        (person) =>
          person.personId !== summary.playerPersonId &&
          person.role === "coordination:counterpart",
      )?.personId;
      return {
        worldId: world.id,
        seed: world.seed,
        currentMoment: world.currentMoment,
        playerPersonId: summary.playerPersonId,
        counterpartPersonId: counterpart ?? null,
        turnEventId: turn.id,
        words: turn.context.choice,
        reply: turn.context.immediateReaction,
        playerTraits: speakerTraits(world, summary.playerPersonId),
        counterpartTraits: counterpart
          ? speakerTraits(world, counterpart)
          : null,
        sources: turn.tags.filter((tag) =>
          tag.startsWith("english.source-records.v1:"),
        ),
      };
    });
    expect(saved.words).toBe(words);
    expect(saved.counterpartPersonId).not.toBeNull();
    // Preserve the actual saved exchange before a failing Continue can prevent
    // evidence attachment. No replacement facts or synthetic save are inserted.
    await info.attach("observed-exchange", {
      body: JSON.stringify({ character, place, state, words, saved }, null, 2),
      contentType: "application/json",
    });
    const snapshot = await page.evaluate(async () => {
      const storePath = "/src/presentation/browser-world-repository.ts";
      const serializationPath = "/src/simulation/serialization.ts";
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      const { createWorldSnapshot, serializeWorldSnapshotPayload } =
        await import(/* @vite-ignore */ serializationPath);
      const store: SaveStore = new BrowserSaveStore();
      const summary = (await store.list()).saves[0]!;
      const world = await store.inspectSnapshot(summary.saveId);
      if (!world) throw new Error("Actual save snapshot was unavailable.");
      return {
        summary,
        payload: serializeWorldSnapshotPayload(createWorldSnapshot(world)),
      };
    });
    await info.attach("actual-saved-world-before-continue", {
      body: JSON.stringify(snapshot),
      contentType: "application/json",
    });
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await expect(page.getByTestId("shell-nav-cluster")).toHaveAttribute(
      "aria-label",
      /January 6, 2026/,
    );
  });
