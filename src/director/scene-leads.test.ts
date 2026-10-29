import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent } from "../core2/state";
import { createDirector } from "./ledger";
import { composeScene } from "./scene";
import { SCENE_WORDS } from "../english/scene-words";

// Owner, Oct 15 evening: the narrator sets the scene in a few sentences. The
// sentence about what is happening comes from the staged situation's type,
// drawn from the English engine's parts and the scene's own records.
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
const withoutLeads = { ...SCENE_WORDS, leads: [] };
const where = `${base.placeMetadata?.placeName}, seed ${seed}`;

describe(`situation leads in ${where}`, () => {
  it("adds a sentence for each staged scene whose type has one, citing records", () => {
    let withLead = 0;
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
        const text = scene.narration.map((line) => line.text).join(" ");
        const before = plain.narration.map((line) => line.text).join(" ");
        const has = SCENE_WORDS.leads.some(
          (row) => row.typeKey === scene.typeKey && row.variants.length,
        );
        if (text === before) continue;
        withLead += 1;
        expect(has, `${where}: ${scene.momentId}`).toBe(true);
        expect(text, scene.momentId).not.toMatch(/\{\{|\}\}|undefined/);
        expect(text, scene.momentId).not.toMatch(/\b(I|my|me)\b/);
        expect(
          scene.narration.flatMap((line) => line.sourceRecordIds).length,
        ).toBeGreaterThan(0);
      }
    // A year-old-world's scenes include at least one with a situation lead.
    expect(withLead, where).toBeGreaterThan(0);
  }, 600_000);

  it("sets a funeral: who has come to say goodbye, never the person who died", () => {
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
      expect(text, where).toMatch(/goodbye/);
      // The sentence about the gathering never names the one who died.
      const gathering = text
        .split(/(?<=[.!?])\s/)
        .find((row) => /goodbye/.test(row))!;
      expect(gathering, where).not.toContain(dead.givenName);
    }
  }, 600_000);
});
