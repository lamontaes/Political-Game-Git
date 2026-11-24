/**
 * No purchase spends the money a campaign has set aside for circulators.
 * `freeMinor` is what a campaign holds and has not set aside; an ad, mail or a
 * poll was budgeted from raised less spent, which counts the circulators' fund
 * (an evening out did the same and stopped the world at I Liyang, Northern
 * Mariana Islands, 2025-10-08; the evening was fixed in
 * campaign-event-money.test.ts). Pinned to that place and seed: once a campaign
 * there holds circulators' money, an ad and mail bought with everything it can
 * leave the fund covered in its account.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  freeMinor,
  runAd,
  sendMail,
  type CampaignRow,
} from "./modules/campaigns";
import { coreAPI } from "./state";

/** Pinned: I Liyang, Northern Mariana Islands (6918250), the seed the crash was found with. */
const SEED = "9a0022709c0625e7690862cc99da809bdc21c4e18dc26457386aa69cee9ef78e";
const PLACE = "territory:MP:i-liyang";
const THROUGH = "2025-10-12";

it("an ad and mail never spend the circulators' fund", () => {
  const was = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const rows = () =>
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("campaigns")
        .rows() as unknown as CampaignRow[];
    let days = 0;
    while (String(core.date) < THROUGH && days++ < 400)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const buyers = rows().filter(
      (c) =>
        (c.circulatorFundMinor ?? 0) > 0 &&
        c.raisedMinor - c.spentMinor > (c.circulatorFundMinor ?? 0),
    );
    expect(
      buyers.length,
      "a campaign holds money beyond its fund",
    ).toBeGreaterThan(0);
    for (const buyer of buyers) {
      const fund = buyer.circulatorFundMinor ?? 0;
      runAd(api, {
        filingId: buyer.filingId,
        amountMinor: 10 ** 9,
        quiet: true,
      });
      sendMail(api, buyer.filingId, 10 ** 9, true);
      const after = rows().find((c) => c.id === buyer.id)!;
      expect(
        after.raisedMinor - after.spentMinor,
        `${buyer.id}: the fund is still in the account`,
      ).toBeGreaterThanOrEqual(fund);
      expect(freeMinor(after), buyer.id).toBeGreaterThanOrEqual(0);
    }
  } finally {
    setBookkeeping(was);
  }
}, 600_000);
