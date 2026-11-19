// @vitest-environment node
/**
 * A yes someone they know told them sets the incumbent reading by itself (a case of campaign-incumbent-response.test.ts, in its own file so the shard runs it beside the others).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setBookkeeping } from "./bookkeeping";
import type { ModuleRow } from "./module-data";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  raceReading,
  rivalDay,
} from "./modules/campaigns";
import {
  toldFromRecords,
  wordOfDoors,
} from "./campaign-incumbent-response-test-kit";

// Bookkeeping is a debug switch, off in the played world: the world's drives
// formed in play from events its retention has since let go, which the tests'
// per-write source check would refuse.
let bookkeepingWas = true;
beforeAll(() => {
  bookkeepingWas = setBookkeeping(false);
});
afterAll(() => {
  setBookkeeping(bookkeepingWas);
});

describe("a yes someone they know told them sets the incumbent reading by itself", () => {
  it("with no poll, no word and no evening of their own doors, a yes given to the challenger by someone they know in town and in touch with them since reads as a told source naming that pledge and steps them up; the same day without those yeses does not", () => {
    const { core, api, where, race, holder, town } = wordOfDoors((found) => {
      // The case reads what people they know tell them, with no word of a
      // rival and no doors of their own: a place where no such yes reads as
      // told is passed over.
      const state = found.api.moduleState(CAMPAIGNS_MODULE_ID);
      const wordTable = state.table("rivalWord");
      const doorTable = state.table("doors");
      const filingId = found.race.incumbent.id;
      const campaignId = campaignFor(found.api, filingId).id;
      const words = (
        wordTable.query("byCandidate", [
          found.holder.id,
        ]) as unknown as ModuleRow[]
      ).slice();
      const doors = (
        doorTable.query("byCampaign", [campaignId]) as unknown as ModuleRow[]
      ).slice();
      for (const row of words) wordTable.remove(row.id);
      for (const row of doors) doorTable.remove(row.id);
      try {
        const reading = raceReading(
          found.api,
          filingId,
          found.holder,
          found.town,
        );
        return reading?.sourceKind === "told" &&
          reading.rivalId === found.race.challenger.personId &&
          reading.rivalShare > reading.ownShare
          ? null
          : "no yes from someone they know reads as told, with the challenger ahead";
      } finally {
        for (const row of words) wordTable.put(row);
        for (const row of doors) doorTable.put(row);
      }
    });
    const filingId = race.incumbent.id;
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
    // The world as wordOfDoors left it, less the word and the incumbent's own
    // doors rows (put back after): only people they know remain to tell them.
    const wordTable = campaigns.table("rivalWord");
    const doorTable = campaigns.table("doors");
    const campaignId = campaignFor(api, filingId).id;
    const words = (
      wordTable.query("byCandidate", [holder.id]) as unknown as {
        id: string;
      }[]
    ).slice();
    const doors = (
      doorTable.query("byCampaign", [campaignId]) as unknown as {
        id: string;
      }[]
    ).slice();
    for (const row of words) wordTable.remove(row.id);
    for (const row of doors) doorTable.remove(row.id);
    try {
      const reading = raceReading(api, filingId, holder, town);
      expect(reading, `${where}: a circle yes reads`).not.toBeNull();
      expect(reading!.sourceKind, where).toBe("told");
      expect(reading!.rivalId, where).toBe(race.challenger.personId);
      expect(reading!.rivalShare, where).toBeGreaterThan(reading!.ownShare);
      // The source is a pledge row of someone the incumbent knows in town,
      // given to a candidate in the contest, and the day it carries is that
      // pledge's.
      const pledge = campaigns
        .table("pledges")
        .get(reading!.sourceRecordId) as unknown as
        { voterId: string; contestId: string; date: string } | undefined;
      expect(pledge, `${where}: the source is a pledge row`).toBeDefined();
      expect(pledge!.contestId, where).toBe(race.contest.id);
      expect(holder.knownIds.has(pledge!.voterId as never), where).toBe(true);
      expect(reading!.sourceDate, where).toBe(pledge!.date);
      // Told, not found: the shares are recounted from the pledges and the
      // relationships alone (no doors rows remain).
      const records = toldFromRecords(
        api,
        core,
        holder.id,
        town,
        race.contest.id,
        campaignId,
      );
      expect(reading!.toldPledgeIds, where).toEqual(
        [...records.told.keys()].sort(),
      );
      expect(reading!.covered, where).toBe(records.covered.size);
      // The day steps them up by that source, and the same day with the
      // challenger's yeses taken away steps up nothing.
      const day = rivalDay(api, filingId, holder, town);
      expect(day.steppedUp?.reading.sourceKind, where).toBe("told");
      expect(day.steppedUp!.extraHours, where).toBeGreaterThan(0);
      const pledges = campaigns.table("pledges");
      const toChallenger = records
        .toldTo(race.challenger.personId)
        .map((id) => pledges.get(id)!);
      expect(toChallenger.length, where).toBeGreaterThan(0);
      for (const row of toChallenger) pledges.remove(row.id);
      const untold = rivalDay(api, filingId, holder, town);
      for (const row of toChallenger) pledges.put(row);
      expect(
        untold.steppedUp,
        `${where}: no yeses told, no step-up`,
      ).toBeNull();
    } finally {
      for (const row of words) wordTable.put(row as unknown as ModuleRow);
      for (const row of doors) doorTable.put(row as unknown as ModuleRow);
    }
  }, 1_800_000);
});
