// @vitest-environment node
/**
 * Counted residents tell the incumbent's canvass by the same rule as full people (a case of campaign-incumbent-response.test.ts, in its own file so the shard runs it beside the others).
 */
import { describe, expect, it } from "vitest";
import { setBookkeeping } from "./bookkeeping";
import {
  countedAtTheDoor,
  expectBestRival,
} from "./campaign-incumbent-response-test-kit";

describe("counted residents tell the incumbent's canvass by the same rule", () => {
  it("a counted resident who holds a yes to the challenger and opens the incumbent's door is kept on the home's doors row, as a full person is, and the reading word sets the incumbent on counts it", () => {
    // Bookkeeping is a debug switch, off in the played world.
    const was = setBookkeeping(false);
    let drawn: ReturnType<typeof countedAtTheDoor>;
    try {
      drawn = countedAtTheDoor();
    } finally {
      setBookkeeping(was);
    }
    const {
      api,
      core,
      where,
      race,
      campaignId,
      doors,
      told,
      answeredThisEvening,
      counted,
      countedYeses,
      firstHeld,
      firstPledge,
      holder,
      reading,
      records,
      countedTold,
    } = drawn;
    // One rule for both tiers: whoever answered that evening, full or
    // counted, told the campaign whom they had given their word to in the
    // contest (nothing had changed it since, so what they told is what
    // they held).
    expect(
      answeredThisEvening.length,
      `${where}: residents answered`,
    ).toBeGreaterThan(0);
    for (const t of answeredThisEvening)
      expect(t.yes, `${where}: ${t.voterId}`).toBe(t.held);
    // The counted resident's yes to the challenger was a pledge row they
    // held, kept on the incumbent's own doors row for their home.
    const first = counted[0]!;
    expect(firstPledge?.id, where).toBe(first.pledgeId);
    expect(firstHeld, where).toBe(race.challenger.personId);
    expect(first.door.campaignId, where).toBe(campaignId);
    expect(first.door.id, where).toBe(
      `${campaignId}|${first.door.householdId}`,
    );
    // Word of a rival set the incumbent reading the race: the rival's share
    // is the people they know in touch since a yes to the challenger plus
    // the residents who told their own canvass of one, by pledge id,
    // counted residents among them, over everyone it heard from.
    expect(reading!.sourceKind, where).toBe("word");
    expect(reading!.toldPledgeIds, where).toEqual(
      [...records.told.keys()].sort(),
    );
    for (const id of countedTold)
      expect(reading!.toldPledgeIds, where).toContain(id);
    expect(reading!.covered, where).toBe(records.covered.size);
    expect(reading!.ownShare, where).toBe(
      records.toldTo(holder.id).length / records.covered.size,
    );
    expectBestRival(api, reading!, records, holder.id, race.contest.id, where);
    expect(reading!.rivalShare, where).toBe(
      reading!.rivalId
        ? records.toldTo(reading!.rivalId).length / records.covered.size
        : 0,
    );
    process.stdout.write(
      `${JSON.stringify({
        where,
        contest: race.contest.id,
        countedYesesToChallenger: countedYeses.length,
        incumbentDoors: doors.size,
        answered: told.length,
        answeredThatEvening: {
          full: answeredThisEvening.filter((t) => !t.counted).length,
          counted: answeredThisEvening.filter((t) => t.counted).length,
        },
        countedAnswered: told.filter((t) => t.counted).length,
        countedToldChallenger: counted.length,
        first: { door: first.door.id, pledgeId: first.pledgeId },
        reading: {
          date: core.date,
          ...reading,
          toldPledgeIds: undefined,
          toldToChallenger: records.toldTo(race.challenger.personId).length,
          toldToIncumbent: records.toldTo(holder.id).length,
          countedToldToChallenger: countedTold.length,
          firstCountedPledgeIds: countedTold.slice(0, 3),
        },
      })}\n`,
    );
  }, 1_200_000);
});
