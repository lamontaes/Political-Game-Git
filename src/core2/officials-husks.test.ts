import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  isOutsideOffice,
  OFFICES_MODULE_ID,
  type TermRow,
} from "./modules/offices";
import { allOfficials, officialOf, officialStance } from "./modules/officials";
import { coreAPI, personOrFillIn } from "./state";

// Another state's officials are names on their terms until something opens
// them (owner, Nov 5: simulate from the people there, keep only the result,
// generate on demand; CTO, Nov 18 13:44Z: outside sessions read their members
// without writing official rows): their sessions read their stance from the
// draw that would seat them, and opening one builds the same person once.
const seed = process.env.OFFICIAL_HUSK_SEED ?? randomBytes(8).toString("hex");

describe(`other states' officials are names on their terms until opened (seed ${seed})`, () => {
  it("keeps them out of the people, the husks and the official rows, reads their stance, and builds one on open", () => {
    const place = drawPlace(`${seed}:0`, "official-husks");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    advanceCore(core, addDays(makeIsoDate(core.date), 5));
    const api = coreAPI(core);
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const outside = (officeId: string) =>
      isOutsideOffice(api, offices.table("offices").get(officeId));
    const unopened = (
      offices
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]
    ).filter((term) => !term.personId && outside(term.officeId));
    expect(
      unopened.length,
      `${where}: unopened outside holders`,
    ).toBeGreaterThan(1000);
    // No outside holder is a row, a husk or a person after their sessions sat.
    expect(
      allOfficials(api)
        .filter((row) => {
          const seat = offices.table("seats").get(row.seatId) as unknown as
            { officeId: string } | undefined;
          return seat !== undefined && outside(seat.officeId);
        })
        .map((row) => row.id),
      `${where}: outside official rows`,
    ).toEqual([]);
    for (const term of unopened.slice(0, 50)) {
      const key = `official:${term.id}`;
      expect(core.people.has(key), `${where}: ${key}`).toBe(false);
      expect(core.husks.has(key), `${where}: ${key}`).toBe(false);
    }
    // Their stance is read from their draw, with no row behind it.
    const sample = unopened.find((term) => term.officeId.includes("lower"))!;
    const key = `official:${sample.id}`;
    const stance = officialStance(api, key, "fiscal.graduated-income-tax");
    expect(stance, where).not.toBeNull();
    expect(officialOf(api, key), where).toBeUndefined();
    // Opening one builds the person their term names, once, standing where
    // their session read them.
    const built = personOrFillIn(core, key)!;
    expect(built?.id, where).toBe(key);
    expect(built.givenName, where).toBe(sample.identity.givenName);
    expect(built.familyName, where).toBe(sample.identity.familyName);
    expect(built.birthDate, where).toBe(sample.identity.birthDate);
    expect(personOrFillIn(core, key), where).toBe(built);
    expect(officialStance(api, key, "fiscal.graduated-income-tax"), where).toBe(
      stance,
    );
  }, 900_000);
});
