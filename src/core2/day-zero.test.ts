/**
 * Day one is in motion (owner, Nov 14, 2026; skill day-one-in-motion). A world built at the opening
 * already has rows in every table `data/opening/day-zero.json` calls stock, at the town, state and
 * federal level (one simulation, one world). A stock table still empty is known-red and carries the
 * pool item that fixes it; the list only shrinks: a known-red table that has rows fails here until its
 * mark is removed. Two named places with fixed seeds, so the result never depends on a draw.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
