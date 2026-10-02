import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../src/simulation/legislative-starting-procedures";
import { legislativeRulePackForWorld } from "../src/simulation/legislative-procedure-world";
import { sessionLegalLimit } from "../src/simulation/governing/session-adjournments";
import { seatedChamberForPack } from "../src/simulation/governing/chamber-votes";
import {
  applyInstitutionStep,
  measureSessionClosedOn,
  measureSessionIsClosed,
} from "../src/simulation/governing/legislative-clock";
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  measurePosition,
} from "../src/simulation/legislation";
import { applyLegislativeStep } from "../src/presentation/legislation-session";
import { committeeRoster } from "../src/simulation/governing/committee-assignment";
import type { LegislativeProcedureContext } from "../src/simulation/legislation-scenarios";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import {
  addDays,
  daysBetween,
  simulationMomentAtLocalTime,
} from "../src/simulation/dates";
import * as demo from "../src/simulation/demo";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import { advanceWorld } from "../src/simulation/world";
import type { IsoDate, World } from "../src/simulation/types";

const SEED = "making-laws-recorded-floor-session-20261002";
const procedures = drawLegislativeStartingProcedures({ seed: SEED });
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.filter((usps) => {
  const entry = procedures[`US-${usps}`];
  const year = entry?.sessionYearParity === "odd" ? 2025 : 2026;
  return entry && sessionLegalLimit(entry.baselinePack, year) !== null;
})
  .map((usps) => ({
    usps,
    rank: createHash("sha256").update(`${SEED}:${usps}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);
const PROVENANCE = {
  method: "authored-fixture" as const,
  note: "Explicit fictional roll calls of actual seated people isolate the shared session guard; no natural member decision is claimed.",
  sourceEntityIds: [],
};
function on(world: World, date: IsoDate): World {
  return advanceWorld(world, daysBetween(world.currentDate, date));
}
function floorFixture(usps: string) {
  const entry = procedures[`US-${usps}`]!;
  const year = entry.sessionYearParity === "odd" ? 2025 : 2026;
  const limit = sessionLegalLimit(entry.baselinePack, year)!;
  // smallWorld's date option preserves the locality's original UTC offset.
  // Normalize that constructor input through the existing timezone reader;
  // every person, office, condition and due item still uses the real builders.
  const createScenarioWorld = demo.createScenarioWorld;
  const constructor = vi
    .spyOn(demo, "createScenarioWorld")
    .mockImplementation((seed, context, options) =>
      createScenarioWorld(
        seed,
        {
          ...context,
          initialMoment: simulationMomentAtLocalTime(context.initialMoment),
        },
        options,
      ),
    );
  let opening: ReturnType<typeof smallWorld>;
  try {
    opening = smallWorld({
      place: usps,
      seed: SEED,
      date: addDays(limit, -2),
      offices: ["congress", "state-legislature"],
    });
  } finally {
    constructor.mockRestore();
  }
  const pack = legislativeRulePackForWorld(
    opening.world,
    entry.baselinePack.packId,
  );
  const chamber = pack.chambers.find((body) => body.introductionAllowed)!;
  const seated = seatedChamberForPack(
    opening.world,
    pack.packId,
    chamber.chamberKey,
    chamber.name,
  )!;
  const members = seated.body.members.filter(
    (member) => member.personId !== null,
  );
  expect(members.length).toBeGreaterThan(0);
  const sponsor = members[0]!.personId!;
  let world: World = {
    ...opening.world,
    control: { kind: "person", personId: sponsor },
  };
  world = introduceMeasure(world, {
    stableKey: `${SEED}:${usps}:bill`,
    rulePackId: pack.packId,
    jurisdictionId: opening.stateJurisdictionId,
    ...nextMeasureNumbering(world, {
      jurisdictionId: opening.stateJurisdictionId,
      rulePackId: pack.packId,
      originChamber: chamber,
    }),
    shortTitle: "Meeting records policy",
    summary: "Explicit fictional nonfiscal session-guard proposal.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamber.chamberKey,
    sponsorPersonId: sponsor,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const committee = chamber.committees[0];
  if (committee) {
    world = referMeasure(world, {
      stableKey: `${measure.stableKey}:referral`,
      measureId: measure.id,
      committeeKey: committee.committeeKey,
    });
    const hearingDate = addDays(world.currentDate, 1);
    world = scheduleCommitteeHearing(world, {
      stableKey: `${measure.stableKey}:hearing`,
      measureId: measure.id,
      hearingDate,
    });
    world = on(world, hearingDate);
    world = recordCommitteeDisposition(world, {
      stableKey: `${measure.stableKey}:report`,
      measureId: measure.id,
      recommendation: "favorable",
      dispositions: committeeRoster(
        seated.body,
        chamber.committees,
        committee.committeeKey,
        `${pack.packId}:${chamber.chamberKey}`,
      ).map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId!,
        disposition: "yea" as const,
      })),
      rationale:
        "Explicit fictional committee control sends this proposal to the floor.",
      provenance: PROVENANCE,
    });
  }
  world = placeMeasureOnCalendar(world, {
    stableKey: `${measure.stableKey}:calendar`,
    measureId: measure.id,
  });
  expect(measurePosition(world, measure.id).phase).toBe("on-floor");
  const closedOn = measureSessionClosedOn(world, measure, pack);
  expect(closedOn).not.toBeNull();
  if (!closedOn) throw new Error(`No actual session close for ${usps}`);
  expect(world.currentDate <= closedOn).toBe(true);
  const vote = {
    stableKey: `${measure.stableKey}:supplied-floor`,
    measureId: measure.id,
    dispositions: members.map((member) => ({
      memberKey: member.memberKey,
      personId: member.personId!,
      disposition: "yea" as const,
    })),
    electedMembers: seated.seats,
    provenance: PROVENANCE,
    seatedMemberPersonIds: members.map((member) => member.personId!),
  };
  const context: LegislativeProcedureContext = {
    pack,
    measureId: measure.id,
    bodies: [seated.body],
    committeeMemberCount: committee?.appointedMembers ?? null,
    votePlan: {},
    governorAction: null,
    governorRationale: "",
    memberDecisions: { playerPersonId: sponsor },
    recordedPlayerPersonId: sponsor,
    recordedPlayerBallot: "yea",
  };
  return {
    world,
    measure,
    pack,
    closedOn,
    vote,
    context,
    observerPersonId: opening.personId,
  };
}

describe(`Making Laws supplied floor rolls respect session closure (seed ${SEED})`, () => {
  it("selects five actual dated state sessions from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
  });
  describe.each(cases)("$usps actual controlled sponsor", ({ usps }) => {
    it("admits the supplied open-session roll and preserves its actual people's ballots", () => {
      const fixture = floorFixture(usps);
      const result = applyInstitutionStep(
        fixture.world,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      expect(result.kind).toBe("applied");
      if (result.kind !== "applied")
        throw new Error(`Open-session recorded floor vote was ${result.kind}`);
      const votes = result.world.history.legislativeVotes!.filter(
        (vote) => vote.stableKey === `${fixture.vote.stableKey}:vote`,
      );
      expect(votes).toHaveLength(1);
      expect(votes[0]!.dispositions).toEqual(fixture.vote.dispositions);
      expect(result.world.control).toEqual(fixture.world.control);
      const resumed = deserializeWorld(serializeWorld(result.world));
      const repeated = applyInstitutionStep(
        resumed,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      const after =
        ("world" in repeated ? repeated.world : undefined) ?? resumed;
      expect(
        after.history.legislativeVotes!.filter(
          (vote) => vote.stableKey === `${fixture.vote.stableKey}:vote`,
        ),
      ).toEqual(votes);
    });
    it("applies the ordinary session-end outcome to supplied rolls without saving a floor vote", () => {
      const fixture = floorFixture(usps);
      const closed = deserializeWorld(
        serializeWorld(on(fixture.world, addDays(fixture.closedOn, 1))),
      );
      expect(measureSessionIsClosed(closed, fixture.measure.id).closed).toBe(
        true,
      );
      const ordinary = applyInstitutionStep(
        {
          ...closed,
          control: { kind: "person", personId: fixture.observerPersonId },
        },
        fixture.measure.id,
        (world) => world,
      );
      const supplied = applyInstitutionStep(
        closed,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      const expectedKind =
        fixture.pack.session.measuresDieAtAdjournment.kind === "known" &&
        fixture.pack.session.measuresDieAtAdjournment.value
          ? "ended"
          : "blocked";
      expect(ordinary.kind).toBe(expectedKind);
      expect(supplied.kind).toBe(ordinary.kind);
      if (ordinary.kind === "blocked" && supplied.kind === "blocked")
        expect(supplied.reason).toBe(ordinary.reason);
      const after =
        ("world" in supplied ? supplied.world : undefined) ?? closed;
      expect(after.history.legislativeVotes).toEqual(
        closed.history.legislativeVotes,
      );
      expect(
        after.history.legislativeVotes!.some(
          (vote) => vote.stableKey === `${fixture.vote.stableKey}:vote`,
        ),
      ).toBe(false);
      const resumed = deserializeWorld(serializeWorld(after));
      const repeated = applyInstitutionStep(
        resumed,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      expect(
        (("world" in repeated ? repeated.world : undefined) ?? resumed).history
          .legislativeVotes,
      ).toEqual(closed.history.legislativeVotes);
    });
    it("the presentation caller retains the shared session-end result after Continue", () => {
      const fixture = floorFixture(usps);
      const closed = on(fixture.world, addDays(fixture.closedOn, 1));
      const beforeVotes = closed.history.legislativeVotes;
      const result = applyLegislativeStep(
        fixture.context,
        closed,
        "move-floor-vote",
      );
      expect(result.world.history.legislativeVotes).toEqual(beforeVotes);
      const dies = fixture.pack.session.measuresDieAtAdjournment;
      expect(measurePosition(result.world, fixture.measure.id).terminal).toBe(
        dies.kind === "known" && dies.value,
      );
      const resumed = deserializeWorld(serializeWorld(result.world));
      expect(measurePosition(resumed, fixture.measure.id)).toEqual(
        measurePosition(result.world, fixture.measure.id),
      );
      const repeated = applyLegislativeStep(
        fixture.context,
        resumed,
        "move-floor-vote",
      );
      expect(repeated.world.history.legislativeVotes).toEqual(beforeVotes);
      expect(repeated.world.history.legislativeActions).toEqual(
        resumed.history.legislativeActions,
      );
    });
    it("retains measure matching and actual seated-voter admission", () => {
      const fixture = floorFixture(usps);
      const mismatch = applyInstitutionStep(
        fixture.world,
        fixture.measure.id,
        (world) => world,
        {
          recordedFloorVote: {
            ...fixture.vote,
            measureId: fixture.world.personOrder[0]!,
          },
        },
      );
      expect(mismatch.kind).toBe("blocked");
      const duplicate = applyInstitutionStep(
        fixture.world,
        fixture.measure.id,
        (world) => world,
        {
          recordedFloorVote: {
            ...fixture.vote,
            dispositions: [
              ...fixture.vote.dispositions,
              fixture.vote.dispositions[0]!,
            ],
          },
        },
      );
      expect(duplicate.kind).toBe("blocked");
      if (duplicate.kind === "blocked")
        expect(duplicate.reason).toMatch(/vote twice/);
    });
  });
});
