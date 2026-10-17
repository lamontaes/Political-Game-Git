/**
 * A world candidate's ask for money reaches the controlled person as a request
 * they answer (pool item play-campaign-ask-reaches-player): the engine never
 * moves the player's money on its own; a gift moves it by the journal and the
 * campaign's books; a refusal is read by the candidate's next turns.
 * One pinned seed that showed 106 unasked gifts, and a random place.
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

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PINNED = "d97611412a84"; // Lake Ridge, Virginia: before the fix, 106 gifts to a Lt. Governor campaign

/** Runs the world in steps until a candidate's ask is open for the player, who takes the job offered. */
function worldWithAsk(worldSeed: string, placeKey?: string) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    ...(placeKey ? { placeKey } : {}),
  });
  const api = coreAPI(core);
  const playerId = core.playerId!;
  const gifts: string[] = [];
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const id = String(entry.sourceRef.id);
    if (
      id.startsWith("donation:") &&
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
  for (let day = 0; day < 365; day += 15) {
    if (donationAsksFor(api, playerId).length) break;
    advanceCore(core, addDays(makeIsoDate(core.date), 15));
    // Taking the offered job is the player's own act; with pay they have cash to be asked for.
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

describe("a candidate's ask reaches the player", () => {
  const place = drawPlace(
    createHash("sha256").update(seed).digest("hex"),
    "campaign-ask-player",
  );
  for (const [label, worldSeed, placeKey] of [
    ["pinned seed", PINNED, undefined],
    ["random place", place.seed, place.key],
  ] as const) {
    it(`${label}: the player's gift moves their money by the journal (seed ${worldSeed}, place ${placeKey ?? "from seed"})`, () => {
      const { api, core, playerId, gifts, ask } = worldWithAsk(
        worldSeed,
        placeKey,
      );
      const where = `${label}, seed ${worldSeed}, place ${placeKey ?? "from seed"}`;
      // No unasked gift: nothing left the player's account before they answered.
      expect(gifts, where).toEqual([]);
      if (!ask) {
        // A place with no campaign reaching the player this year holds none.
        expect(label, `${where}: no ask reached the player`).toBe(
          "random place",
        );
        return;
      }
      const before = core.people.get(playerId)!.liquidMinor;
      const raised = campaignFor(api, ask.campaignId).raisedMinor;
      // The player sizes the gift: half what was suggested, in whole dollars.
      const size = Math.max(
        100,
        Math.floor(ask.suggestedMinor / 2 / 100) * 100,
      );
      // A sum that is not whole dollars, or more than they hold, is refused.
      expect(answerDonationAsk(api, ask.id, "give", size + 50), where).toBe(
        false,
      );
      expect(answerDonationAsk(api, ask.id, "give", before + 100), where).toBe(
        false,
      );
      expect(answerDonationAsk(api, ask.id, "give", size), where).toBe(true);
      expect(core.people.get(playerId)!.liquidMinor, where).toBe(before - size);
      expect(gifts.length, `${where}: one journal record`).toBe(1);
      expect(giftOf(api, ask.campaignId, playerId)?.totalMinor, where).toBe(
        size,
      );
      expect(campaignFor(api, ask.campaignId).raisedMinor, where).toBe(
        raised + size,
      );
      const row = asksOf(api, playerId).find((r) => r.id === ask.id)!;
      expect([row.status, row.givenMinor], where).toEqual(["given", size]);
      // Once answered it is not open again.
      expect(answerDonationAsk(api, ask.id, "give", size), where).toBe(false);
      console.log(
        `ASK ${where}: ${gifts[0]} moved ${size} of ${ask.suggestedMinor} suggested to ${ask.candidateId}`,
      );
    }, 3_600_000);

    it(`${label}: a refusal is read, the candidate does not ask that person again (seed ${worldSeed})`, () => {
      const { api, core, playerId, gifts, ask } = worldWithAsk(
        worldSeed,
        placeKey,
      );
      const where = `${label}, seed ${worldSeed}`;
      if (!ask) {
        expect(label, `${where}: no ask reached the player`).toBe(
          "random place",
        );
        return;
      }
      expect(answerDonationAsk(api, ask.id, "decline"), where).toBe(true);
      advanceCore(core, addDays(makeIsoDate(core.date), 90));
      const later = asksOf(api, playerId).filter(
        (r) => r.campaignId === ask.campaignId,
      );
      expect(
        later.map((r) => r.status),
        where,
      ).toEqual(["declined"]);
      expect(gifts, where).toEqual([]);
    }, 3_600_000);
  }
});
