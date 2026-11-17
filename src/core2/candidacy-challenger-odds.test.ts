/**
 * A challenger's odds against a sitting holder come from the seat's own last
 * race, not one fixed number (pool item
 * elections-a-persons-read-of-their-chance-cannot-move-who-runs, the 0.15 at
 * the challenger's odds; History's family 9c plan, CTO Nov 17). In the played
 * world, in places drawn from all 56 (NATION_SEED replays): once a general
 * election has been counted, the holder of each counted local seat is weighed
 * as a challenger's opponent, and the odds fall as the holder's last winning
 * lead rises, with more than one value across the town's seats. Places with
 * fewer than two counted seats are named and passed over.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { challengerOdds } from "./modules/candidacy";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { seatLastMargin } from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
const WANT_PLACES = 3;

describe(`a challenger's odds follow the seat's last race (seed ${seed})`, () => {
  it(
    "fall as the holder's last winning lead rises",
    { timeout: 3_600_000 },
    () => {
      setBookkeeping(false);
      const passed: string[] = [];
      let checked = 0;
      for (let at = 0; at < DRAWS && checked < WANT_PLACES; at += 1) {
        const place = drawPlace(`${seed}:${at}`, "challenger-odds");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        let world: ReturnType<typeof buildBenchWorld>;
        try {
          world = buildBenchWorld(place.seed, gameStartDate(), {
            twoLevel: true,
            placeKey: place.key,
          });
        } catch (error) {
          if ((error as Error).name !== "NoPlayerHereError") throw error;
          passed.push(`${where}: no one to play`);
          continue;
        }
        const { core } = world;
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 400));
        const contests = api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[];
        const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
        const seen = new Map<string, { lead: number; odds: number }>();
        for (const contest of contests) {
          if (seen.has(contest.seatId)) continue;
          const holder = (
            terms.query("bySeatStatus", [
              contest.seatId,
              "serving",
            ]) as unknown as TermRow[]
          )[0];
          if (!holder?.personId) continue;
          const lead = seatLastMargin(api, contest.seatId);
          if (lead <= 0) continue;
          seen.set(contest.seatId, {
            lead,
            odds: challengerOdds(api, {
              contestId: contest.id,
              officeName: contest.title,
              filingDeadline: contest.electionDate,
              incumbentId: holder.personId as never,
              seatId: contest.seatId,
              sourceIds: [contest.id],
            }),
          });
        }
        const rows = [...seen.values()];
        // A seat the holder won with no one against (a lead of the whole vote)
        // shows nothing about how a lead protects it: the case needs seats
        // whose leads differ.
        const leads = new Set(rows.map((row) => row.lead.toFixed(6)));
        if (rows.length < 2 || leads.size < 2) {
          passed.push(
            `${where}: ${rows.length} counted seats with a holder, ${leads.size} different leads`,
          );
          continue;
        }
        checked += 1;
        for (const row of rows) {
          expect(row.odds, `${where}: odds are a chance`).toBeGreaterThan(0);
          expect(row.odds).toBeLessThan(1);
        }
        const values = new Set(rows.map((row) => row.odds.toFixed(6)));
        expect(
          values.size,
          `${where}: every seat has the same odds`,
        ).toBeGreaterThan(1);
        for (const a of rows)
          for (const b of rows)
            if (a.lead > b.lead)
              expect(
                a.odds,
                `${where}: a seat won by ${a.lead} must not be likelier to fall than one won by ${b.lead}`,
              ).toBeLessThanOrEqual(b.odds);
      }
      if (checked < WANT_PLACES)
        throw new Error(
          `only ${checked} of ${WANT_PLACES} drawn places had two counted seats (seed ${seed}); passed over: ${passed.join("; ")}`,
        );
    },
  );
});
