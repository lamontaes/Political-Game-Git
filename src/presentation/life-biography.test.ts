import { describe, expect, it } from "vitest";

import { serializeWorld, deserializeWorld } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectLifeBiography } from "./life-biography";
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
    let created = playedChild("world39-journal-life");
    const moment = projectStoryMoment(created.world, created.playerPersonId);
    const option = moment.scene.options[0];
    if (option) {
      created = {
        ...created,
        world: chooseStoryOption(created.world, {
          personId: created.playerPersonId,
          scene: moment.scene,
          optionKey: option.key,
        }),
      };
    }
    const biography = projectLifeBiography(
      created.world,
      created.playerPersonId,
    );
    expect(biography.passages.length).toBeGreaterThan(0);
    expect(biography.passages[0]?.aspect).toBe("identity");
    expect(biography.passages[0]?.sentence).toMatch(/Maya Hale was born/);
    const text = biography.passages
      .map((passage) => passage.sentence)
      .join("\n");
    expect(text).not.toMatch(/you chose to/i);
    expect(text).not.toMatch(/proof-ledger|standing for membership/i);
    expect(text).not.toMatch(/because you felt|made you angry/i);
    expect(
      biography.passages.some((passage) => passage.aspect === "experience"),
    ).toBe(true);
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
    expect(
      biography.passages.some(
        (passage) =>
          passage.aspect === "performance" &&
          /holds the recorded role|Legislative staff/i.test(passage.sentence),
      ),
    ).toBe(true);
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
