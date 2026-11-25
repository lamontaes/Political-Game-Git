/**
 * The incumbent comes home to campaign when a challenger gains (owner, Oct
 * 29: "her campaign gained steam, and then it caused [the incumbent] to try
 * to go back to New York to campaign"; pool item campaign-like-real-races),
 * in a place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins
 * one).
 *
 * A world candidate who holds the seat reads where the race stands from what
 * they know, never from true support: here their own campaign's poll, taken
 * after the challenger has walked the town's doors. With the challenger ahead
 * in it, the incumbent's campaign day puts in more hours and more doors than
 * the same day without the poll; living elsewhere, they come home to the
 * town's doors; and their turn keeps the reading once, naming the poll, with
 * an event a scene can name by the row.
 *
 * With no poll at all, word does it: the challenger's evening of doors is a
 * message the people met can pass on, and once someone who knows both is in
 * touch with the incumbent in the days that follow (the campaigns engine's
 * own day), the incumbent reads the race from the yeses people have told
 * them (someone they know in touch since a yes, a resident at their own
 * campaign's door, counted or full) and steps up where more told them of a
 * yes to the challenger than to them; the same day with those yeses taken
 * away does not.
 */
import { describe, expect, it } from "vitest";
import {
  CAMPAIGNS_MODULE_ID,
  CAMPAIGN_STEPPED_UP_EVENT,
  campaignFor,
  campaignTurn,
  rivalDay,
  steppedUpOf,
  type PollRow,
} from "./modules/campaigns";
import { threatenedIncumbent } from "./campaign-incumbent-response-test-kit";

describe("the incumbent comes home to campaign when a challenger gains", () => {
  it("an incumbent whose own poll shows the challenger ahead puts in more hours and doors, and keeps the reading once by the poll's id", () => {
    const { core, api, where, race, holder, poll, reading, calm } =
      threatenedIncumbent();
    const filingId = race.incumbent.id;
    // The reading is the poll's: what its respondents said, the challenger ahead.
    expect(reading.sourceKind, where).toBe("poll");
    expect(reading.sourceRecordId, where).toBe(poll.id);
    expect(reading.rivalId, where).toBe(race.challenger.personId);
    expect(reading.rivalShare, where).toBeGreaterThan(reading.ownShare);
    // The same incumbent on the same day, with and without the poll.
    const unthreatened = calm(holder.placeId);
    const threatened = rivalDay(api, filingId, holder, holder.placeId);
    expect(unthreatened.steppedUp, where).toBeNull();
    expect(threatened.steppedUp, where).not.toBeNull();
    const total = (d: typeof threatened) =>
      d.callHours + d.doorHours + d.actHours;
    expect(total(threatened), `${where}: more hours`).toBeGreaterThan(
      total(unthreatened),
    );
    expect(threatened.doorHours, `${where}: more doors`).toBeGreaterThan(
      unthreatened.doorHours,
    );
    expect(threatened.steppedUp!.extraHours, where).toBeCloseTo(
      total(threatened) - total(unthreatened),
    );
    // Living elsewhere, the threat brings them home to the town's doors: a
    // candidate whose day had no doors there now walks them, and one whose
    // short petition already brought them walks more.
    const away = "place:elsewhere";
    const awayCalm = calm(away);
    const awayPressed = rivalDay(api, filingId, holder, away);
    expect(awayPressed.doorHours, `${where}: comes home`).toBeGreaterThan(
      awayCalm.doorHours,
    );
    expect(awayPressed.steppedUp?.cameHome, where).toBe(
      awayCalm.doorHours === 0,
    );
    // The turn keeps the reading, naming the poll, and tells it as an event.
    const electionDate = race.contest.electionDate;
    campaignTurn(api, filingId, electionDate);
    const rows = steppedUpOf(api, filingId);
    const row = rows.find((r) => r.sourceRecordId === poll.id);
    expect(row, `${where}: the turn kept the reading`).toBeDefined();
    expect(row!.sourceKind).toBe("poll");
    expect(row!.rivalId).toBe(race.challenger.personId);
    expect(row!.candidateId).toBe(holder.id);
    expect(row!.threat).toBeCloseTo(reading.threat);
    expect(row!.extraHours, where).toBeGreaterThan(0);
    expect(
      core.eventIds.has(`${CAMPAIGN_STEPPED_UP_EVENT}:${row!.id}`),
      `${where}: the event names the row`,
    ).toBe(true);
    // Once a reading, not once a turn: the same poll is not kept again.
    campaignTurn(api, filingId, electionDate);
    const again = steppedUpOf(api, filingId);
    expect(again.filter((r) => r.sourceRecordId === poll.id).length).toBe(1);
    const polls = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("polls")
        .query("byContest", [race.contest.id]) as unknown as PollRow[]
    ).filter((p) => p.campaignId === campaignFor(api, filingId).id);
    expect(again.length).toBeLessThanOrEqual(polls.length);
    process.stdout.write(
      `${JSON.stringify({
        where,
        contest: race.contest.id,
        poll: { id: poll.id, contacted: poll.contacted, answers: poll.answers },
        reading,
        unthreatened,
        threatened: { ...threatened, steppedUp: undefined },
        steppedUp: threatened.steppedUp,
        away: { calm: awayCalm.doorHours, pressed: awayPressed.doorHours },
        rows: again.map((r) => r.id),
      })}\n`,
    );
  }, 900_000);
});
