import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { allOfficials, officialOf, officialStance } from "./modules/officials";
import {
  isOutsideOffice,
  OFFICES_MODULE_ID,
  type TermRow,
} from "./modules/offices";
import { coreAPI, personOrFillIn } from "./state";
import type { PersonId } from "./types";

// Another state's legislators are drawn from their seat until something opens
// them (owner, Nov 5: simulate from the people there, keep only the result,
// generate on demand). Reading their chamber writes no person, husk or row;
// their stance is read from the seat's draw; opening one builds that person
// and their official row, the same person every time. On the code before
// this (every session seated its whole chamber), the unseated count below
// fails: the chambers were seated within the first days.
const seed = process.env.OFFICIAL_HUSK_SEED ?? randomBytes(8).toString("hex");

describe(`other states' legislators are drawn from their seat until opened (seed ${seed})`, () => {
  it("keeps them out of the people and the rows, reads their stance from the seat, and builds one on open", () => {
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
    const outside = (
      offices
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]
    ).filter((term) => {
      const office = offices.table("offices").get(term.officeId) as unknown as
        { kind: string } | undefined;
      return (
        office?.kind.startsWith("legislature-") && isOutsideOffice(api, office)
      );
    });
    // Reading their chambers seated none of them.
    expect(
      outside.filter((term) => term.personId).map((term) => term.id),
      `${where}: outside legislators seated`,
    ).toEqual([]);
    const unseated = outside;
    expect(
      unseated.length,
      `${where}: unseated outside legislators`,
    ).toBeGreaterThan(1000);
    const rows = new Set(allOfficials(api).map((row) => row.id));
    for (const term of unseated.slice(0, 50)) {
      const id = `official:${term.id}`;
      expect(core.people.has(id as PersonId), `${where}: ${id}`).toBe(false);
      expect(core.husks.has(id as PersonId), `${where}: ${id}`).toBe(false);
      expect(rows.has(id), `${where}: ${id}`).toBe(false);
    }
    // Their stance is read from the seat's draw, with no person or row behind it.
    const id = `official:${unseated[0]!.id}`;
    expect(
      officialStance(api, id, "fiscal.graduated-income-tax"),
      where,
    ).not.toBeNull();
    const drawn = officialOf(api, id)!;
    expect(drawn.husk, where).toBeDefined();
    // Opening one builds the person the seat was drawn with, and their row, once.
    const built = personOrFillIn(core, id as PersonId)!;
    expect(built.id, where).toBe(id);
    expect(built.givenName, where).toBe(drawn.husk!.identity.givenName);
    expect(built.birthDate, where).toBe(drawn.husk!.identity.birthDate);
    expect(
      allOfficials(api).some((row) => row.id === id),
      `${where}: ${id} has a row once opened`,
    ).toBe(true);
    expect(officialOf(api, id)!.ideal, where).toBe(drawn.ideal);
    expect(core.husks.has(id as PersonId), where).toBe(false);
    expect(personOrFillIn(core, id as PersonId), where).toBe(built);
    process.stdout.write(
      `OFFICIAL-HUSKS ${where}: ${unseated.length} outside legislators unseated after five days; opened ${id}\n`,
    );
  }, 900_000);
});
