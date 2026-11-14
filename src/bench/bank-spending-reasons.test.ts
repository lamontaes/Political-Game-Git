/**
 * The Money sheet's "what went out last month" strip is a view of the cash
 * journal: for a closed month it equals the journal's own outflows for the
 * household's members, grouped by the transfer's reason. In the played world,
 * in a place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { clearPersonOutflows, personOutflowsForMonth } from "../core2/accounts";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { restoreWorld, snapshotWorld } from "../core2/snapshot";
import type { CoreState } from "../core2/types";
import { bankView } from "./bank";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "bank-spending-reasons");
const build = () => {
  setBookkeeping(false);
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
};
const monthOf = (date: string) => date.slice(0, 7);
const closedMonthOf = (core: CoreState) =>
  addDays(makeIsoDate(`${monthOf(core.date)}-01`), -1).slice(0, 7);

/** What the journal itself shows the household's members paying out in a month. */
function journalOutflows(core: CoreState, memberIds: string[], month: string) {
  const out = new Map<string, number>();
  for (const memberId of memberIds)
    for (const id of core.cashJournal.detailedByOwner.get(memberId) ?? []) {
      const receipt = core.cashJournal.detailedReceipts.get(id);
      if (!receipt || receipt.date.slice(0, 7) !== month) continue;
      if (receipt.sourceRef.kind !== "accounts.transfer") continue;
      for (const posting of receipt.postings) {
        const account = core.cashJournal.accounts.get(posting.accountId);
        if (account?.ownerId === memberId && posting.deltaMinor < 0)
          out.set(memberId, (out.get(memberId) ?? 0) - posting.deltaMinor);
      }
    }
  return out;
}

describe(`spending reasons on the Money sheet in ${place.name}, seed ${seed}`, () => {
  it("equals the journal's outflows for the household in a closed month", () => {
    const { core, playerId } = build();
    // Run past the first full month after the player was first watched.
    advanceCore(core, addDays(makeIsoDate(core.date), 75));
    const month = closedMonthOf(core);
    const memberIds = core.households
      .get(core.people.get(playerId)!.householdId)!
      .memberIds.filter((id) => core.people.get(id)?.alive);
    const journal = journalOutflows(core, memberIds, month);
    let compared = 0;
    for (const memberId of memberIds) {
      const lines = personOutflowsForMonth(core, memberId, month);
      const paid = lines.reduce((n, line) => n + line.paidMinor, 0);
      // Whole-money moves only: a wholly unpaid request posts nothing.
      expect(paid, `${memberId} in ${month}`).toBe(journal.get(memberId) ?? 0);
      if (paid) compared += 1;
    }
    expect(compared, `no member paid anything in ${month}`).toBeGreaterThan(0);
    const view = bankView(core, playerId)!;
    expect(view.spending.length).toBeGreaterThan(0);
    for (const line of view.spending)
      expect(line.paidMinor).toBeLessThanOrEqual(line.requestedMinor);
  }, 600_000);

  it("leaves out a month the person was only partly watched", () => {
    const { core, playerId } = build();
    advanceCore(core, addDays(makeIsoDate(core.date), 20));
    const first = core.date.slice(0, 7);
    // The opening month is part of a month: never shown as a whole one.
    expect(personOutflowsForMonth(core, playerId, first)).toEqual([]);
  }, 600_000);

  it("is kept in a save: saved mid-month and loaded, the same strip", () => {
    const original = build();
    advanceCore(original.core, addDays(makeIsoDate(original.core.date), 75));
    const month = closedMonthOf(original.core);
    const saved = snapshotWorld(original.core);
    const loaded = build();
    restoreWorld(loaded.core, JSON.parse(JSON.stringify(saved)));
    const memberIds = original.core.households.get(
      original.core.people.get(original.playerId)!.householdId,
    )!.memberIds;
    for (const id of memberIds)
      expect(personOutflowsForMonth(loaded.core, id, month)).toEqual(
        personOutflowsForMonth(original.core, id, month),
      );
  }, 600_000);

  it("is read by nothing in the simulation: dropping it every week changes no other record", () => {
    const run = (clear: boolean) => {
      const { core } = build();
      for (let week = 0; week < 12; week += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
        if (clear) clearPersonOutflows(core);
      }
      return {
        date: core.date,
        sequence: core.cashJournal.nextSequence,
        gross: String(core.cashJournal.totals.grossDebitMinor),
        cash: [...core.people.values()].map((p) => [p.id, p.liquidMinor]),
      };
    };
    expect(run(true)).toEqual(run(false));
  }, 600_000);
});
