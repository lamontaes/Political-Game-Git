import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
import { familyFactsOf } from "../core2/closeness";
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
