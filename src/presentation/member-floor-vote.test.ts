import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import {
  castMemberBallot,
  memberVotesAhead,
  pendingChamberQuestions,
} from "../simulation/governing/legislative-clock";
import { chamberQuestionKey } from "../simulation/governing/member-ballots";
import type { World } from "../simulation";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
  scheduledActivityState,
} from "../simulation/time-work";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { recordWorldEvent } from "../simulation/world";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { playCalendarActivity } from "./calendar-time-control";
import { memberVoteRows } from "./member-votes";

/**
 * A player who holds a seat votes on the bills put to their chamber.
 *
 * Before: the clock recorded a seated player absent on every question, with
 * no way to cast a ballot. After: a question the player sits on goes on their
 * calendar the day before it is put, the player decides their ballot, and the
 * roll call records it. Nobody decides for them: without a ballot they are
 * still recorded absent.
 *
 * Control moves to a seated member here as a test shortcut; winning the seat
 * is the player's own route and is covered by the campaign tests.
 */

/**
 * Passes a day the way a player does: when time stops for a reminder to
 * decide a vote, the player attends it (here, without deciding).
 */
function passDay(world: World, personId: string): World {
  const next = passOrdinaryDays(world, 1);
  if (next.currentDate !== world.currentDate) return next;
  const due = next.history.scheduledActivities.find(
    (activity) =>
      activity.stableKey.includes(":member-vote:") &&
      activity.participantPersonIds.includes(personId) &&
      scheduledActivityState(next, activity.id).status === "scheduled",
  );
  if (!due) return next;
  return playCalendarActivity(next, personId, due.id).world;
}

describe("a seated player's own vote", () => {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-AK",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "veto-US-AK",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const alaska = stateJurisdictionForKey("US-AK")!.id;
  let world: World = openOrdinaryLife(game.world, game.playerPersonId);
  // Pass time until some bill has a question for seated members ahead of it.
  let pending: ReturnType<typeof pendingChamberQuestions>[number] | undefined;
  for (let day = 0; day < 400 && !pending; day += 1) {
    world = passOrdinaryDays(world, 1);
    for (const measure of (world.history.legislativeMeasures ?? []).filter(
      // A state chamber's own bills; Congress's are covered where it is.
      (entry) => entry.jurisdictionId === alaska,
    )) {
      pending = pendingChamberQuestions(world, measure.id).find((forum) =>
        forum.members.some(
          (member) =>
            member.personId && member.personId !== game.playerPersonId,
        ),
      );
      if (pending) break;
    }
  }
  const member = pending!.members.find(
    (entry) => entry.personId && entry.personId !== game.playerPersonId,
  )!.personId!;
  // Hand play to the member the way a continuation does: the old
  // character's decisions are released, then control moves.
  const handoff = recordWorldEvent(world, {
    stableKey: "test:member-floor-vote:handoff",
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      game.playerPersonId,
      ...playerRequiredWorkIds(world, game.playerPersonId),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "Play moved to a seated member for this test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const released = releasePlayerRequiredWork(handoff, {
    personId: game.playerPersonId,
    stableKeyPrefix: "test:member-floor-vote:released",
    outcomeEventId: handoff.history.events.at(-1)!.id,
  });
  const seated = openOrdinaryLife(
    { ...released, control: { kind: "person", personId: member } },
    member,
  );
  const key = chamberQuestionKey(pending!.question);

  it("lists the question for the member who sits on it", () => {
    expect(seated.control).toMatchObject({ kind: "person", personId: member });
    const ahead = memberVotesAhead(seated, member);
    expect(ahead.map((entry) => chamberQuestionKey(entry.question))).toContain(
      key,
    );
    expect(
      ahead.find((e) => chamberQuestionKey(e.question) === key)?.ballot,
    ).toBeNull();
  });

  it("reads the question to the member in plain words", () => {
    const row = memberVoteRows(seated, member).find(
      (entry) => entry.key === key,
    );
    expect(row?.bill).toMatch(/^[A-Z]+ \d+, /);
    expect(row?.asks).toMatch(/\?$/);
    expect(row?.when).toMatch(/^The vote is on [A-Z][a-z]+ \d{1,2}, \d{4}\.$/);
    expect(row?.ballot).toBeNull();
    expect(memberVoteRows(seated, game.playerPersonId)).toEqual([]);
  });

  it("refuses a ballot for anyone the player does not control", () => {
    const other = pending!.members.find(
      (entry) => entry.personId && entry.personId !== member,
    )!.personId!;
    const after = castMemberBallot(seated, {
      personId: other,
      question: pending!.question,
      ballot: "yea",
    });
    expect(after).toBe(seated);
  });

  it("records the member's own ballot at the roll call", () => {
    let next = castMemberBallot(seated, {
      personId: member,
      question: pending!.question,
      ballot: "nay",
    });
    expect(next).not.toBe(seated);
    expect(
      memberVotesAhead(next, member).find(
        (e) => chamberQuestionKey(e.question) === key,
      )?.ballot,
    ).toBe("nay");
    const taken = () =>
      (next.history.legislativeVotes ?? []).find(
        (vote) =>
          vote.measureId === pending!.question.measureId &&
          vote.purpose === pending!.question.purpose &&
          vote.takenAt >= seated.currentDate &&
          vote.dispositions.some((entry) => entry.personId === member),
      );
    for (let day = 0; day < 30 && !taken(); day += 1)
      next = passDay(next, member);
    const disposition = taken()?.dispositions.find(
      (entry) => entry.personId === member,
    );
    expect(disposition).toMatchObject({
      disposition: "nay",
      reason: "member:own-ballot",
    });
  });

  it("puts later questions on the member's calendar, and without a ballot records them absent", () => {
    let next = seated;
    // Questions already set when play moved were set before this member was
    // the player; the list above offers those. The calendar notice is for
    // questions set afterwards.
    const setBefore = new Set(
      memberVotesAhead(seated, member).map((entry) => entry.question.measureId),
    );
    const absentVote = () =>
      (next.history.legislativeVotes ?? []).find(
        (vote) =>
          vote.takenAt > seated.currentDate &&
          !setBefore.has(vote.measureId) &&
          vote.dispositions.some(
            (entry) =>
              entry.personId === member &&
              entry.reason === "member:player-not-present",
          ),
      );
    for (let day = 0; day < 200 && !absentVote(); day += 1)
      next = passDay(next, member);
    expect(absentVote()).toBeDefined();
    const notices = next.history.scheduledActivities.filter(
      (activity) =>
        activity.stableKey.includes(":member-vote:") &&
        activity.participantPersonIds.includes(member),
    );
    expect(notices.length).toBeGreaterThan(0);
    expect(notices[0]!.title).toMatch(/^Decide your vote on /);
    expect(notices[0]!.summary).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
}, 900_000);
