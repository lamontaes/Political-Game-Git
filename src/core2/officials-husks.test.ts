import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { allOfficials, officialStance } from "./modules/officials";
import { coreAPI, personOrFillIn } from "./state";

// Another state's legislators are recorded husks until something opens them
// (owner, Nov 5: simulate from the people there, keep only the result,
// generate on demand): their sessions still read their rows, and opening one
// builds the same person every time.
const seed = process.env.OFFICIAL_HUSK_SEED ?? randomBytes(8).toString("hex");

describe(`other states' legislators are husks until opened (seed ${seed})`, () => {
  it("keeps them out of the people, reads their stance from the row, and builds one on open", () => {
    const place = drawPlace(`${seed}:0`, "official-husks");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    advanceCore(core, addDays(makeIsoDate(core.date), 5));
    const api = coreAPI(core);
    const husks = allOfficials(api).filter((row) => row.husk && !row.ended);
    expect(husks.length, `${where}: husks`).toBeGreaterThan(1000);
    for (const row of husks.slice(0, 50)) {
      expect(core.people.has(row.id), `${where}: ${row.id}`).toBe(false);
      expect(core.husks.has(row.id), `${where}: ${row.id}`).toBe(true);
    }
    // Their stance is read from the row, with no person behind it.
    const sample = husks[0]!;
    expect(
      officialStance(api, sample.id, "fiscal.graduated-income-tax"),
      where,
    ).not.toBeNull();
    // Opening one builds the person the seat was drawn with, once.
    const built = personOrFillIn(core, sample.id)!;
    expect(built.id, where).toBe(sample.id);
    expect(built.givenName, where).toBe(sample.husk!.identity.givenName);
    expect(built.birthDate, where).toBe(sample.husk!.identity.birthDate);
    expect(core.husks.has(sample.id), where).toBe(false);
    expect(personOrFillIn(core, sample.id), where).toBe(built);
  }, 900_000);
});
