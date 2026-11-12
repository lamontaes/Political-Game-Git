/**
 * Other states change laws in every year, each for a recorded reason (pool
 * item nation-other-states-change-laws-in-year-one-then-almost-never). In the
 * played world of a place drawn from all 56, four years: no year passes with
 * no state changing a law, the first year holds no more than half of the four
 * years' changes, and every change keeps what carried it onto its session's
 * agenda (a figure of that state that moved, new members, or the year before
 * the opening). The place and seed are in every message; replay with
 * AGENDA_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { LAWS_MODULE_ID, type LawRowInput } from "./modules/laws";
import { coreAPI } from "./state";

setBookkeeping(false);

const seed = process.env.AGENDA_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "outside-agenda");
const where = `${place.name} (${place.key}), seed ${seed}`;
const YEARS = 4;

describe(`other states' laws over ${YEARS} years (${where})`, () => {
  it("change in every year, not mostly in the first, each for a recorded reason", () => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const start = core.date;
    const seen = new Set<string>();
    const perYear: number[] = [];
    for (let year = 1; year <= YEARS; year += 1) {
      advanceCore(core, addDays(makeIsoDate(start), 365 * year));
      const changed = (
        api
          .moduleState(LAWS_MODULE_ID)
          .table("laws")
          .rows() as unknown as LawRowInput[]
      ).filter(
        (row) =>
          typeof row.terms?.session === "string" &&
          row.jurisdiction !== "US" &&
          !seen.has(row.id),
      );
      for (const row of changed) {
        seen.add(row.id);
        const terms = row.terms ?? {};
        expect(
          Boolean(terms.agenda) &&
            (Boolean(terms.moved) ||
              Number(terms.newMembers) > 0 ||
              Boolean(terms.carried)),
          `${where}: ${row.id} keeps no reason it was taken up`,
        ).toBe(true);
      }
      perYear.push(changed.length);
    }
    const total = perYear.reduce((a, b) => a + b, 0);
    console.log(
      `outside-agenda: ${where}; changes by year ${perYear.join(", ")}`,
    );
    for (const [index, count] of perYear.entries())
      expect(
        count,
        `${where}: no state changed a law in year ${index + 1} (${perYear.join(", ")})`,
      ).toBeGreaterThan(0);
    expect(
      perYear[0]! * 2,
      `${where}: the first year holds more than half of the changes (${perYear.join(", ")})`,
    ).toBeLessThanOrEqual(total);
  }, 3_600_000);
});
