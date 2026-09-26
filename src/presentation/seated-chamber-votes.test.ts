import { beforeAll, describe, expect, it } from "vitest";
import { seatedChamberMember } from "../../tests/fixtures/seated-chamber-member";

import {
  addDays,
  daysBetween,
  deserializeWorld,
  legislativeBlueprint,
  serializeWorld,
} from "../simulation";
import type { MeasureStepKey, World } from "../simulation";
import {
  decideChamberVote,
  publicPartyOf,
  seatedChamberForPack,
} from "../simulation/governing/chamber-votes";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import {
  castMemberBallot,
  memberVotesAhead,
} from "../simulation/governing/legislative-clock";
import { createOrganizationParticipation } from "../simulation/life";
import {
  LIVING_WORLD_KEYS,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "../simulation/living-world/opening";
import { legislativeRulePackForWorld } from "../simulation/legislative-procedure-world";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import type { LegislativeAssignment } from "./legislation-world";
import { fileDraftFromOffice } from "./legislation-docket";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { regularSessionActionRefusal } from "./legislative-session-window";
import { passOrdinaryDays } from "./ordinary-life";
import { projectMeasureBriefing } from "./legislation-projection";

/**
 * A bill the player works on is decided by the state's seated legislators,
 * each for their own reasons, not by a head count written in advance.
 *
 * Nebraska's one-house legislature and Alaska's two chambers with a joint
 * override session. Kentucky is here too, on purpose and not as a default:
 * an audit found its transit bill always passing the House 58 to 40 on
 * counts copied from a developer fixture, and this is where that stops.
 * The fixture supplies a fictional election result to a generated resident;
 * it is not proof of an unsupplied election outcome.
 */

function memberBill(
  placeKey: string,
  elected: ReturnType<typeof seatedChamberMember>,
) {
  let world = elected.world;
  const personId = elected.personId;
  const pack = legislativeBlueprint(placeKey).pack;
  const activePack = legislativeRulePackForWorld(world, pack.packId);
  let sessionDate = world.currentDate;
  for (
    let day = 0;
    day < 370 && regularSessionActionRefusal(activePack, sessionDate);
    day += 1
  )
    sessionDate = addDays(sessionDate, 1);
  expect(regularSessionActionRefusal(activePack, sessionDate)).toBeNull();
  if (sessionDate > world.currentDate)
    world = passOrdinaryDays(
      world,
      daysBetween(world.currentDate, sessionDate),
    );
  const entry = resolveLegislativeFilingEntry(world, personId);
  if (entry.kind !== "available") throw new Error(entry.reason);
  const filed = fileDraftFromOffice(world, {
    playerPersonId: personId,
    scenarioKey: entry.scenarioKey,
    jurisdictionId: entry.jurisdictionId,
    familyKey: "broadband-access",
    variantKey: "unserved-buildout",
  });
  const opened = resolveLegislativeAssignmentForMeasure(filed.world, {
    measureId: filed.bill.measureId,
    playerPersonId: personId,
    memberSeatStableKey: entry.seat.relationshipStableKey,
  });
  if (opened.kind !== "available") throw new Error(opened.reason);
  return { world: filed.world, assignment: opened.assignment };
}

/** Takes whatever step is open next, waiting where it is not the office's. */
function advance(
  world: World,
  assignment: LegislativeAssignment,
  until: (world: World) => boolean,
): World {
  let next = world;
  for (let i = 0; i < 40 && !until(next); i++) {
    // The fictional controlled member explicitly chooses on their own bill.
    // The clock cannot decide or dismiss the player's ballot for them.
    for (const vote of memberVotesAhead(
      next,
      assignment.playerPersonId!,
    ).filter(
      (entry) =>
        entry.measure.id === assignment.measureId && entry.ballot === null,
    ))
      next = castMemberBallot(next, {
        personId: assignment.playerPersonId!,
        question: vote.question,
        ballot: "yea",
      });
    const briefing = projectMeasureBriefing(next, assignment.measureId);
    if (briefing.finished) break;
    const option = briefing.options.find(
      (entry) => !entry.disabledReason && entry.actionKey !== "offer-amendment",
    );
    if (!option) break;
    const step: MeasureStepKey = option.actionKey;
    const owned = institutionOwnsStep(next, assignment, step);
    const result = applyLegislativeCommand(next, assignment, {
      kind: owned ? "await-institution" : "take-step",
      step,
    });
    if (owned && result.world === next)
      throw new Error(`The institution made no clock progress on ${step}.`);
    next = result.world;
  }
  return next;
}

function votesOn(world: World, measureId: string) {
  return (world.history.legislativeVotes ?? []).filter(
    (vote) => vote.measureId === measureId,
  );
}

describe.each(["nebraska", "alaska", "kentucky"])(
  "a seated member's bill in %s",
  (place) => {
    let world: World;
    let assignment: LegislativeAssignment;
    let pack: LegislativeAssignment["procedure"]["pack"];
    let members: ReturnType<typeof stateLegislators>;
    let floor: World;
    let elected: ReturnType<typeof seatedChamberMember>;
    beforeAll(() => {
      elected = seatedChamberMember(
        place === "nebraska" ? "NE" : place === "alaska" ? "AK" : "KY",
      );
    });
    beforeAll(() => {
      ({ world, assignment } = memberBill(place, elected));
      pack = assignment.procedure.pack;
      members = stateLegislators(world, `${pack.packId}:candidacy`);
      floor = advance(world, assignment, (w) =>
        votesOn(w, assignment.measureId).some(
          (v) => v.purpose === "floor-stage",
        ),
      );
    });

    it("works for a legislator who actually holds a seat", () => {
      expect(assignment.procedure.memberDecisions).toBeDefined();
      const sponsor = members.find(
        (member) => member.personId === assignment.sponsorPersonId,
      );
      expect(sponsor).toBeDefined();
      expect(sponsor!.officeKey.endsWith(`:${pack.chamberOrder[0]}`)).toBe(
        true,
      );
    });

    it("puts the state's seated members in the chambers, and nobody else", () => {
      for (const body of assignment.procedure.bodies) {
        const seated = members.filter(
          (member) => member.officeKey === `${pack.packId}:${body.chamberKey}`,
        );
        expect(body.members.map((m) => m.personId).sort()).toEqual(
          seated.map((m) => m.personId).sort(),
        );
      }
    });

    it("records every member's own decision, with the reason that decided it", () => {
      const votes = votesOn(floor, assignment.measureId);
      const committee = votes.find(
        (vote) => vote.purpose === "committee-report",
      );
      expect(committee).toBeDefined();
      // A committee that will not report the bill ends it there; one that does
      // sends it to a floor where every seated member answers.
      const onFloor = votes.find((vote) => vote.purpose === "floor-stage");
      expect(Boolean(onFloor)).toBe(committee!.outcome === "passed");
      for (const vote of votes) {
        expect(vote.provenance.method).toBe("member-decisions");
        for (const entry of vote.dispositions) {
          expect(entry.personId).not.toBeNull();
          expect(entry.reason).toMatch(/^member:/);
          if (entry.personId === assignment.sponsorPersonId)
            expect(entry.reason).toBe("member:own-ballot");
        }
      }
      if (onFloor) {
        const origin = assignment.procedure.bodies.find(
          (body) => body.chamberKey === pack.chamberOrder[0],
        )!;
        expect(onFloor.dispositions.length).toBe(origin.members.length);
      }
    });

    it("gives the same votes after Save and Continue", () => {
      const restored = deserializeWorld(serializeWorld(world));
      const again = advance(restored, assignment, (w) =>
        votesOn(w, assignment.measureId).some(
          (v) => v.purpose === "floor-stage",
        ),
      );
      expect(
        votesOn(again, assignment.measureId).map((v) => v.dispositions),
      ).toEqual(
        votesOn(floor, assignment.measureId).map((v) => v.dispositions),
      );
    });
  },
);

describe("a seated chamber deciding one question", () => {
  let world: World;
  let assignment: LegislativeAssignment;
  let chamber: NonNullable<ReturnType<typeof seatedChamberForPack>>;
  let question: Parameters<typeof decideChamberVote>[1]["question"];
  let elected: ReturnType<typeof seatedChamberMember>;
  beforeAll(() => {
    elected = seatedChamberMember("AK");
  });
  beforeAll(() => {
    ({ world, assignment } = memberBill("alaska", elected));
    // This isolated party-cue question explicitly gives its fictional sponsor
    // a public affiliation; a generated resident does not acquire one merely
    // by winning a seat or filing a bill.
    world = createOrganizationParticipation(world, {
      stableKey: "seated-chamber-vote:fictional-sponsor-affiliation",
      personId: assignment.sponsorPersonId,
      organizationId: livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.nationalParty("democratic"),
      ),
      startedAt: world.currentDate,
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Explicit fictional party-cue fixture affiliation.",
      provenance: {
        kind: "authored",
        note: "Unit fixture choice, not a generated political affiliation.",
      },
    });
    const pack = assignment.procedure.pack;
    const chamberKey = pack.chamberOrder[0]!;
    chamber = seatedChamberForPack(world, pack.packId, chamberKey, "House")!;
    question = {
      question: {
        measureId: assignment.measureId,
        purpose: "floor-stage",
        forumKey: chamberKey,
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: "Pass the bill",
    };
  });

  it("never votes for the player", () => {
    const player = chamber.body.members[3]!;
    const decided = decideChamberVote(world, {
      stableKey: "test:player",
      question,
      members: chamber.body.members,
      playerPersonId: player.personId,
    });
    expect(
      decided.find((entry) => entry.personId === player.personId),
    ).toMatchObject({
      disposition: "absent",
      reason: "member:player-not-present",
    });
    const cast = decideChamberVote(world, {
      stableKey: "test:player",
      question,
      members: chamber.body.members,
      playerPersonId: player.personId,
      playerBallot: "nay",
    });
    expect(
      cast.find((entry) => entry.personId === player.personId)?.disposition,
    ).toBe("nay");
  });

  it("counts an empty seat as a vacancy, not a voter", () => {
    const members = chamber.body.members.map((member, index) =>
      index === 0 ? { ...member, personId: null } : member,
    );
    const decided = decideChamberVote(world, {
      stableKey: "test:vacancy",
      question,
      members,
    });
    expect(decided[0]).toEqual({
      memberKey: members[0]!.memberKey,
      personId: null,
      disposition: "absent",
    });
  });

  it("decides by party only where the parties contest the question", () => {
    const sponsorParty = publicPartyOf(world, assignment.sponsorPersonId);
    expect(sponsorParty).not.toBeNull();
    const ordinary = decideChamberVote(world, {
      stableKey: "test:party",
      question,
      members: chamber.body.members,
    });
    const override = decideChamberVote(world, {
      stableKey: "test:override",
      question: {
        ...question,
        question: { ...question.question, purpose: "veto-override" as const },
      },
      members: chamber.body.members,
    });
    for (const [index, entry] of ordinary.entries()) {
      if (entry.personId === assignment.sponsorPersonId) continue;
      const same = publicPartyOf(world, entry.personId!) === sponsorParty;
      expect(entry).toMatchObject({
        disposition: "yea",
        reason: same ? "member:party-cue:same" : "member:no-objection",
      });
      expect(override[index]).toMatchObject({
        disposition: same ? "yea" : "nay",
        reason: same ? "member:party-cue:same" : "member:party-cue:other",
      });
    }
    expect(new Set(override.map((entry) => entry.disposition)).size).toBe(2);
  });
});
