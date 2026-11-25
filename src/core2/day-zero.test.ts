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
   * warm-up window held no death). The table must be empty there, and
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
        // The world the New game route builds: the warm-up days before the start run first.
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
        if (
          row.table === "place-prices.felt" &&
          row.zeroAtPlaces?.includes(place.placeKey)
        ) {
          // A household feels a law in its bill only through a price rule a law set (place-prices.ts
          // `month`): the table is empty here because no price rule is in force.
          expect(
            coreAPI(world.core)
              .moduleState("place-prices")
              .table("rules")
              .rows(),
            `${place.name}: ${row.table} is empty because no price rule is in force`,
          ).toEqual([]);
        } else if (
          row.table === "place-prices.learned" &&
          row.zeroAtPlaces?.includes(place.placeKey)
        ) {
          // A person ties a price change to a law only when they heard a story about the very law that
          // changed their bill (place-prices.ts `learnFromLaw`). The table is empty here because no one
          // who paid under a law heard of it: either no price rule is in force (nothing was paid) or the
          // laws people heard about are not the ones that moved their bills.
          const prices = coreAPI(world.core).moduleState("place-prices");
          const heard = new Set(
            (
              prices.table("heardLaws").rows() as {
                personId: string;
                lawId: string;
              }[]
            ).map((h) => `${h.personId}|${h.lawId}`),
          );
          expect(
            (
              prices.table("felt").rows() as {
                payerId: string;
                lawId: string;
              }[]
            ).filter((f) => heard.has(`${f.payerId}|${f.lawId}`)),
            `${place.name}: ${row.table} is empty because no one who paid under a law heard of it`,
          ).toEqual([]);
        } else if (row.zeroAtPlaces?.includes(place.placeKey)) {
          // A place whose vacancies table is empty at day 0 (`zeroAtPlaces`) is one where no one who
          // died in the warm-up window held a seat the offices engine keeps (a seat falls vacant
          // only when its holder dies, offices.ts `life.death`); a cabinet post is refilled by
          // `refillCabinet` (succession.ts). Illnesses are in progress on day one.
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
