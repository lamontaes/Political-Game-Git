import { createHash } from "node:crypto";
import { expect, vi } from "vitest";
import { smallWorld } from "./small-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../../src/simulation/legislative-starting-procedures";
import { legislativeRulePackForWorld } from "../../src/simulation/legislative-procedure-world";
import { sessionLegalLimit } from "../../src/simulation/governing/session-adjournments";
import { seatedChamberForPack } from "../../src/simulation/governing/chamber-votes";
import { measureSessionClosedOn } from "../../src/simulation/governing/legislative-clock";
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  measurePosition,
} from "../../src/simulation/legislation";
import { committeeRoster } from "../../src/simulation/governing/committee-assignment";
import type { LegislativeProcedureContext } from "../../src/simulation/legislation-scenarios";
import { nextMeasureNumbering } from "../../src/simulation/measure-numbering";
import {
  addDays,
  daysBetween,
  simulationMomentAtLocalTime,
} from "../../src/simulation/dates";
import * as demo from "../../src/simulation/demo";
import { advanceWorld } from "../../src/simulation/world";
import type { IsoDate, World } from "../../src/simulation/types";

export const SEED = "making-laws-recorded-floor-session-20261002";
const procedures = drawLegislativeStartingProcedures({ seed: SEED });
export const cases = CHIEF_EXECUTIVE_JURISDICTIONS.filter((usps) => {
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
export function on(world: World, date: IsoDate): World {
  return advanceWorld(world, daysBetween(world.currentDate, date));
}
export function floorFixture(usps: string) {
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
