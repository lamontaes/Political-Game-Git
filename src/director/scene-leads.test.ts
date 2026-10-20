import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
import { createDirector } from "./ledger";
import { composeScene, SCENE_WORDS } from "./scene";

// Owner, Oct 15 evening: the narrator sets the scene in a few sentences. The
// sentence about what is happening comes from the staged situation's type,
// drawn from the English engine's parts and the scene's own records.
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
const withoutLeads = { ...SCENE_WORDS, leads: [] };
const where = `${base.placeMetadata?.placeName}, seed ${seed}`;

// The sentence about what is happening is hand-written in scene-words.json,
// and the owner ruled (Oct 6, EN-1 to EN-3) that no text the English engine
// did not write ships. Those leads are held (words-authored-parts-shippable-
// sweep), so a scene is set by the narrator's mined and composed sentences
// alone until the engine writes the leads (pool item words-scene-situation-
// leads). Until then no scene may carry a lead, and every scene still cites
// its records.
describe(`situation leads in ${where}`, () => {
  it("adds no lead while every lead is hand-written, and still cites records in each scene", () => {
    expect(
      SCENE_WORDS.leads.filter((row) => row.variants.length),
      "leads with shippable variants",
    ).toEqual([]);
    let scenes = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        const plain = composeScene(
          core,
          director,
          book.personId,
          entry,
          withoutLeads,
        )!;
        scenes += 1;
        const text = scene.narration.map((line) => line.text).join(" ");
        expect(text, scene.momentId).toBe(
          plain.narration.map((line) => line.text).join(" "),
        );
        expect(text, scene.momentId).not.toMatch(/\{\{|\}\}|undefined/);
        expect(
          scene.narration.flatMap((line) => line.sourceRecordIds).length,
          scene.momentId,
        ).toBeGreaterThan(0);
      }
    expect(scenes, where).toBeGreaterThan(0);
  }, 600_000);

  it("stages a funeral for the one who watched, without naming the person who died or showing a hand-written line", () => {
    const watched = [...director.ledger.people.keys()]
      .map((id) => core.people.get(id)!)
      .find((row) => row.alive && [...row.knownIds].length > 2)!;
    const dead = [...watched.knownIds]
      .map((id) => core.people.get(id)!)
      .find((row) => row.alive && row.tier !== "husk")!;
    applyCoreEvent(core, {
      id: `life.death:${dead.id}:${core.date}`,
      date: core.date,
      kind: "life.death",
      personIds: [dead.id],
      witnessIds: [watched.id],
      placeId: watched.placeId,
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
    const funeral = director.ledger.people
      .get(watched.id)!
      .schedule.filter((row) =>
        row.bindings.some((bound) => bound.typeKey === "funeral"),
      )
      .map((row) => composeScene(core, director, watched.id, row)!);
    expect(funeral.length, where).toBeGreaterThan(0);
    for (const scene of funeral) {
      const text = scene.narration.map((line) => line.text).join(" ");
      expect(scene.typeKey, where).toBe("funeral");
      // The scene's own records stand behind it.
      expect(
        scene.narration.flatMap((line) => line.sourceRecordIds).length,
        where,
      ).toBeGreaterThan(0);
      // Never the one who died, and no hand-written lead about the gathering.
      expect(text, where).not.toContain(dead.givenName);
      expect(text, where).not.toMatch(/goodbye/);
    }
  }, 600_000);
});
