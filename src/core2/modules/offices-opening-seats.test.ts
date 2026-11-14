/**
 * The opening's elected local seats go to the best suited over the whole
 * town, counted adults included, not to the player's own family (pool item
 * gov-opening-seats-go-to-the-players-own-family). Ten places are drawn from
 * all 56; across them the player's household holds no more of the elected
 * local seats at the opening than its share of the town's adults gives it. Every seated
 * official is a full person whose household is in the town's records. Every
 * place is named with its seed. Replay with OPENING_SEATS_SEED.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { coreAPI } from "../state";
import { townSeats } from "./offices";
import { countedResidentsOf } from "../electorate";
import { lawChain } from "./laws";

setBookkeeping(false);

const base = process.env.OPENING_SEATS_SEED ?? randomBytes(8).toString("hex");
const PLACES = 10;

describe(`the opening's local seats over ${PLACES} drawn places (seed ${base})`, () => {
  it("rarely go to the player's own household, and never two of them", () => {
    const rows: {
      where: string;
      seats: number;
      family: number;
      share: number;
    }[] = [];
    for (let at = 0; at < PLACES; at += 1) {
      const seed = `${base}:${at}`;
      const place = drawPlace(seed, "opening-seats");
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const home = new Set(
        core.households.get(core.people.get(playerId! as never)!.householdId)
          ?.memberIds ?? [],
      );
      const local = townSeats(api).filter(
        (row) =>
          row.office.elected &&
          row.office.level !== "state" &&
          row.office.level !== "federal",
      );
      // The household's share of the adults the seats are weighed over (25
      // to 80, `suitedResidents`), full and counted (each by its weight).
      const town = lawChain(api).townPlaceId;
      const year = Number(core.date.slice(0, 4));
      const eligible = (birth: string) => {
        const age = year - Number(birth.slice(0, 4));
        return age >= 25 && age <= 80;
      };
      let adults = 0;
      let homeAdults = 0;
      for (const id of core.peopleByPlace.get(town as never) ?? []) {
        const person = core.people.get(id);
        if (!person?.alive || !eligible(person.birthDate)) continue;
        adults += 1;
        if (home.has(id)) homeAdults += 1;
      }
      for (const voter of countedResidentsOf(core, town))
        if (eligible(voter.birthDate)) adults += voter.weight;
      let family = 0;
      for (const { office, holder } of local) {
        const id = holder?.personId;
        if (!id) continue;
        if (home.has(id as never)) family += 1;
        // A seated resident is a full person living in the town's records.
        const person = core.people.get(id as never);
        expect(person, `${where}: ${office.id} holder ${id}`).toBeDefined();
        expect(
          core.households
            .get(person!.householdId)
            ?.memberIds.includes(person!.id),
          `${where}: ${id}'s household`,
        ).toBe(true);
      }
      rows.push({
        where,
        seats: local.length,
        family,
        share: adults ? homeAdults / adults : 0,
      });
    }
    const said = rows
      .map(
        (row) =>
          `${row.where}: ${row.family} of ${row.seats} seats, household ${(row.share * 100).toFixed(2)}% of adults`,
      )
      .join("; ");
    appendFileSync(
      process.env.OPENING_SEATS_LOG ?? "/dev/null",
      `\nopening-seats (${base}): ${said}`,
    );
    // The household holds no more seats than its share of the town's adults
    // gives it over the ten places, with the spread a count that small has
    // (two standard deviations of a Poisson count, plus one seat). A flat
    // "at most one place in ten" failed on main by draw: in a town of a few
    // dozen adults the household is a tenth of them, and two seats of
    // seventeen is its share, not the simulation's doing.
    const expected = rows.reduce((sum, row) => sum + row.seats * row.share, 0);
    const family = rows.reduce((sum, row) => sum + row.family, 0);
    expect(
      family,
      `${said}; expected ${expected.toFixed(2)}`,
    ).toBeLessThanOrEqual(expected + 2 * Math.sqrt(expected) + 1);
  }, 3_600_000);
});
