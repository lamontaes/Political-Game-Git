/**
 * Ended office terms fold into their seat's past (pool item
 * core-long-run-election-and-term-rows-part-1-terms-fold; the CTO's ruling
 * of Nov 1, 23:40: a folded term is found by its id inside its seat's
 * summary). In the played world of a place drawn from all 56: another
 * place's seat seated three times keeps its serving and newest ended terms
 * as rows and folds the older ones, each still resolving by id through
 * `termById` as the whole row it was, in its seat's history and, for a
 * filled-in official, in their career; a seat that covers the town never
 * folds. The place and seed are in every message; replay with FOLD_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { findRecord } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  careerOf,
  OFFICES_MODULE_ID,
  seatHistoryOf,
  seatWinner,
  termById,
  termRecordCount,
  type TermRow,
} from "./modules/offices";
import { holderOf } from "./modules/officials";
import type { CoreState } from "./types";

setBookkeeping(false);

const seed = process.env.FOLD_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "offices-fold");
const { core } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const where = `${place.name} (${place.key}), seed ${seed}`;
const api = coreAPI(core);
const offices = api.moduleState(OFFICES_MODULE_ID);
const terms = offices.table("terms");

/** A serving term on a seat whose office does (or does not) cover the town. */
function servingSeat(coversTown: boolean): TermRow | undefined {
  return (terms.query("byStatus", ["serving"]) as unknown as TermRow[])
    .filter((term) => !term.seatId.startsWith("seat:US:"))
    .filter((term) => {
      const office = offices.table("offices").get(term.officeId) as
        { coversTown?: boolean } | undefined;
      return Boolean(office?.coversTown) === coversTown;
    })
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

/** Seats a new holder on the term's seat the next day, as an election's winner. */
function seatNext(c: CoreState, term: TermRow, n: number): string {
  advanceCore(c, addDays(makeIsoDate(c.date), 1));
  return seatWinner(coreAPI(c), {
    seatId: term.seatId,
    officeId: term.officeId,
    personId: null,
    identity: { ...term.identity, givenName: `${term.identity.givenName}${n}` },
    party: term.party,
    endDate: null,
    reached: `elected ${c.date}`,
    resultId: `test:${term.seatId}:${n}`,
    title: "the seat",
    winnerId: `official:${term.seatId}:${n}`,
    news: false,
  });
}

describe(`ended terms fold into their seat's past (${where})`, () => {
  it("folds another place's older ended terms, each still found by id, and never the town's", () => {
    const outside = servingSeat(false);
    const town = servingSeat(true);
    expect(outside, `${where}: no outside seat`).toBeDefined();
    expect(town, `${where}: no town seat`).toBeDefined();
    const first = outside!;
    const writes = termRecordCount(api);
    // The first winner is opened (a filled-in official): their term joins their career.
    const second = termById(api, seatNext(core, first, 1))!;
    const opened = holderOf(api, second);
    expect(
      opened.personId,
      `${where}: ${second.id} not filled in`,
    ).toBeTruthy();
    const third = seatNext(core, first, 2);
    const fourth = seatNext(core, first, 3);
    for (const id of [first.id, second.id]) {
      expect(terms.get(id), `${where}: ${id} still a row`).toBeUndefined();
      const folded = termById(api, id);
      expect(folded?.id, `${where}: ${id} stopped resolving`).toBe(id);
      expect(folded?.seatId, where).toBe(first.seatId);
      expect(folded?.status, where).toBe("ended");
      expect(folded?.endDate, `${where}: ${id} lost its end`).toBeTruthy();
    }
    expect(termById(api, first.id)?.identity, where).toEqual(first.identity);
    // Dev mode's trace finds a folded term inside its seat's summary.
    expect(
      findRecord(core, first.id)?.engine,
      `${where}: the trace lost ${first.id}`,
    ).toBe(`${OFFICES_MODULE_ID}.seatPasts`);
    expect(
      terms.get(third),
      `${where}: newest ended term folded`,
    ).toBeDefined();
    expect(terms.get(fourth), `${where}: serving term folded`).toBeDefined();
    expect(
      seatHistoryOf(api, first.seatId)
        .map((term) => term.id)
        .slice(-4),
      where,
    ).toEqual([first.id, second.id, third, fourth]);
    expect(
      careerOf(api, opened.personId!).map((term) => term.id),
      `${where}: the filled-in official's career`,
    ).toContain(second.id);
    // Every write is still counted: four seatings, two of them folded away.
    expect(termRecordCount(api), where).toBe(writes + 3);
    // The town's seat keeps every term as a row.
    const townFirst = town!;
    seatNext(core, townFirst, 1);
    seatNext(core, townFirst, 2);
    seatNext(core, townFirst, 3);
    expect(
      terms.get(townFirst.id),
      `${where}: a town seat's term folded`,
    ).toBeDefined();
    // Every folded term anywhere resolves by its own id to its own seat.
    for (const past of offices.table("seatPasts").rows() as unknown as {
      id: string;
      terms: { id: string }[];
    }[])
      for (const term of past.terms)
        expect(
          termById(api, term.id)?.seatId,
          `${where}: ${term.id} does not resolve`,
        ).toBe(past.id);
    console.log(
      `offices-fold: ${where}; ${first.seatId} folded ${first.id} and ${second.id}; town seat ${townFirst.seatId} kept`,
    );
  }, 600_000);
});
