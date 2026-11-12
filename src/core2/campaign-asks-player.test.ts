/**
 * A world candidate's ask for money reaches the controlled person as a request
 * they answer (play-campaign-ask-reaches-player): no engine moves the player's
 * money on its own; a gift they choose moves it by the journal and the
 * campaign's books, and the candidate's next ask reads it (the gift row); a
 * refusal is read too: that candidate does not ask them again. In two drawn
 * places, each run until a candidate who knows the player asks; one world
 * per place holds the gift and the refusal.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  answerDonationAsk,
  campaignFor,
  CAMPAIGNS_MODULE_ID,
  donationAsksFor,
  giftOf,
  type AskRow,
} from "./modules/campaigns";
import { acceptJobOffer, jobOffersFor } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.CAMPAIGN_ASK_SEED ?? randomBytes(8).toString("hex");
/** Places drawn in turn until two have a candidate who asks the player (a year may hold no race that reaches them). */
const PLACES = 2;
const DRAWS = 8;
/** Days the world runs between looks, and the most it runs for one place (a list length and a run length, not model values). */
const STEP = 15;
const MOST = 400;

function worldWithAsk(worldSeed: string, placeKey: string) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const playerId = core.playerId!;
  // Every journal entry that takes money out of the player's account for a campaign.
  const gifts: string[] = [];
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const id = String(entry.sourceRef.id);
    // A campaign gift (campaigns.ts `donation:<filing>:<donor>:...`), not a
    // cause group's (drives.ts, the character's own act while days run:
    // core-player-autoplay-acts).
    if (
      id.startsWith("donation:") &&
      !id.includes(":cause-group:") &&
      entry.postings.some(
        (row) =>
          row.deltaMinor < 0 &&
          core.cashJournal.accounts.get(row.accountId)?.ownerId === playerId,
      )
    )
      gifts.push(id);
    return post(entry);
  };
  let tookJob = false;
  for (let day = 0; day < MOST; day += STEP) {
    if (donationAsksFor(api, playerId).length) break;
    advanceCore(core, addDays(makeIsoDate(core.date), STEP));
    // Taking the job offered is the player's own act; with pay they have something to be asked for.
    const offer = tookJob ? undefined : jobOffersFor(api, playerId)[0];
    if (offer && acceptJobOffer(api, offer.id)) tookJob = true;
  }
  return { core, api, playerId, gifts, ask: donationAsksFor(api, playerId)[0] };
}

const asksOf = (api: ReturnType<typeof coreAPI>, playerId: string) =>
  api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("asks")
    .query("byDonor", [playerId]) as unknown as AskRow[];

describe(`a candidate's ask reaches the player (seed ${seed})`, () => {
  it("asks without taking; a gift moves by the journal; a refusal is read by the next ask", () => {
    const proved: string[] = [];
    const none: string[] = [];
    const refusals: string[] = [];
    for (let at = 0; at < DRAWS && proved.length < PLACES; at += 1) {
      const place = drawPlace(
        createHash("sha256").update(`${seed}:${at}`).digest("hex"),
        "campaign-ask-player",
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      // The gift.
      const given = worldWithAsk(place.seed, place.key);
      expect(given.gifts, `${where}: money left before an answer`).toEqual([]);
      if (!given.ask) {
        none.push(where);
        continue;
      }
      const { api, core, playerId, ask } = given;
      const before = core.people.get(playerId)!.liquidMinor;
      const raised = campaignFor(api, ask.campaignId).raisedMinor;
      // Half the suggested sum, in whole dollars, within what they hold today (cash may
      // have fallen since the ask; a sum past it is refused, as below).
      const size =
        Math.floor(Math.min(ask.suggestedMinor / 2, before) / 100) * 100;
      if (size < 100) {
        none.push(`${where} (asked, but holds under a dollar now)`);
        continue;
      }
      // Not whole dollars, or more than they hold: refused, nothing moves.
      expect(answerDonationAsk(api, ask.id, "give", size + 50), where).toBe(
        false,
      );
      expect(answerDonationAsk(api, ask.id, "give", before + 100), where).toBe(
        false,
      );
      expect(answerDonationAsk(api, ask.id, "give", size), where).toBe(true);
      expect(core.people.get(playerId)!.liquidMinor, where).toBe(before - size);
      expect(given.gifts.length, `${where}: one journal entry`).toBe(1);
      expect(giftOf(api, ask.campaignId, playerId)?.totalMinor, where).toBe(
        size,
      );
      expect(campaignFor(api, ask.campaignId).raisedMinor, where).toBe(
        raised + size,
      );
      expect(
        answerDonationAsk(api, ask.id, "give", size),
        `${where}: answered once`,
      ).toBe(false);
      // The refusal, in the same world: another candidate's open request declined.
      const no = donationAsksFor(api, playerId).find(
        (a) => a.candidateId !== ask.candidateId,
      );
      if (no) {
        expect(answerDonationAsk(api, no.id, "decline"), where).toBe(true);
        advanceCore(core, addDays(makeIsoDate(core.date), 90));
        expect(
          asksOf(api, playerId)
            .filter((r) => r.campaignId === no.campaignId)
            .map((r) => r.status),
          `${where}: the candidate does not ask again`,
        ).toEqual(["declined"]);
        expect(given.gifts.length, `${where}: no gift after the refusal`).toBe(
          1,
        );
        refusals.push(no.id);
      }
      console.log(
        `campaign-ask: ${where}: ${ask.id} from ${ask.candidateId}, suggested ${ask.suggestedMinor}, gave ${size} (${given.gifts[0]}); declined ${no?.id ?? "none open"}`,
      );
      proved.push(where);
    }
    if (none.length)
      console.log(
        `campaign-ask: no ask reached the player in ${none.join("; ")}`,
      );
    expect(proved.length, `places proved (no ask in: ${none.join("; ")})`).toBe(
      PLACES,
    );
  }, 3_600_000);
});
