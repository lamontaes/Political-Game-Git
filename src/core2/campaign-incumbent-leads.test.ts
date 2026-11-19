// @vitest-environment node
/**
 * A challenger who leads the town is heard to lead at the incumbent's doors (a case of campaign-incumbent-response.test.ts, in its own file so the shard runs it beside the others).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setBookkeeping } from "./bookkeeping";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignTurn,
  raceReading,
  rivalDay,
  steppedUpOf,
} from "./modules/campaigns";
import {
  walkEvenings,
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

describe("a challenger who leads the town is heard to lead at the incumbent's doors", () => {
  // Waits on campaign-door-warmth-follows-the-canvasser-not-the-platform:
  // today every first visit warms nearly everyone to whoever knocks, so the
  // incumbent's evenings (the day's own hours, one a day) turn the
  // challenger's pledges into the incumbent's. Monroe, US-SD, pledges to the
  // challenger and to the incumbent before and after 1, 3, 5, 10 and 20
  // evenings of the incumbent's doors: with no extra canvass by the
  // challenger 75 and 0, then 54 and 26, 23 and 62, 10 and 80, 8 and 106,
  // 11 and 123 (the doors told them 0.47 to 0.02 after one evening, 0.83 to 0
  // after twenty); with fifty more days of the challenger's canvass 121 and
  // 38, then 109 and 50, 83 and 76, 70 and 90, 51 and 112, 35 and 128 (threat
  // -0.04 after one evening, -0.68 after twenty). A visit moves a few
  // people in a hundred in life. That item's builder un-skips this case as
  // its test that fails before.
  it.skip("after the challenger's own canvass for weeks, the incumbent's evenings of doors tell them the challenger is ahead, the day steps up, and the turn keeps the evening with the doors as its source", () => {
    const { core, api, where, race, holder, town } = wordOfDoors();
    const filingId = race.incumbent.id;
    const campaignId = campaignFor(api, filingId).id;
    const state = api.moduleState(CAMPAIGNS_MODULE_ID);
    // The challenger works the town's doors for fifty more days (the game's
    // own canvass choice and clock).
    walkEvenings(api, core, race.challenger.id, 50);
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
    const reading = raceReading(api, filingId, holder, town);
    expect(reading?.sourceKind, where).toBe("doors");
    expect(reading!.rivalId, where).toBe(race.challenger.personId);
    expect(
      reading!.threat,
      `${where}: the challenger leads the town and is not heard to at the doors`,
    ).toBeGreaterThan(0);
    expect(
      rivalDay(api, filingId, holder, town).steppedUp,
      where,
    ).not.toBeNull();
    campaignTurn(api, filingId, race.contest.electionDate);
    const evening = `${filingId}:${reading!.sourceRecordId}:${reading!.sourceDate}`;
    expect(
      steppedUpOf(api, filingId).find((r) => r.id === evening)?.sourceKind,
      where,
    ).toBe("doors");
  }, 1_800_000);
});
