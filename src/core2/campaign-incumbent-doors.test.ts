// @vitest-environment node
/**
 * The incumbent's own doors tell them the race (a case of campaign-incumbent-response.test.ts, in its own file so the shard runs it beside the others).
 */
import { describe, expect, it } from "vitest";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignTurn,
  raceReading,
  rivalDay,
  steppedUpOf,
} from "./modules/campaigns";
import {
  expectBestRival,
  toldFromRecords,
  walkEvenings,
  wordOfDoors,
} from "./campaign-incumbent-response-test-kit";

describe("the incumbent's own doors tell them the race", () => {
  it("with no word and no poll, an evening of the incumbent's own doors opens a reading by itself, naming its door row; the told yeses for the challenger step them up, the turn keeps one row for the evening, and the same day without those yeses does not", () => {
    const { core, api, where, race, holder, town } = wordOfDoors();
    const filingId = race.incumbent.id;
    const campaignId = campaignFor(api, filingId).id;
    const state = api.moduleState(CAMPAIGNS_MODULE_ID);
    // No word of a rival and no poll: only what their own doors are told.
    for (const row of state
      .table("rivalWord")
      .query("byCandidate", [holder.id]) as unknown as { id: string }[])
      state.table("rivalWord").remove(row.id);
    for (const row of state.table("polls").rows() as unknown as {
      id: string;
      campaignId: string;
    }[])
      if (row.campaignId === campaignId) state.table("polls").remove(row.id);
    walkEvenings(api, core, filingId, 20);
    const records = toldFromRecords(
      api,
      core,
      holder.id,
      town,
      race.contest.id,
      campaignId,
    );
    const doorIds = new Set(records.doors.map((door) => door.id));
    const reading = raceReading(api, filingId, holder, town);
    expect(reading, `${where}: the doors opened no reading`).not.toBeNull();
    expect(reading!.sourceKind, where).toBe("doors");
    expect(doorIds.has(reading!.sourceRecordId), where).toBe(true);
    expect(reading!.sourceDate, where).toBe(core.date);
    expect(reading!.toldPledgeIds, where).toEqual(
      [...records.told.keys()].sort(),
    );
    const toChallenger = records.toldTo(race.challenger.personId);
    expect(reading!.rivalShare, where).toBe(
      toChallenger.length / records.covered.size,
    );
    expectBestRival(api, reading!, records, holder.id, race.contest.id, where);
    // The twin: the same evening with the challenger's told yeses taken away
    // (where any were told).
    if (toChallenger.length > 0) {
      const pledges = state.table("pledges");
      const heldRows = toChallenger.map((id) => pledges.get(id)!);
      for (const row of heldRows) pledges.remove(row.id);
      const untold = raceReading(api, filingId, holder, town);
      const untoldDay = rivalDay(api, filingId, holder, town);
      for (const row of heldRows) pledges.put(row);
      expect(untold?.sourceKind, where).toBe("doors");
      expect(
        untold!.threat,
        `${where}: no yeses told, no threat`,
      ).toBeLessThanOrEqual(0);
      expect(untoldDay.steppedUp, `${where}: no stepped-up row`).toBeNull();
    }
    // A step-up row exists exactly when the incumbent's doors told them the
    // challenger is ahead: the day steps up on a positive threat and on
    // nothing else (one evening of doors at this place shows the incumbent
    // ahead, as the staged case below explains).
    const pressed = rivalDay(api, filingId, holder, town);
    if (reading!.threat <= 0) {
      expect(pressed.steppedUp, `${where}: no threat, no step-up`).toBeNull();
      campaignTurn(api, filingId, race.contest.electionDate);
      expect(
        steppedUpOf(api, filingId),
        `${where}: the turn kept no row`,
      ).toEqual([]);
      return;
    }
    expect(pressed.steppedUp?.reading.sourceRecordId, where).toBe(
      reading!.sourceRecordId,
    );
    // The turn keeps one row for this evening, by the door row and the day.
    campaignTurn(api, filingId, race.contest.electionDate);
    const evening = `${filingId}:${reading!.sourceRecordId}:${reading!.sourceDate}`;
    const row = steppedUpOf(api, filingId).find((r) => r.id === evening);
    expect(row, `${where}: the turn kept the evening ${evening}`).toBeDefined();
    expect(row!.sourceKind, where).toBe("doors");
    process.stdout.write(
      `${JSON.stringify({ where, contest: race.contest.id, reading: { ...reading, toldPledgeIds: undefined }, toldToChallenger: toChallenger.length, covered: records.covered.size, steppedUp: row })}\n`,
    );
  }, 1_800_000);
});
