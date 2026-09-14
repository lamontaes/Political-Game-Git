import { describe, expect, it } from "vitest";

import { serializeWorld, deserializeWorld } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectLifeBiography } from "./life-biography";

/** Wording that describes the save instead of telling the life. */
const DATABASE_WORDING =
  /\brecorded\b|in this save|the character\b|proof[- ]ledger|holds the role/i;

function accountText(
  biography: ReturnType<typeof projectLifeBiography>,
): string {
  return biography.passages.map((passage) => passage.sentence).join("\n");
}

function playBeats(
  created: ReturnType<typeof playedChild>,
  count: number,
): ReturnType<typeof playedChild> {
  let current = created;
  for (let index = 0; index < count; index += 1) {
    const moment = projectStoryMoment(current.world, current.playerPersonId);
    const option = moment.scene.options[0];
    if (!option) break;
    current = {
      ...current,
      world: chooseStoryOption(current.world, {
        personId: current.playerPersonId,
        scene: moment.scene,
        optionKey: option.key,
      }),
    };
  }
  return current;
}
import { projectStoryMoment, chooseStoryOption } from "./life-story";

function playedChild(seed: string) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startKind: "custom",
    placeKey: "lexington-fayette",
    startAge: 9,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    questionnaire: "skipped",
    givenName: "Maya",
    familyName: "Hale",
  });
}

describe("Journal biographical account", () => {
  it("opens with identity and lived choices, not You chose to", () => {
    const created = playBeats(playedChild("world39-journal-life"), 1);
    const biography = projectLifeBiography(
      created.world,
      created.playerPersonId,
    );
    expect(biography.passages.length).toBeGreaterThan(0);
    expect(biography.passages[0]?.aspect).toBe("identity");
    expect(biography.passages[0]?.sentence).toMatch(
      /^You were born on [A-Z][a-z]+ \d{1,2}, \d{4}, and live in Lexington, Kentucky\.$/,
    );
    const text = accountText(biography);
    expect(text).not.toMatch(/you chose to/i);
    expect(text).not.toMatch(/proof-ledger|standing for membership/i);
    expect(text).not.toMatch(/because you felt|made you angry/i);
    expect(text).not.toMatch(DATABASE_WORDING);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(
      biography.passages.some((passage) => passage.aspect === "experience"),
    ).toBe(true);
  });

  it("tells several played beats as one account grouped by year, in order", () => {
    const created = playBeats(playedChild("world39-journal-beats"), 4);
    const biography = projectLifeBiography(
      created.world,
      created.playerPersonId,
    );
    const experiences = biography.passages.filter(
      (passage) => passage.aspect === "experience",
    );
    expect(experiences.length).toBeGreaterThanOrEqual(3);
    expect(experiences.every((passage) => /^You /.test(passage.sentence))).toBe(
      true,
    );
    const dates = biography.passages.map((passage) => passage.at);
    expect([...dates].sort()).toEqual(dates);
    expect(biography.chapters.length).toBeGreaterThanOrEqual(2);
    expect(biography.chapters[0]?.year).toBe(
      created.world.people[created.playerPersonId]!.birthDate.slice(0, 4),
    );
    expect(biography.chapters.flatMap((chapter) => chapter.passages)).toEqual(
      biography.passages,
    );
    const last = biography.chapters[biography.chapters.length - 1]!;
    expect(last.heading).toMatch(/^\d{4}, age \d+$/);
    expect(last.passages.length).toBeGreaterThanOrEqual(3);
    expect(accountText(biography)).not.toMatch(DATABASE_WORDING);
  });

  it("separates intention from performance for expected versus held work", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "world39-journal-office",
      placeKey: "kentucky",
      startAge: 38,
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      household: "shares-a-home",
      questionnaire: "skipped",
      givenName: "Maya",
      familyName: "Hale",
    });
    const biography = projectLifeBiography(
      created.world,
      created.playerPersonId,
    );
    const aspects = new Set(
      biography.passages.map((passage) => passage.aspect),
    );
    expect(aspects.has("identity")).toBe(true);
    const work = biography.passages.find(
      (passage) =>
        passage.aspect === "performance" &&
        /Legislative staff/i.test(passage.sentence),
    );
    expect(work?.sentence).toMatch(
      /^You have worked as Legislative staff at .+ since [A-Z][a-z]+ \d{4}\.$/,
    );
    const text = accountText(biography);
    expect(text).not.toMatch(DATABASE_WORDING);
    // A summarized earlier life ends school work without narrating the
    // engine's reason for the record.
    const ended = biography.passages.find((passage) =>
      passage.key.startsWith("work-ended:"),
    );
    expect(ended?.sentence).toMatch(
      /^Your work as .+ ended in [A-Z][a-z]+ \d{4}\.$/,
    );
    expect(ended?.sentence).not.toMatch(/did not follow|the character/);
  });

  it("keeps the account identical after save and does not invent other people's private views", () => {
    const created = playedChild("world39-journal-save");
    const first = projectLifeBiography(created.world, created.playerPersonId);
    const restored = deserializeWorld(serializeWorld(created.world));
    expect(projectLifeBiography(restored, created.playerPersonId)).toEqual(
      first,
    );
    const text = first.passages.map((passage) => passage.sentence).join("\n");
    expect(text).not.toMatch(/private motive|secret anger/i);
  });
});
