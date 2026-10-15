import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
import { createDirector } from "./ledger";
import { composeScene } from "./scene";

// Owner, Oct 15 evening: the narrator sets the scene in a few sentences,
// then the characters play it out. Every scene
// the director staged opens with a paragraph built from its records.
// (M4-03, scenes: when the director stages a moment, the scene is built from
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

const FEELING =
  /\b(sad|angry|happy|afraid|scared|worried|nervous|anxious|proud|ashamed|grief|grieving|joy|joyful|furious|lonely)\b/i;

function check(scene: NonNullable<ReturnType<typeof composeScene>>) {
  const { paragraph, narration } = scene;
  expect(paragraph.text).toBe(narration.map((line) => line.text).join(" "));
  expect(paragraph.sourceRecordIds.length).toBeGreaterThan(0);
  expect(paragraph.text).not.toMatch(/\b(I|my|me)\b/);
  // Feelings only when a record carries one: none of these lines does.
  expect(paragraph.text).not.toMatch(FEELING);
  // Nobody says a date: the day is a weekday and a month.
  expect(paragraph.text).not.toMatch(/\b\d{1,4}\b/);
  // Where it is and what day it is, at least.
  expect(narration.length).toBeGreaterThanOrEqual(2);
}

describe(`narrator paragraphs in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("opens each staged scene with a paragraph that cites its records", () => {
    let scenes = 0;
    let sentences = 0;
    const types = new Map<string, number>();
    const longest: string[] = [];
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        check(scene);
        scenes += 1;
        sentences += scene.narration.length;
        types.set(scene.typeKey, (types.get(scene.typeKey) ?? 0) + 1);
        if (scene.narration.length >= 4) longest.push(scene.paragraph.text);
      }
    expect(scenes).toBeGreaterThan(0);
    // A few sentences, not two short lines.
    expect(sentences / scenes).toBeGreaterThanOrEqual(3);
    expect(longest.length).toBeGreaterThan(0);
    expect(types.size).toBeGreaterThan(0);
  }, 600_000);

  it("sets a funeral: the death in the circle, who is there and what is happening", () => {
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
    const book = director.ledger.people.get(watched.id)!;
    const funeral = book.schedule
      .filter((row) =>
        row.bindings.some((bound) => bound.typeKey === "funeral"),
      )
      .map((row) => composeScene(core, director, watched.id, row)!);
    expect(funeral.length).toBeGreaterThan(0);
    for (const scene of funeral) {
      check(scene);
      expect(scene.paragraph.text).toMatch(/goodbye/);
      // The person who died is never named as one of those who came.
      expect(scene.paragraph.text).not.toContain(dead.givenName);
      expect(scene.narration.length).toBeGreaterThanOrEqual(2);
    }
  }, 600_000);
});
