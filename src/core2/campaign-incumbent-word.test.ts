// @vitest-environment node
/**
 * Word of a challenger's doors reaches the incumbent, and what the incumbent reads of the race from it (a case of campaign-incumbent-response.test.ts, in its own file so the shard runs it beside the others).
 */
import { describe, expect, it } from "vitest";
import { takeCampaignDayChoice } from "./campaign-day";
import {
  CAMPAIGNS_MODULE_ID,
  CAMPAIGN_STEPPED_UP_EVENT,
  campaignFor,
  campaignTurn,
  raceReading,
  rivalDay,
  steppedUpOf,
} from "./modules/campaigns";
import {
  expectBestRival,
  toldFromRecords,
  wordOfDoors,
} from "./campaign-incumbent-response-test-kit";

describe("word of a challenger's doors reaches the incumbent", () => {
  it("with no poll, word sets the incumbent reading the yeses people told them; more told for the challenger makes them walk more doors, the turn keeps it by the word's id, and the same day without those yeses does not", () => {
    const {
      core,
      api,
      where,
      race,
      holder,
      town,
      message,
      word,
      reading,
      calm,
    } = wordOfDoors();
    const filingId = race.incumbent.id;
    // The word names the challenger's evening of doors and who passed it on.
    expect(word.rivalId, where).toBe(race.challenger.personId);
    expect(word.contestId, where).toBe(race.contest.id);
    expect(message.witnessIds, where).toContain(word.tellerId);
    expect(holder.knownIds.has(word.tellerId as never), where).toBe(true);
    expect(reading.sourceKind, where).toBe("word");
    expect(reading.rivalId, where).toBe(race.challenger.personId);
    expect(reading.rivalShare, where).toBeGreaterThan(reading.ownShare);
    // The shares are the yeses people told the incumbent, recounted from
    // the pledges, the relationships and the incumbent's own doors rows.
    const campaignId = campaignFor(api, filingId).id;
    const records = toldFromRecords(
      api,
      core,
      holder.id,
      town,
      race.contest.id,
      campaignId,
    );
    const toChallenger = records.toldTo(race.challenger.personId);
    const toIncumbent = records.toldTo(holder.id);
    expect(toChallenger.length, where).toBeGreaterThan(0);
    expect(reading.toldPledgeIds, where).toEqual(
      [...records.told.keys()].sort(),
    );
    expect(reading.rivalShare, where).toBe(
      toChallenger.length / records.covered.size,
    );
    expect(reading.ownShare, where).toBe(
      toIncumbent.length / records.covered.size,
    );
    expect(reading.covered, where).toBe(records.covered.size);
    expectBestRival(api, reading, records, holder.id, race.contest.id, where);
    // The same incumbent on the same day, with and without the word.
    const pressed = rivalDay(api, filingId, holder, town);
    // Without the word, the incumbent's own doors may already have told them
    // the race (a reading from their doors rows opens by itself); then the
    // step-up is the doors', never the word's. With the word, the reading is
    // the word's. (Before the doors reading, nothing stepped up without the
    // word; searched 500 drawn places for one where that still holds: none.)
    expect(calm.steppedUp?.reading.sourceKind ?? "doors", where).toBe("doors");
    expect(pressed.steppedUp?.reading.sourceKind, where).toBe("word");
    expect(pressed.steppedUp?.reading.sourceRecordId, where).toBe(word.id);
    // The word walks them no fewer doors than their own doors' reading did:
    // both read the same told yeses, so where the doors had already told them
    // the day walks the same doors (it was strictly more before the doors
    // reading; with the word alone there is no place left where it holds).
    expect(
      pressed.doorHours,
      `${where}: the word's day walks no fewer doors`,
    ).toBeGreaterThanOrEqual(calm.doorHours);
    // The twin: the same day, the same word, with the yeses to the
    // challenger that were told taken away (each a pledge someone in touch
    // since, or someone at the incumbent's doors, still held). The threat
    // is gone, and the day steps up nothing, so the turn keeps no row.
    const pledges = api.moduleState(CAMPAIGNS_MODULE_ID).table("pledges");
    const heldRows = toChallenger.map((id) => pledges.get(id)!);
    expect(
      heldRows.every((row) => row !== undefined),
      where,
    ).toBe(true);
    for (const row of heldRows) pledges.remove(row.id);
    const untold = raceReading(api, filingId, holder, town);
    const untoldDay = rivalDay(api, filingId, holder, town);
    for (const row of heldRows) pledges.put(row);
    expect(untold?.sourceRecordId, where).toBe(word.id);
    expect(
      untold?.toldPledgeIds?.filter((id) => toChallenger.includes(id)),
      where,
    ).toEqual([]);
    expect(
      untold!.threat,
      `${where}: no yeses told, no threat`,
    ).toBeLessThanOrEqual(0);
    expect(untoldDay.steppedUp, `${where}: no stepped-up row`).toBeNull();
    expect(raceReading(api, filingId, holder, town), where).toEqual(reading);
    // The turn keeps the reading, naming the word, and tells it as an event.
    campaignTurn(api, filingId, race.contest.electionDate);
    const row = steppedUpOf(api, filingId).find(
      (r) => r.sourceRecordId === word.id,
    );
    expect(row, `${where}: the turn kept the word`).toBeDefined();
    expect(row!.sourceKind).toBe("word");
    expect(row!.rivalId).toBe(race.challenger.personId);
    expect(
      core.eventIds.has(`${CAMPAIGN_STEPPED_UP_EVENT}:${row!.id}`),
      `${where}: the event names the row`,
    ).toBe(true);
    // An evening of the incumbent's own doors: everyone who answers tells
    // the campaign the yeses they hold, kept on the home's doors row, and
    // the reading counts each told yes from those rows as it does the
    // circle's.
    takeCampaignDayChoice(api, filingId, "canvass", {
      world: true,
      hours: 400,
    });
    const after = toldFromRecords(
      api,
      core,
      holder.id,
      town,
      race.contest.id,
      campaignId,
    );
    const doorTold = after.doors.flatMap((door) =>
      Object.entries(door.told ?? {}),
    );
    expect(doorTold.length, `${where}: residents answered`).toBeGreaterThan(0);
    const readingAfter = raceReading(api, filingId, holder, town)!;
    expect(readingAfter.toldPledgeIds, where).toEqual(
      [...after.told.keys()].sort(),
    );
    expect(readingAfter.rivalShare, where).toBe(
      after.toldTo(readingAfter.rivalId!).length / after.covered.size,
    );
    expect(readingAfter.ownShare, where).toBe(
      after.toldTo(holder.id).length / after.covered.size,
    );
    expectBestRival(
      api,
      readingAfter,
      after,
      holder.id,
      race.contest.id,
      where,
    );
    process.stdout.write(
      `${JSON.stringify({
        where,
        contest: race.contest.id,
        message: { id: message.id, met: message.witnessIds.length },
        word,
        reading: { ...reading, toldPledgeIds: undefined },
        covered: records.covered.size,
        toldToChallenger: toChallenger,
        toldToIncumbent: toIncumbent.length,
        untold: { ...untold, toldPledgeIds: undefined },
        calm: { ...calm, steppedUp: undefined },
        pressed: { ...pressed, steppedUp: undefined },
        steppedUp: row,
        afterCanvass: {
          answered: doorTold.length,
          covered: after.covered.size,
          toldToChallenger: after.toldTo(race.challenger.personId).length,
          toldToIncumbent: after.toldTo(holder.id).length,
          threat: readingAfter.threat,
        },
      })}\n`,
    );
  }, 900_000);
});
