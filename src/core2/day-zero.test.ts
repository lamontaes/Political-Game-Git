/**
 * Day one is in motion (owner, Nov 14, 2026; skill day-one-in-motion). A world built at the opening
 * already has rows in every table `data/opening/day-zero.json` calls stock, at the town, state and
 * federal level (one simulation, one world). A stock table still empty is known-red and carries the
 * pool item that fixes it; the list only shrinks: a known-red table that has rows fails here until its
 * mark is removed. Two named places with fixed seeds, so the result never depends on a draw.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { healthReport } from "./modules/health";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../bench/world";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { recordProof } from "../bench/dev-proof";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

interface Row {
  table: string;
  level: string;
  call: "stock" | "flow-only" | "unsure";
  reason: string;
  knownRed?: string;
  /** Required only where a contest's filing window is open on the start date. */
  when?: "filing-window-open";
  /** The mark applies only at these place keys (a gap that depends on the place). */
  knownRedPlaces?: string[];
  /**
   * A place whose pinned seed holds none of this table's rows at the start and
   * should not: a true zero, not a gap (the vacancies table at a place whose
   * 31-day warm-up window held no death). The table must be empty there, and
   * the test below shows the cause.
   */
  zeroAtPlaces?: string[];
}
const file = JSON.parse(
  readFileSync(
    new URL("./data/opening/day-zero.json", import.meta.url),
    "utf8",
  ),
) as {
  pinnedPlaces: { name: string; placeKey: string; seed: string }[];
  rows: Row[];
};
const stock = file.rows.filter((row) => row.call === "stock");

describe("day zero: the world opens already running", () => {
  for (const place of file.pinnedPlaces) {
    it(`${place.name} (place ${place.placeKey}, seed ${place.seed.slice(0, 12)}): every stock table has rows, every known-red table is still empty`, () => {
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.placeKey,
        // The world the New game route builds: the 31 days before the start run first.
        warmUpDays: OPENING_WARMUP_DAYS,
      });
      const tables = recordProof(world.core).tables;
      const today = world.core.date;
      // A filing window is open on the start date at this place when one contest's window spans it.
      const windowOpen = coreAPI(world.core)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows()
        .some(
          (contest: { filingOpens?: string | null; filingDeadline?: string }) =>
            !!contest.filingOpens &&
            !!contest.filingDeadline &&
            contest.filingOpens <= today &&
            today <= contest.filingDeadline,
        );
      const empty: string[] = [];
      const fixed: string[] = [];
      for (const row of stock) {
        if (row.when === "filing-window-open" && !windowOpen) continue;
        // A part's table that nothing has written yet is absent from the proof: no rows.
        const rows = tables[row.table]?.rows ?? 0;
        if (row.zeroAtPlaces?.includes(place.placeKey)) {
          if (rows > 0)
            fixed.push(`${row.table}: has ${rows} rows; remove zeroAtPlaces`);
          continue;
        }
        const red =
          row.knownRed &&
          (!row.knownRedPlaces || row.knownRedPlaces.includes(place.placeKey));
        if (rows === 0 && !red)
          empty.push(`${row.table} (${row.level}): ${row.reason}`);
        if (rows > 0 && red)
          fixed.push(
            `${row.table}: has ${rows} rows; remove knownRed (${row.knownRed})`,
          );
      }
      for (const row of stock)
        if (row.zeroAtPlaces?.includes(place.placeKey)) {
          // The first premise here was "no one died in Lewiston's 31-day warm-up window, so its vacancies are empty".
          // It does not hold: two people died there (the Education Secretary and a press owner). A seat falls vacant
          // only when the person who held it dies (offices.ts, `life.death`), so the true zero is that neither held
          // a seat the offices engine keeps; the Secretary's post was refilled on 2025-01-19 by `refillCabinet`
          // (succession.ts). Illnesses are in progress on day one.
          const report = healthReport(world.core);
          const terms = coreAPI(world.core)
            .moduleState(OFFICES_MODULE_ID)
            .table("terms");
          const dead = (
            report.cases as { personId: string; deathEventId?: string }[]
          ).filter((c) => c.deathEventId);
          expect(
            dead
              .filter((c) => terms.query("byPerson", [c.personId]).length > 0)
              .map((c) => c.personId),
            `${place.name}: ${row.table} is empty because no one who died in the warm-up window held a seat`,
          ).toEqual([]);
          expect(
            (report.cases as { onsetEventId?: string }[]).filter(
              (c) => c.onsetEventId,
            ).length,
            `${place.name}: illnesses are in progress on day one`,
          ).toBeGreaterThan(0);
        }
      expect(
        empty,
        `${place.name}: empty at day 0, not marked known-red`,
      ).toEqual([]);
      expect(
        fixed,
        `${place.name}: fixed, so the known-red mark must go`,
      ).toEqual([]);
    }, 150_000);
  }
});
