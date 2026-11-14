/**
 * A campaign never spends money it has set aside. At Tutu, U.S. Virgin Islands
 * (world seed e138064a9983ccabb695d23b1ff13dde8995ef6cf374d1edc2dfd5df3b133d47),
 * an ad, a poll or mail was budgeted from raised less spent, which counts the
 * funds put by for an event, a poll and circulators; on 2026-05-09 the US-VI
 * at-large seat 13 campaign held 573 minor in its account and owed 1,430 to
 * its circulators, and the journal refused the payment ("owner after").
 * Every purchase now budgets from `freeMinor`, so the account always holds
 * what the set-aside funds promise. Pinned place and seed, the world's own days.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID, type CampaignRow } from "./modules/campaigns";
import { coreAPI } from "./state";

const PLACE = "territory:VI:tutu";
const SEED = "e138064a9983ccabb695d23b1ff13dde8995ef6cf374d1edc2dfd5df3b133d47";
/** The day after the payment that failed. */
const THROUGH = "2026-05-10";

it("pays the circulators of the Tutu campaign on 2026-05-09 and keeps the poll and circulator funds in cash", () => {
  setBookkeeping(false);
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
  let weeks = 0;
  while (core.date < THROUGH) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    weeks += 1;
    for (const c of rows()) {
      const held = c.raisedMinor - c.spentMinor;
      // An evening out is paid from the event's own fund; a poll's and the
      // circulators' funds are never taken by anything else.
      const promised = (c.pollFundMinor ?? 0) + (c.circulatorFundMinor ?? 0);
      expect(held, `${c.id} on ${core.date}`).toBeGreaterThanOrEqual(promised);
    }
  }
  expect(weeks).toBeGreaterThan(0);
  const paid = rows().filter((c) => (c.spentByKind?.circulators ?? 0) > 0);
  expect(paid.length, "a campaign paid circulators by then").toBeGreaterThan(0);
}, 600_000);
