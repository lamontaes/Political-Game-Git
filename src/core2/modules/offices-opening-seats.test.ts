/**
 * The opening's elected local seats go to the best suited over the whole
 * town, counted adults included, not to the player's own family (pool item
 * gov-opening-seats-go-to-the-players-own-family). Ten places are drawn from
 * all 56; in at most one does anyone in the player's household hold an
 * elected local seat at the opening, and in none do two. Every seated
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

setBookkeeping(false);

const base = process.env.OPENING_SEATS_SEED ?? randomBytes(8).toString("hex");
const PLACES = 10;

describe(`the opening's local seats over ${PLACES} drawn places (seed ${base})`, () => {
  it("rarely go to the player's own household, and never two of them", () => {
    const rows: { where: string; seats: number; family: number }[] = [];
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
      rows.push({ where, seats: local.length, family });
    }
    const said = rows
      .map((row) => `${row.where}: ${row.family} of ${row.seats} seats`)
      .join("; ");
    appendFileSync(
      process.env.OPENING_SEATS_LOG ?? "/dev/null",
      `\nopening-seats (${base}): ${said}`,
    );
    expect(
      rows.filter((row) => row.family >= 2).map((r) => r.where),
      said,
    ).toEqual([]);
    expect(
      rows.filter((row) => row.family >= 1).length,
      said,
    ).toBeLessThanOrEqual(1);
  }, 3_600_000);
});
