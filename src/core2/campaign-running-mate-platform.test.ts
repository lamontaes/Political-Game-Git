/**
 * A running mate's filing states its governor candidate's platform
 * (`nameRunningMate` copies it into the ticket's filing), not a second choice
 * by the rule. Pinned: Leeds Point NJ, which elects its lieutenant governor
 * on the governor's ticket, at a fixed place seed, played from the game's
 * start (January 20, 2025) to a week after the ticket's filing on 2025-06-03
 * (141 days). The year-long calibration that reads every platform of a year
 * is campaign-platform-played.test.ts, run on purpose with
 * `npm run test:calibration`.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type FilingRow } from "./modules/elections";

const PLACE = {
  key: "3439810",
  name: "Leeds Point",
  state: "NJ",
  seed: "5d1f7a0c4b2e9a63d8c1f0e7b3a49256c8d0e1f2a3b4c5d6e7f8091a2b3c4d5e",
} as const;
const DAYS = 141;

it("a running mate's filing carries its governor candidate's platform (Leeds Point NJ, pinned seed, played to the filing day)", () => {
  const where = `${PLACE.name}, ${PLACE.state} (${PLACE.key}), pinned place seed ${PLACE.seed}`;
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const end = addDays(makeIsoDate(core.date), DAYS);
  while (core.date < end) advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const mates = (filings.rows() as unknown as FilingRow[]).filter(
    (f) => f.ticketWith && f.platform.length,
  );
  expect(
    mates.length,
    `${where}: no running mate's filing stated a platform in ${DAYS} days`,
  ).toBeGreaterThan(0);
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
}, 300_000);
