/**
 * A running mate's filing states its governor candidate's platform
 * (`nameRunningMate` copies it into the ticket's filing), not a second choice
 * by the rule. Drawn (CTO, Nov 17: tests draw their place; it was pinned to
 * Leeds Point NJ, played from the game's start to its 2025 filing): the draw
 * takes only localities in states whose law elects the lieutenant governor on
 * the governor's ticket (`electedWithGovernorOnTicket`, from the offices
 * data), opens the world on January 2, 2026, the year most governors are
 * elected, and plays a day at a time until a running mate's filing states a
 * platform or the end of September. A place with none is passed over and
 * named. The year-long calibration that reads every platform of a year is
 * campaign-platform-played.test.ts, run on purpose with
 * `npm run test:calibration`. GOLDEN_PATH_SEED replays one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type FilingRow } from "./modules/elections";
import { electedWithGovernorOnTicket } from "./modules/offices";
import { placeLocalities, placeStateKeys } from "./places";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const OPEN = "2026-01-02";
const LAST = "2026-09-30";
const DRAWS = 4;
const onTicket = new Set(
  placeStateKeys()
    .filter((state) =>
      electedWithGovernorOnTicket(state, "lieutenant-governor"),
    )
    .flatMap((state) => placeLocalities(state).map((row) => row.key)),
);

it(`a running mate's filing carries its governor candidate's platform (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let i = 0; i < DRAWS; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "running-mate-platform", (key) =>
        onTicket.has(key),
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, makeIsoDate(OPEN), {
        twoLevel: true,
        placeKey: place.key,
      });
      const filings = coreAPI(core)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings");
      const matesNow = () =>
        (filings.rows() as unknown as FilingRow[]).filter(
          (f) => f.ticketWith && f.platform.length,
        );
      while (core.date < LAST && !matesNow().length)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const mates = matesNow();
      if (!mates.length) {
        passed.push(`${where}: no running mate filed by ${LAST}`);
        continue;
      }
      for (const mate of mates) {
        const governor = filings.get(mate.ticketWith!) as unknown as
          FilingRow | undefined;
        if (!governor)
          throw new Error(
            `${where}: running mate ${mate.id} names ticket ${mate.ticketWith}, which is no filing`,
          );
        expect(
          mate.platform,
          `${where}: running mate ${mate.id} copies ${governor.id}'s platform`,
        ).toEqual(governor.platform);
      }
      console.log(
        `running mate: ${where}: ${mates.length} running mate filing(s) by ${core.date}, each with its governor's platform; passed over: ${passed.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a running mate file; passed over: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
