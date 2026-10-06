import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { composeWorldTimeHandlers } from "../campaigns";
import { daysBetween } from "../dates";
import { memberBallotOn } from "../governing/member-ballots";
import { councilFloorQuestion } from "../governing/council-lawmaking";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { rulePackById } from "../legislature-rule-packs";
import { nextMeasureNumbering } from "../measure-numbering";
import { municipalRulePackFor } from "../municipal-government";
import { homeLocalGovernmentUnits } from "../nationwide-world/local-governments";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  recordOfficeVoteInstruction,
  recordOfficeWorkflowPreference,
} from "../office-workflow";
import { SeededRng } from "../rng";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { deserializeWorld, serializeWorld } from "../serialization";
import { townCouncilProfilePackId } from "../town-council-profile";
import type {
  EntityId,
  FutureDueItem,
  OfficeMeetingDepth,
  OfficeVotingWorkflowMode,
  World,
} from "../types";
import { advanceWorld } from "../world";
import {
  chooseToSitThroughMeeting,
  councilMeetingAgenda,
  sitsThroughMeeting,
} from "./council-agenda";
import {
  decideQuietCouncilItem,
  playerCouncilSeat,
  quietItemsToReview,
} from "./council-quiet-items";
import {
  ensureLocalCouncilMeetings,
  LOCAL_COUNCIL_MEETING,
  meetingItemsThatMatter,
  townQuestions,
} from "./local-council-meetings";
import {
  ensureLocalGovernmentSeats,
  sittingLocalOfficers,
} from "./local-government-seats";

const seed = "b05-p4-quiet-council-items-20261006";
const place =
  CHIEF_EXECUTIVE_JURISDICTIONS[
    new SeededRng(seed).integer(0, CHIEF_EXECUTIVE_JURISDICTIONS.length)
  ]!;

function nextMeeting(world: World): FutureDueItem {
  return world.history.futureDueItems
    .filter((row) => row.transitionKey === LOCAL_COUNCIL_MEETING)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]!;
}

function meet(world: World, due: FutureDueItem): World {
  return advanceWorld(
    world,
    daysBetween(world.currentDate, due.dueAt),
    composeWorldTimeHandlers(),
  );
}

/**
 * A seated council where the controlled person holds one of its seats, with
 * one ordinance a colleague filed (quiet for them) and one they filed
 * themselves (it matters), both on the floor at the next meeting.
 */
function fixture(workflow: {
  mode: OfficeVotingWorkflowMode | null;
  instruct?: "yea" | "nay" | null;
  depth?: OfficeMeetingDepth;
}) {
  const small = smallWorld({ place, people: 4, seed });
  let world = ensureLocalGovernmentSeats(small.world, small.personId);
  const home = homeLocalGovernmentUnits(world, small.personId);
  const unit = [...home.municipal, ...home.townships, ...home.counties].find(
    (row) => sittingLocalOfficers(world, row).some((seat) => !seat.mayor),
  )!;
  expect(unit).toBeDefined();
  const seats = sittingLocalOfficers(world, unit).filter((row) => !row.mayor);
  const me = seats[0]!.personId;
  const colleague = seats[1]!.personId;
  world = { ...world, control: { kind: "person", personId: me } };
  world = ensureLocalCouncilMeetings(world, me);
  expect(nextMeeting(world)).toBeDefined();
  const compiled = municipalGovernmentForUnit(unit);
  const municipalPack = compiled ? municipalRulePackFor(compiled) : null;
  const pack = municipalPack?.ok
    ? municipalPack.pack
    : rulePackById(townCouncilProfilePackId(unit));
  const jurisdictionId = nextMeeting(world).jurisdictionId!;
  const proposition = townQuestions(world, jurisdictionId)[0]!;
  const file = (sponsor: EntityId, key: string) => {
    world = introduceMeasure(world, {
      stableKey: `${seed}:${key}`,
      jurisdictionId,
      rulePackId: pack.packId,
      ...nextMeasureNumbering(world, {
        jurisdictionId,
        originChamber: chamberByKey(pack, "council"),
        rulePackId: pack.packId,
      }),
      shortTitle: `Council item ${key}`,
      summary: "Authored ordinance supplied to the existing council path.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: sponsor,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    world = placeMeasureOnCalendar(world, {
      stableKey: `${seed}:${key}:agenda`,
      measureId: measure.id,
    });
    return measure.id;
  };
  const quietId = file(colleague, "quiet");
  const matterId = file(me, "matters");

  // Meet until the quiet item is on the floor and ripe for its roll call.
  for (let step = 0; step < 6; step += 1) {
    const measure = world.history.legislativeMeasures!.find(
      (row) => row.id === quietId,
    )!;
    if (
      measurePosition(world, quietId).phase === "on-floor" &&
      measure.introducedAt < nextMeeting(world).dueAt
    )
      break;
    world = meet(world, nextMeeting(world));
  }
  expect(measurePosition(world, quietId).phase).toBe("on-floor");

  const seat = playerCouncilSeat(world, unit, me)!;
  expect(seat).not.toBeNull();
  if (workflow.mode) {
    const pref = recordOfficeWorkflowPreference(world, {
      personId: me,
      officeRelationshipId: seat.participationId,
      votingMode: workflow.mode,
      caseworkMode: "player-handles-all",
      ...(workflow.depth ? { meetingDepth: workflow.depth } : {}),
    });
    expect(pref.kind).toBe("recorded");
    world = pref.world;
  }
  for (const measureId of [quietId, matterId]) {
    if (workflow.instruct) {
      const written = recordOfficeVoteInstruction(world, {
        personId: me,
        officeRelationshipId: seat.participationId,
        chamberKey: "council",
        measureId,
        disposition: workflow.instruct,
      });
      if (workflow.mode !== "handle-individually")
        expect(written.kind).toBe("recorded");
      world = written.world;
    }
  }
  return { world, unit, me, quietId, matterId, jurisdictionId };
}

function meetingVote(world: World, measureId: EntityId, me: EntityId) {
  const vote = world.history.legislativeVotes?.find(
    (row) => row.measureId === measureId,
  );
  return vote?.dispositions.find((row) => row.personId === me) ?? null;
}

function quietFor(world: World, me: EntityId) {
  const due = nextMeeting(world);
  return meetingItemsThatMatter(world, me, due.id)
    .filter((item) => item.reasons.length === 0)
    .map((item) => item.measure);
}

describe(`quiet council items follow the member's voting workflow (${place}, ${seed})`, () => {
  it("reads 56 places and tells the item that matters from the quiet one", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    const { world, me, quietId, matterId } = fixture({ mode: null });
    const quiet = quietFor(world, me).map((row) => row.id);
    expect(quiet).toContain(quietId);
    expect(quiet).not.toContain(matterId);
  });

  it("prior instructions cast the quiet item, not the one that matters, and survive reload", () => {
    const { world, unit, me, quietId, matterId } = fixture({
      mode: "prior-instructions-with-exceptions",
      instruct: "nay",
    });
    expect(memberBallotOn(world, me, councilFloorQuestion(quietId))).toBeNull();
    const met = meet(world, nextMeeting(world));
    expect(memberBallotOn(met, me, councilFloorQuestion(quietId))).toBe("nay");
    expect(meetingVote(met, quietId, me)).toMatchObject({
      disposition: "nay",
      reason: "member:own-ballot",
    });
    // The item that matters is the member's own: no instruction cast it.
    expect(memberBallotOn(met, me, councilFloorQuestion(matterId))).toBeNull();
    expect(quietItemsToReview(met, { unit, playerId: me, quiet: [] })).toEqual(
      [],
    );
    const reopened = deserializeWorld(serializeWorld(met));
    expect(memberBallotOn(reopened, me, councilFloorQuestion(quietId))).toBe(
      "nay",
    );
    expect(meetingVote(reopened, quietId, me)?.disposition).toBe("nay");
  }, 240_000);

  it("review batch lists the quiet item, casts nothing, and a decision from the list is the vote", () => {
    const { world, unit, me, quietId, jurisdictionId } = fixture({
      mode: "review-batch",
      instruct: "nay",
    });
    const quiet = quietFor(world, me);
    const waiting = quietItemsToReview(world, {
      unit,
      playerId: me,
      quiet,
    });
    expect(waiting.map((row) => row.measure.id)).toEqual([quietId]);
    // Left undecided, the meeting records the member absent.
    const absent = meet(world, nextMeeting(world));
    expect(
      memberBallotOn(absent, me, councilFloorQuestion(quietId)),
    ).toBeNull();
    expect(meetingVote(absent, quietId, me)?.disposition).toBe("absent");
    // Decided from the list first, the same meeting counts it.
    const decided = decideQuietCouncilItem(world, {
      unit,
      town: jurisdictionId,
      playerId: me,
      measure: waiting[0]!.measure,
      ballot: "yea",
    });
    expect(quietItemsToReview(decided, { unit, playerId: me, quiet })).toEqual(
      [],
    );
    const met = meet(decided, nextMeeting(decided));
    expect(meetingVote(met, quietId, me)).toMatchObject({
      disposition: "yea",
      reason: "member:own-ballot",
    });
  }, 240_000);

  it("handling each vote individually, or choosing no workflow, leaves the quiet item to the member", () => {
    for (const mode of ["handle-individually", null] as const) {
      const { world, unit, me, quietId } = fixture({ mode });
      const items = quietFor(world, me);
      expect(
        quietItemsToReview(world, { unit, playerId: me, quiet: items }),
      ).toEqual([]);
      const met = meet(world, nextMeeting(world));
      expect(memberBallotOn(met, me, councilFloorQuestion(quietId))).toBeNull();
      expect(meetingVote(met, quietId, me)?.disposition).toBe("absent");
    }
  }, 240_000);
});

describe(`the agenda before a council meeting (${place}, ${seed})`, () => {
  it("marks what matters, says what the workflow does with the rest, and keeps the depth through reload", () => {
    const { world, unit, me, quietId, matterId } = fixture({
      mode: "prior-instructions-with-exceptions",
      instruct: "nay",
    });
    const due = nextMeeting(world);
    const agenda = councilMeetingAgenda(world, {
      unit,
      playerId: me,
      dueItemId: due.id,
    });
    expect(agenda.depth).toBe("what-matters");
    const quiet = agenda.items.find((row) => row.measure.id === quietId)!;
    const mine = agenda.items.find((row) => row.measure.id === matterId);
    expect(quiet).toMatchObject({
      matters: false,
      plays: false,
      handling: "cast-by-standing-instruction",
    });
    // Their own ordinance matters because they sponsored it.
    expect(mine?.reasons).toContain("player-sponsored");
    expect(mine).toMatchObject({ plays: true, playsBecause: "matters" });
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      councilMeetingAgenda(reopened, {
        unit,
        playerId: me,
        dueItemId: due.id,
      }).items.map((row) => [row.measure.id, row.plays]),
    ).toEqual(agenda.items.map((row) => [row.measure.id, row.plays]));
  });

  it("an everything default or sitting through the meeting plays the quiet item, so no instruction casts it", () => {
    const base = fixture({
      mode: "prior-instructions-with-exceptions",
      instruct: "nay",
    });
    const { unit, me, quietId } = base;
    const due = nextMeeting(base.world);
    // Control: the quiet item is cast from the standing instruction.
    const cast = meet(base.world, due);
    expect(meetingVote(cast, quietId, me)?.disposition).toBe("nay");

    // This one meeting, by choice.
    const sat = chooseToSitThroughMeeting(base.world, {
      unit,
      playerId: me,
      dueItemId: due.id,
    });
    expect(sitsThroughMeeting(sat, me, due.id)).toBe(true);
    expect(sitsThroughMeeting(base.world, me, due.id)).toBe(false);
    expect(
      councilMeetingAgenda(sat, {
        unit,
        playerId: me,
        dueItemId: due.id,
      }).items.find((row) => row.measure.id === quietId),
    ).toMatchObject({ plays: true, playsBecause: "sits-through-this-meeting" });
    // Choosing twice records nothing new.
    expect(
      chooseToSitThroughMeeting(sat, {
        unit,
        playerId: me,
        dueItemId: due.id,
      }).history.events,
    ).toHaveLength(sat.history.events.length);
    const metSitting = meet(sat, due);
    expect(
      memberBallotOn(metSitting, me, councilFloorQuestion(quietId)),
    ).toBeNull();
    expect(meetingVote(metSitting, quietId, me)?.disposition).toBe("absent");

    // The standing default, for every meeting.
    const everything = fixture({
      mode: "prior-instructions-with-exceptions",
      instruct: "nay",
      depth: "everything",
    });
    expect(
      councilMeetingAgenda(everything.world, {
        unit: everything.unit,
        playerId: everything.me,
        dueItemId: nextMeeting(everything.world).id,
      }).items.find((row) => row.measure.id === everything.quietId),
    ).toMatchObject({ plays: true, playsBecause: "everything-default" });
    const metEverything = meet(everything.world, nextMeeting(everything.world));
    expect(
      meetingVote(metEverything, everything.quietId, everything.me)
        ?.disposition,
    ).toBe("absent");
  }, 240_000);

  it("handling each vote individually plays every item, and only a seated member can sit through a meeting", () => {
    const { world, unit, me, quietId } = fixture({
      mode: "handle-individually",
    });
    const due = nextMeeting(world);
    expect(
      councilMeetingAgenda(world, {
        unit,
        playerId: me,
        dueItemId: due.id,
      }).items.find((row) => row.measure.id === quietId),
    ).toMatchObject({ plays: true, playsBecause: "handles-each-vote" });
    const seated = new Set(
      sittingLocalOfficers(world, unit).map((seat) => seat.personId),
    );
    const outsider = world.personOrder.find((id) => !seated.has(id))!;
    expect(
      chooseToSitThroughMeeting(world, {
        unit,
        playerId: outsider,
        dueItemId: due.id,
      }),
    ).toBe(world);
  });
});
