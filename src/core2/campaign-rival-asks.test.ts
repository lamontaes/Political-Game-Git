/**
 * A candidate's ask for money closes when the person asked files against them
 * in the same race, and a rival gives nothing (play-rival-asks-close): the
 * Blockers walk at Papillion, Nebraska, Nov 17, saw two candidates in the
 * player's own council race keep asking her for money after she filed. Drawn
 * places, each run until a race the player may file for has another
 * candidate's campaign that asks the player through the engine's own call;
 * then the player files the way the counter files.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { fileForOffice } from "../bench/government";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  askPlayerForMoney,
  campaignFor,
  donationAnswer,
  donationAsksFor,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  playerFilingBar,
  standing,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { acceptJobOffer, jobOffersFor } from "./modules/jobs";
import { coreAPI, type CoreAPI } from "./state";

const seed = process.env.RIVAL_ASK_SEED || randomBytes(8).toString("hex");
/** Places drawn in turn until one has the case (a list length and a run length, not model values). */
const DRAWS = 6;
const STEP = 15;
const MOST = 760;

/** A rival's campaign in a race the player may file for today that asks the player, or null. */
function rivalAsk(api: CoreAPI, playerId: string) {
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  for (const contest of contests) {
    if (contest.electionDate < api.state.date) continue;
    if (playerFilingBar(api, contest.id)) continue;
    const filings = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byContest", [contest.id]) as unknown as FilingRow[];
    for (const filing of filings) {
      if (filing.personId === playerId || !standing(filing)) continue;
      if (askPlayerForMoney(api, filing.id, playerId))
        return { contest, filing };
    }
  }
  return null;
}

describe("a candidate's ask for money and a rival in the same race", () => {
  it("closes once the player files against the candidate, and a rival gives nothing", () => {
    const passedOver: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      setBookkeeping(false);
      const place = drawPlace(seed, `rival-ask-${draw}`);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const playerId = core.playerId!;
      let tookJob = false;
      let found = rivalAsk(api, playerId);
      for (let day = 0; !found && day < MOST; day += STEP) {
        advanceCore(core, addDays(makeIsoDate(core.date), STEP));
        // Taking the job offered is the player's own act; with pay they have something to be asked for.
        const offer = tookJob ? undefined : jobOffersFor(api, playerId)[0];
        if (offer && acceptJobOffer(api, offer.id)) tookJob = true;
        found = rivalAsk(api, playerId);
      }
      const where = `${place.name} (${place.key}), place seed ${place.seed}, run seed ${seed}`;
      if (!found) {
        passedOver.push(
          `${place.name}: no rival campaign asked in a race the player may file for`,
        );
        continue;
      }
      const { contest, filing } = found;
      const campaignId = filing.id;
      expect(
        donationAsksFor(api, playerId).some((a) => a.campaignId === campaignId),
        `${where}: the ask is open before the player files`,
      ).toBe(true);
      fileForOffice(core, playerId, contest.id);
      expect(
        donationAsksFor(api, playerId).some((a) => a.campaignId === campaignId),
        `${where}: the ask from ${campaignFor(api, campaignId).candidateId} is still open after the player filed against them`,
      ).toBe(false);
      expect(
        donationAnswer(api, campaignId, playerId, { suggestOnly: true }),
        `${where}: a rival would give`,
      ).toEqual({ givenMinor: 0, why: "not-warm" });
      console.log(
        `rival ask closed at ${where}; passed over: ${passedOver.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had the case (seed ${seed}): ${passedOver.join("; ")}`,
    );
  }, 1_800_000);
});
