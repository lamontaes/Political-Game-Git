/**
 * A campaign's evening out is paid from money the campaign can spend (pool
 * item campaign-event-ignores-set-aside-money). A campaign sets money aside
 * for circulators and for a poll; the day's choices offered an evening
 * whenever the account held the venue's price, so a rival's evening spent the
 * circulators' money and the next circulators' payment left the account below
 * zero: "Invalid nonnegative integer journal amount: owner after" stopped the
 * world on 2025-10-08 at I Liyang, Northern Mariana Islands. In that place
 * and seed the played world gets past that day and every campaign's account
 * still covers the money it has set aside for circulators.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { coreAPI } from "./state";

/** Pinned: I Liyang, Northern Mariana Islands (6918250) on the seed the crash was found with. */
const SEED = "9a0022709c0625e7690862cc99da809bdc21c4e18dc26457386aa69cee9ef78e";
const PLACE = "territory:MP:i-liyang";
/** The day it stopped, and a few after. */
const THROUGH = "2025-10-12";

interface Row {
  readonly id: string;
  readonly organizationId: string;
  readonly circulatorFundMinor?: number;
}

it("I Liyang's campaigns play through the day a rival's evening spent the circulators' money", () => {
  const was = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    let days = 0;
    while (String(core.date) < THROUGH && days++ < 400)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    expect(String(core.date), "played to the day after the crash").toBe(
      THROUGH,
    );
    const rows = coreAPI(core)
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .rows() as unknown as Row[];
    let withFund = 0;
    for (const row of rows) {
      const fund = row.circulatorFundMinor ?? 0;
      if (fund <= 0) continue;
      withFund++;
      expect(
        core.organizations.get(row.organizationId)?.liquidMinor ?? 0,
        `${row.id}: the account covers its circulators' fund`,
      ).toBeGreaterThanOrEqual(fund);
    }
    expect(
      withFund,
      "a campaign still has circulators set aside",
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(was);
  }
}, 900_000);
