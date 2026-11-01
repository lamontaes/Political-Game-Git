import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
import { familyFactsOf } from "../core2/closeness";
import { openConversation } from "./conversation";
import { createDirector } from "./ledger";
import { composeScene } from "./scene";

// M4-03, scenes: when the director stages a moment, the scene is built from
// the place, the people the records put there and the moment's cause,
// narrated in second person, and opens a conversation with someone present.
const seed = process.env.GOLDEN_PATH_SEED ?? "scenes-a";
const base = enrichCivicInputs(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 600,
  }),
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
// A death in the household is a family scene for the others at home: the
// world stages at least that one, wherever it is drawn. A quiet place has no
// other scene in its first weeks; its only moments are the family facts from
// before the start, which no scene type stages (Leonard, Texas, birth-n1).
// The one who loses a relative at home is watched: the first watched person
// who lives with one, else the first resident who does (a quiet draw's
// player may live alone, Leonard, Texas, birth-n1). Not a partner: a
// partner's death is a funeral at a venue.
const housemate = (id: string) => {
  const row = core.people.get(id as never);
  if (!row?.alive) return undefined;
  const home = core.households.get(row.householdId)?.memberIds ?? [];
  return [...familyFactsOf(row).entries()].find(
    ([other, fact]) =>
      fact.relation !== "partner" &&
      home.includes(other) &&
      core.people.get(other)?.alive,
  )?.[0];
};
const homeId =
  [...director.ledger.people.keys()].find((id) => housemate(id)) ??
  [...core.people.keys()].sort().find((id) => housemate(id))!;
director.watch(core, homeId as never);
const home = core.people.get(homeId as never)!;
const dead = housemate(homeId)!;
applyCoreEvent(core, {
  id: `life.death:${dead}:${core.date}`,
  date: core.date,
  kind: "life.death",
  personIds: [dead],
  witnessIds: [home.id],
  placeId: home.placeId,
  publicRecord: true,
  moodImpulse: -1,
  stressImpulse: 1,
  source: {
    tag: "SOURCED",
    citation: "A death as the health writer records it.",
    asOf: core.date,
  },
} as never);
advanceCore(core, "2021-02-20");

describe(`scenes in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("builds each staged scene from its records, in second person, and opens a conversation", () => {
    let scenes = 0;
    let narrated = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        // A line the mined bank has no sentence for is left out, so a scene
        // may narrate fewer lines.
        narrated += scene.narration.length;
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
          // With nothing on record to say, nothing is said: no hello and
          // goodbye with nothing between (owner, Oct 24: "that should be
          // going to the hi, have a good day. That makes no sense."). A talk
          // that said something and has nothing left ends with a goodbye.
          if (!talk.choices.length && talk.lines.length)
            expect(talk.lines.at(-1)?.kind).toBe("farewell");
        }
        scenes += 1;
      }
    expect(scenes).toBeGreaterThan(0);
    expect(narrated).toBeGreaterThan(0);
  });

  it("stages a family scene for a death, and a scene at home only in the watched person's own home with the people the records put there", () => {
    let homes = 0;
    for (const book of director.ledger.people.values()) {
      const own = core.people.get(book.personId)!.householdId;
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        if (scene.setting.kind !== "home") continue;
        homes += 1;
        // A home scene is the watched person's own home, not a neighbor's.
        expect(scene.setting.recordId, scene.momentId).toBe(own);
        // No roll call of the house: only the people the moment names.
        const named = new Set([
          ...(book.momentsById.get(entry.momentId)?.counterpartIds ?? []),
          ...(entry.bindings[0]?.roles.flatMap((row) => row.personIds) ?? []),
        ]);
        for (const id of scene.presentIds)
          if (id !== book.personId)
            expect(named.has(id), scene.momentId).toBe(true);
      }
    }
    // The death is a family scene for the one who lost a relative: a funeral
    // or a scene at home, staged from the death's record.
    const lost = director.ledger.people
      .get(homeId as never)!
      .schedule.find((row) => row.momentId.includes(`life.death:${dead}`));
    expect(lost?.bindings.length, `${homeId} lost ${dead}`).toBeGreaterThan(0);
    process.stdout.write(
      `SCENES ${base.placeMetadata?.placeName} (seed ${seed}): ${homes} scene(s) at home; the death of ${dead} is ${lost!.bindings.map((row) => `${row.typeKey} at ${row.setting.kind}`).join(", ")} for ${homeId}\n`,
    );
  });

  it("opens each scene with one narrator paragraph that never restates the day or the player's own home", () => {
    let checked = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        if (!scene.narration.length) continue;
        // One paragraph, not two short lines.
        expect(scene.narration).toHaveLength(1);
        const text = scene.narration[0]!.text;
        expect(text.match(/[.!?](\s|$)/g)?.length ?? 0).toBeGreaterThanOrEqual(
          1,
        );
        // The screen shows the day and the town (owner, Oct 26: "it shouldn't
        // say you're at home in Albion or it's Tuesday in November").
        expect(text).not.toMatch(
          /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/,
        );
        expect(text).not.toMatch(/\b(You're|You are) (at )?home\b/);
        checked += 1;
      }
    expect(checked).toBeGreaterThan(0);
  });

  it("plays a moment no situation type binds, at home, instead of failing", () => {
    for (const book of director.ledger.people.values()) {
      const entry = book.schedule.find((row) => !row.bindings.length);
      if (!entry) continue;
      const scene = composeScene(core, director, book.personId, entry)!;
      expect(scene.setting.kind).toBe("home");
      return;
    }
  });
});
