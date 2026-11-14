/**
 * Officials elsewhere are built on demand (core-officials-elsewhere-built-as-
 * full-people-at-the-opening, first slice). Another state's seats keep their
 * serving term, with the holder's whole service on it, and no earlier terms
 * on day one: those are written the first time the holder is met or opened,
 * from the world's seed and the seat, so they are the same however late and
 * however often they are opened. A place drawn from all 56, named with its
 * seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import {
  OFFICES_MODULE_ID,
  openPastTerms,
  type TermRow,
} from "./modules/offices";
import { holderOf } from "./modules/officials";
import { setBookkeeping } from "./bookkeeping";
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";
import { openWholePast } from "./modules/people";

const seed = process.env.OFFICIALS_SEED ?? randomBytes(8).toString("hex");
/** Other states' seats opened in the test. */
const OPENED = 60;

const terms = (core: CoreState) =>
  coreAPI(core)
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[];

/** A term of another state's office: one the town's chain does not hold. */
function elsewhere(core: CoreState) {
  const api = coreAPI(core);
  const town = lawChain(api).stateKey;
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  return (term: TermRow) => {
    const office = offices.get(term.officeId) as unknown as
      { jurisdiction: string } | undefined;
    return (
      !!office?.jurisdiction.startsWith("US-") && office.jurisdiction !== town
    );
  };
}

it(`another state's officials keep no earlier terms until they are opened, then the same ones every time (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(seed, "officials-elsewhere");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const build = () =>
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core;
    const core = build();
    const outside = elsewhere(core);
    const dayOne = terms(core).filter(outside);
    const serving = dayOne.filter((t) => t.status === "serving");
    expect(
      serving.length,
      `${where}: no other state's seat is held`,
    ).toBeGreaterThan(0);
    // Day one: no earlier term of another state's seat is written.
    const ended = dayOne.filter((t) => t.status === "ended");
    expect(
      ended.map((t) => t.id).slice(0, 5),
      `${where}: ${ended.length} earlier terms of other states' seats on day one`,
    ).toEqual([]);
    // Opening holders writes their earlier terms; a long career has some.
    const api = coreAPI(core);
    const sample = [...serving]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, OPENED);
    // Opened as the card opens anyone: their whole past, which for an official
    // from elsewhere holds the earlier terms of their seat.
    for (const term of sample)
      openWholePast(core, holderOf(api, term).personId as PersonId);
    const past = (c: CoreState) =>
      terms(c)
        .filter(
          (t) =>
            t.status === "ended" &&
            sample.some((s) => t.id.startsWith(`${s.id}:past:`)),
        )
        .map((t) => `${t.id} ${t.startDate} ${t.endDate}`)
        .sort();
    const written = past(core);
    expect(
      written.length,
      `${where}: no opened holder has an earlier term`,
    ).toBeGreaterThan(0);
    // Each earlier term is the holder's own: their seat, their name, their service.
    const byId = new Map(sample.map((t) => [t.id, t]));
    for (const row of terms(core).filter((t) => t.id.includes(":past:"))) {
      const own = byId.get(row.id.slice(0, row.id.indexOf(":past:")));
      if (!own) continue;
      expect(row.seatId, `${where}: ${row.id}`).toBe(own.seatId);
      expect(row.identity.familyName, `${where}: ${row.id}`).toBe(
        own.identity.familyName,
      );
      expect(
        row.endDate! <= own.startDate,
        `${where}: ${row.id} ends after the serving term began`,
      ).toBe(true);
    }
    // Opening again changes nothing.
    for (const term of sample) openPastTerms(api, term.id);
    expect(past(core), where).toEqual(written);
    // Another world on the same seed, opened a month later, has the same terms.
    const later = build();
    advanceCore(later, addDays(makeIsoDate(later.date), 30));
    for (const term of sample) {
      const row = coreAPI(later)
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(term.id) as unknown as TermRow | undefined;
      if (row) openPastTerms(coreAPI(later), row.id);
    }
    expect(past(later), where).toEqual(written);
    process.stdout.write(
      `OFFICIALS ELSEWHERE ${where}: ${terms(build()).length} term rows on day one; ${serving.length} other states' serving terms, 0 earlier; ${sample.length} opened wrote ${written.length} earlier terms, the same a month later\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
