import { describe, expect, it } from "vitest";
import { stableHash } from "../simulation/ids";
import { measurePosition, availableMeasureSteps } from "../simulation";
import { addDays, makeIsoDate } from "../simulation/dates";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { money } from "../simulation/resources";
import { homeStateKey } from "../simulation/state-jurisdiction-id";
import { PROPERTY_BASE_KEY } from "../simulation/property-tax-bases";
import { LOCAL_PAYROLL_BASE_KEY } from "../simulation/payroll-tax-bases";
import { stateTaxPowerEvidenceFor } from "../simulation/state-tax-authority";
import { scheduledActivityState } from "../simulation/time-work";
import {
  castMemberBallot,
  pendingChamberQuestions,
} from "../simulation/governing/legislative-clock";
import { personName } from "../simulation/people";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { passOrdinaryDays } from "./ordinary-life";
import { fileTaxProposalFromOffice } from "./tax-work";
import {
  respondCareerOffer,
  seekCareerOffer,
  startCareerWork,
} from "../simulation/career-path7";
import { ordinaryStateHouseFilingEntry } from "../../tests/fixtures/multistate-funded-service-entry";
import type { FundedServiceEntryState } from "../../tests/fixtures/multistate-funded-service-entry";
import type { EntityId, TaxTerms, World } from "../simulation";

/** The four states whose ordinary state-house route exists as a fixture; the
 * seed draws one, and the run names it. */
const STATES: readonly FundedServiceEntryState[] = ["KY", "MN", "NV", "NE"];

function drawState(seed: string): FundedServiceEntryState {
  return STATES[parseInt(stableHash(seed).slice(-8), 16) % STATES.length]!;
}

function reopen(world: World): World {
  return deserializeWorld(serializeWorld(world));
}

function termsFor(instrument: "property" | "payroll"): TaxTerms {
  return {
    seriesKey: `tax:state-${instrument}`,
    baseKey:
      instrument === "property" ? PROPERTY_BASE_KEY : LOCAL_PAYROLL_BASE_KEY,
    baseLabel:
      instrument === "property"
        ? "Assessed value of a household's home or a year's rent"
        : "Wages paid at an employer in the state",
    rateNumerator: 1,
    rateDenominator: 100,
    allowanceMinorUnits: 0,
    exemptBaseKeys: [],
    currency: money(0, "USD").currency,
    effectiveDelayDays: 90,
    collectionLagDays: 30,
    publicPurpose: "State services",
    assumptionNote: "Authored proof terms.",
    legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
    instrument,
  };
}

function enact(
  world: World,
  measureId: EntityId,
  personId: EntityId,
  memberSeatStableKey: string,
): World {
  const input = { measureId, playerPersonId: personId, memberSeatStableKey };
  let next = world;
  for (
    let turn = 0;
    turn < 100 && measurePosition(next, measureId).outcome === null;
    turn++
  ) {
    const entry = resolveLegislativeAssignmentForMeasure(next, input);
    if (entry.kind !== "available") throw new Error(entry.reason);
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(`No step at ${measurePosition(next, measureId).phase}.`);
    for (const forum of pendingChamberQuestions(next, measureId)) {
      if (!forum.members.some((member) => member.personId === personId))
        continue;
      next = castMemberBallot(next, {
        personId,
        question: forum.question,
        ballot: "yea",
      });
    }
    next = publishLegislativeTransition(
      next,
      applyLegislativeCommand(
        next,
        entry.assignment,
        institutionOwnsStep(next, entry.assignment, step)
          ? { kind: "await-institution", step }
          : { kind: "take-step", step },
      ).world,
    );
  }
  expect(measurePosition(next, measureId).outcome).toBe("enacted");
  return next;
}

function advanceTo(world: World, target: string): World {
  let next = world;
  for (let guard = 0; guard < 400 && next.currentDate < target; guard++) {
    if (next.control.kind === "person") {
      const personId = next.control.personId;
      for (const activity of next.history.scheduledActivities.filter(
        (row) =>
          row.kind === "tentative" &&
          row.participantPersonIds.includes(personId) &&
          scheduledActivityState(next, row.id).status === "scheduled",
      ))
        next = declineVenueActivity(next, personId, activity.id);
    }
    next = passOrdinaryDays(next, 1);
  }
  return next;
}

describe("LW-04 a state's own property and payroll tax lands on named payers", () => {
  it.each([
    { seed: "m2-state-property-tax", instrument: "property" as const },
    { seed: "m2-state-payroll-tax", instrument: "payroll" as const },
  ])(
    "is filed by a seated member, passed by the state legislature and reaches payers ($instrument, $seed)",
    ({ seed, instrument }) => {
      const state = drawState(seed);
      const fixture = ordinaryStateHouseFilingEntry(state);
      const personId = fixture.personId;
      let world = fixture.world;
      const entry = resolveLegislativeFilingEntry(world, personId);
      expect(entry.kind).toBe("available");
      if (entry.kind !== "available") throw new Error(entry.reason);
      const power = stateTaxPowerEvidenceFor(
        entry.seat.jurisdictionKey,
        instrument,
      )!;
      process.stderr.write(
        `STATE TAX world seed ${seed}, state ${state}, date ${world.currentDate}, ${instrument} authority ${power.authorityStatus} (${power.sourceArtifactId}), estimated ${power.estimated}\n`,
      );

      const filed = fileTaxProposalFromOffice(world, {
        personId,
        stableKey: `m2-state-tax:${seed}`,
        terms: termsFor(instrument),
      });
      expect(filed.world.history.taxProposals!.at(-1)!.power).toMatchObject({
        level: "STATE",
        instrument,
      });
      world = enact(
        reopen(filed.world),
        filed.measureId,
        personId,
        entry.seat.relationshipStableKey,
      );
      const proposal = world.history.taxProposals!.find(
        (row) => row.measureId === filed.measureId,
      )!;
      const policy = world.history.taxPolicies!.find(
        (row) => row.proposalId === proposal.id,
      )!;
      const baseKey =
        instrument === "property" ? PROPERTY_BASE_KEY : LOCAL_PAYROLL_BASE_KEY;
      // Quiet before the date: the law is passed but not yet in force.
      expect(
        (world.history.taxBases ?? []).filter((row) => row.baseKey === baseKey),
      ).toHaveLength(0);

      if (instrument === "payroll") {
        const provider = CAREER_PROVIDERS.find(
          (row) => row.pathId === "shop-assistant",
        )!;
        world = advanceTo(world, policy.effectiveAt);
        const sought = seekCareerOffer(world, provider);
        expect(sought.ok).toBe(true);
        world = sought.world;
        const engagement = world.history.workRelationships.at(-1)!;
        world = respondCareerOffer(world, engagement.id, provider, true).world;
        world = passOrdinaryDays(world, 1);
        const started = startCareerWork(world, engagement.id, provider);
        expect(started.ok).toBe(true);
        world = started.world;
        world = advanceTo(world, addDays(world.currentDate, 20));
      } else {
        world = advanceTo(world, addDays(policy.effectiveAt, 1));
      }
      world = reopen(world);
      const bases = (world.history.taxBases ?? []).filter(
        (row) => row.baseKey === baseKey,
      );
      expect(bases.length).toBeGreaterThan(0);
      const sample = bases[0]!;
      const payerId = (sample.payer as { personId: EntityId }).personId;
      const assessment = world.history.taxAssessments!.find(
        (row) => row.baseId === sample.id,
      )!;
      expect(assessment.taxAmount.minorUnits).toBe(
        Math.round(sample.amount.minorUnits / 100),
      );
      if (instrument === "property")
        for (const base of bases)
          expect(
            homeStateKey(
              world,
              (base.payer as { personId: EntityId }).personId,
            ),
          ).toBe(`US-${state}`);
      process.stderr.write(
        `STATE PAYER ${personName(world.people[payerId]!)} (${state}) ${instrument} base ${sample.amount.minorUnits} tax ${assessment.taxAmount.minorUnits}; ${bases.length} bases, ${world.history.taxAssessments!.length} assessments. ${sample.assumptionNote}\n`,
      );
    },
    600_000,
  );

  it("reads the state's own rule, and refuses where the catalog says a state may not", () => {
    expect(stateTaxPowerEvidenceFor("US-KY", "sales")).toMatchObject({
      level: "STATE",
      instrument: "sales",
    });
    expect(stateTaxPowerEvidenceFor("not-a-state", "sales")).toBeNull();
    expect(makeIsoDate("2026-01-01")).toBe(
      stateTaxPowerEvidenceFor("US-MN", "payroll")!.asOf,
    );
  });
});
