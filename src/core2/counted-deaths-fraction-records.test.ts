/**
 * A counted record that stands for less than one person does not stop the
 * month's illnesses (pool item core-counted-deaths-spearman-under-table).
 * Earlier deaths in a household leave its record standing for a fraction of
 * a person. The cohort loop in src/core2/births-counted.ts read a first
 * member under one person as "nothing is owed" and ended the month for the
 * whole place: from then on nobody fell ill, the debt grew by the month's
 * expectation each month, and the town's deaths ran under its table
 * (Spearman, Texas: 8.4 against about 9.4 per 1,000 a year). Staged here
 * through the game's own part death: half the counted households of one
 * pinned place are left standing for a twentieth of a person, then four
 * months are played, and illnesses must still begin every month.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedPartDeath, residentsRuntime } from "./modules/residents";
import type { PersonId } from "./types";
import { coreAPI } from "./state";

/** Pinned: San Isidro, Texas (place seed 92ca3f7f…), where the cohort fix was proved. */
const DRAW = "fam-b:0";
/** What a staged record is left standing for, in people. */
const LEFT = 0.05;
const MONTHS = 4;

interface CountsRow {
  readonly placeId: string;
  readonly date: string;
  readonly fellIll: readonly string[];
}

it("illnesses begin every month although half the counted records stand for a fraction of a person", () => {
  const was = setBookkeeping(true);
  try {
    const place = drawPlace(DRAW, "relative-news");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const store = residentsRuntime(core)!.store;
    let staged = 0;
    let index = 0;
    for (const h of store.households) {
      const weight = store.weightOf(h);
      const first = store.countedMembers(h)[0];
      if (h.gone || first === undefined || weight < 1 + LEFT) continue;
      index += 1;
      if (index % 2 === 0) continue;
      if (countedPartDeath(core, store.ids[first]! as PersonId, weight - LEFT))
        staged += 1;
    }
    expect(staged, `${where}: records staged to a fraction`).toBeGreaterThan(
      10,
    );
    advanceCore(core, addDays(makeIsoDate(core.date), MONTHS * 30 + 5));
    const rows = coreAPI(core)
      .moduleState("core2-renewal-v1")
      .table("counts")
      .rows() as unknown as CountsRow[];
    const months = [...new Set(rows.map((row) => row.date))].sort();
    expect(months.length, `${where}: months played`).toBeGreaterThanOrEqual(
      MONTHS,
    );
    for (const month of months) {
      const fell = rows
        .filter((row) => row.date === month)
        .reduce((n, row) => n + row.fellIll.length, 0);
      expect(fell, `${where}: illnesses begun in ${month}`).toBeGreaterThan(0);
    }
  } finally {
    setBookkeeping(was);
  }
}, 300_000);
