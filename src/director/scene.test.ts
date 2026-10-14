import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { openConversation } from "./conversation";
import { createDirector } from "./ledger";
import { composeScene } from "./scene";

// M4-03, scenes: when the director stages a moment, the scene is built from
// the place, the people the records put there and the moment's cause,
// narrated in second person, and opens a conversation with someone present.
const seed = process.env.GOLDEN_PATH_SEED ?? "scenes-a";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 600,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 18 &&
    age(person.birthDate) <= 30,
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-02-15");

describe(`scenes in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("builds each staged scene from its records, in second person, and opens a conversation", () => {
    let scenes = 0;
    let talks = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        // Mined narration: where you are and who is there, when the bank
        // words that setting; never in the first person.
        expect(scene.narration.length).toBeGreaterThan(0);
        for (const line of scene.narration) {
          expect(line.text).not.toMatch(/\b(I|my|me)\b/);
          expect(line.sourceRecordIds.length).toBeGreaterThan(0);
        }
        // Only people the records put there are present.
        for (const id of scene.presentIds)
          expect(core.people.has(id)).toBe(true);
        if (scene.talkToId) {
          expect(scene.presentIds).toContain(scene.talkToId);
          const talk = openConversation(core, book.personId, scene.talkToId);
          // A pair whose only subject the mined bank cannot ask about yet
          // (home) opens no conversation; any other opens with choices.
          if (talk.lines.length) {
            // Several distinct answers; four where the bank words four.
            expect(talk.choices.length).toBeGreaterThan(1);
            talks += 1;
          }
        }
        scenes += 1;
      }
    expect(scenes).toBeGreaterThan(0);
    expect(talks).toBeGreaterThan(0);
  });

  it("plays a moment no situation type binds, at home, instead of failing", () => {
    for (const book of director.ledger.people.values()) {
      const entry = book.schedule.find((row) => !row.bindings.length);
      if (!entry) continue;
      const scene = composeScene(core, director, book.personId, entry)!;
      expect(scene.setting.kind).toBe("home");
      expect(scene.narration.length).toBeGreaterThan(0);
      return;
    }
  });
});
