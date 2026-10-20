import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
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
          // With nothing mined to say, they greet and say goodbye.
          if (!talk.choices.length)
            expect(talk.lines.at(-1)?.kind).toBe("farewell");
        }
        scenes += 1;
      }
    expect(scenes).toBeGreaterThan(0);
    expect(narrated).toBeGreaterThan(0);
  });

  it("stages a family scene in the watched person's own household, with only the people the records put there", () => {
    // A death in the household is a family scene for the others at home.
    const home = [...director.ledger.people.keys()]
      .map((id) => core.people.get(id)!)
      .find(
        (row) =>
          row.alive &&
          (core.households.get(row.householdId)?.memberIds ?? []).filter(
            (id) => id !== row.id && core.people.get(id)?.alive,
          ).length > 1,
      )!;
    const dead = core.households
      .get(home.householdId)!
      .memberIds.find((id) => id !== home.id && core.people.get(id)?.alive)!;
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
    expect(homes).toBeGreaterThan(0);
  });

  it("opens each scene with one narrator paragraph of the engine's sentences, before anyone speaks", () => {
    let checked = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        if (!scene.narration.length) continue;
        // One paragraph, not two short lines.
        expect(scene.narration).toHaveLength(1);
        const text = scene.narration[0]!.text;
        const sentences = text.match(/[.!?](\s|$)/g);
        // The setting and who is there are composed by the engine. The
        // situation lead after them is hand-written and held (owner, Oct 6,
        // EN-1 to EN-3; pool item words-scene-situation-leads), so the
        // paragraph is the engine's sentences alone: whole, filled from the
        // scene's records, with no placeholder left in it.
        expect(sentences?.length ?? 0).toBeGreaterThanOrEqual(1);
        expect(text.trim()).toMatch(/[.!?]$/);
        expect(text).not.toMatch(/\{\{|\}\}|undefined/);
        expect(scene.narration[0]!.sourceRecordIds.length).toBeGreaterThan(0);
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
