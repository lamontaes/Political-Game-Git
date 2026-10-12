import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as life from "../../simulation/life-queries";
import {
  createOrganization,
  createEducationEnrollment,
  recordHouseholdLocation,
} from "../../simulation/life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { publicGovernmentOrganizationKey } from "../../simulation/public-government-identity";
import {
  createResourcePosition,
  createResourceFlow,
  money,
} from "../../simulation/resources";
import {
  resourcePositionAt,
  resourceFlowTermsAt,
  resourceFlowsForEndpoint,
  loanBalanceComponentsAt,
} from "../../simulation/resource-queries";
import { addDays } from "../../simulation/dates";
import { lifePathDefinition } from "../../simulation/life-paths2-catalog";
import { studyProgressSummary } from "../../simulation/education-study-progression";
import { householdLoansOf } from "../../simulation/household-loans";
import { financeRecordedStudentTuition } from "../../simulation/student-debt";
import type { RecordedStudentFinancingInput } from "../../simulation/student-debt";
import * as oldAid from "../../simulation/student-aid-facts";
import {
  recordedStudentAidFacts,
  financeStudentTuitionWithSavedAidFacts,
  type StudentAidFacts,
} from "./student-aid";
import { housingVoucherIncomeScope, type HousingFacts } from "./housing-income";
import { housingVoucherIncomeScope as oldHousing } from "../../simulation/housing-voucher-eligibility";
import { recordedMonthlyPayByPerson } from "../../simulation/household-pay";
import { hudRentRowFor } from "../../simulation/living-world/town-rent";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../simulation/life-places";
import incomeScope from "../../../data/research/money/housing-voucher-income-scope.json";
import type { World } from "../../simulation/types";
const USD = money(0, "USD").currency;
function fixture(placeKey: string, studyCaller = false) {
  const base = smallWorld({
    place: placeKey,
    date: "2026-01-05",
    household: true,
    seed: `rules2-law-aid:${placeKey}`,
  });
  const created = { world: base.world, playerPersonId: base.personId };
  let world = ensureNationalElectionJurisdiction(created.world);
  const personId = created.playerPersonId;
  const provenance = {
    kind: "authored",
    note: "Controlled X7 bookkeeping fixture.",
  } as const;
  const owner = { kind: "person", personId } as const;
  if (!resourcePositionAt(world, owner, USD))
    world = createResourcePosition(world, {
      stableKey: "x7-cash",
      owner,
      openedAt: world.currentDate,
      openingBalance: money(20000, USD),
      provenance,
    });
  const openingCash = resourcePositionAt(world, owner, USD)!.liquidBalance
    .minorUnits;
  world = createOrganization(world, {
    stableKey: "x7-school",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded test college",
      classification: "service:education",
      locationJurisdictionId: null,
    },
  });
  const schoolId = world.history.organizations.at(-1)!.id;
  world = createEducationEnrollment(world, {
    stableKey: "x7-enrollment",
    personId,
    organizationId: schoolId,
    startedAt: world.currentDate,
    programKind: "postsecondary:college",
    contextKind: "program:college",
    provenance,
  });
  const enrollmentId = world.history.educationEnrollments.at(-1)!.id;
  world = createOrganization(world, {
    stableKey: publicGovernmentOrganizationKey({
      kind: "jurisdiction",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    }),
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded federal lender",
      classification: "sector:government",
      locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    },
  });
  const lenderId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "x7-federal-cash",
    owner: { kind: "organization", organizationId: lenderId },
    openedAt: world.currentDate,
    openingBalance: money(1000000, USD),
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: studyCaller
      ? `life-paths2.study-period:${enrollmentId}:1`
      : "x7-tuition",
    source: owner,
    recipient: { kind: "organization", organizationId: schoolId },
    startsAt: world.currentDate,
    amount: money(openingCash + 100000, USD),
    cadenceKind: "schedule:one-time",
    basisKind: "obligation:tuition",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const tuitionFlowId = world.history.resourceFlows.at(-1)!.id;
  const input: RecordedStudentFinancingInput = {
    enrollmentId,
    tuitionFlowId,
    annualLimit: money(100000, USD),
    academicYearStartsAt: world.currentDate,
    academicYearEndsAt: addDays(world.currentDate, 365),
    source: {
      kind: "source-record",
      reference:
        "Controlled test inputs; not a published federal loan program.",
      asOf: world.currentDate,
    },
    loan: {
      marketAnnualRateBasisPoints: 600,
      repayment: { kind: "installment", termMonths: 120 },
      lateFee: null,
      missedPaymentsToDefault: 3,
      missedPaymentsToCollections: 6,
    },
  };
  return { world, personId, lenderId, openingCash, input };
}
function aidFacts(
  world: World,
  path: ReturnType<typeof lifePathDefinition>,
): StudentAidFacts {
  const people = world.personOrder;
  const loans = new Map(
    people.map((id) => [
      id,
      householdLoansOf(world, { kind: "person", personId: id }),
    ]),
  );
  return {
    onDate: world.currentDate,
    people: world.people,
    educationEnrollments: world.history.educationEnrollments,
    events: world.history.events,
    enrollmentStates: new Map(
      world.history.educationEnrollments.map((row) => [
        row.id,
        life.educationEnrollmentStateAt(world, row.id),
      ]),
    ),
    progress: new Map(
      world.history.educationEnrollments.map((row) => [
        row.id,
        studyProgressSummary(world, row.id, path),
      ]),
    ),
    partnerships: new Map(
      people.map((id) => [id, life.activePartnershipsAt(world, id)]),
    ),
    partnershipStates: new Map(
      world.history.partnerships.map((row) => [
        row.id,
        life.partnershipStateHistory(world, row.id),
      ]),
    ),
    loans,
    loanComponents: new Map(
      [...loans.values()].flatMap((rows) =>
        rows.map(
          (row) =>
            [
              row.obligation.id,
              loanBalanceComponentsAt(world, row.obligation.id),
            ] as const,
        ),
      ),
    ),
  };
}
function housingFacts(world: World): HousingFacts {
  const people = world.personOrder;
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  return {
    nextSequence: world.history.nextSequence,
    people: world.people,
    incomeScope,
    memberships: new Map(
      people.map((id) => [id, life.householdMembershipsAt(world, id, cutoff)]),
    ),
    locations: new Map(
      world.history.households.map((row) => [
        row.id,
        life.householdLocationAt(world, row.id, cutoff),
      ]),
    ),
    places: new Map(
      world.jurisdictionOrder.flatMap((id) => {
        const p = lifePlaceByJurisdictionId(id);
        return p
          ? [[id, { stateJurisdictionKey: p.stateJurisdictionKey }] as const]
          : [];
      }),
    ),
    stateKeys: new Map(
      Object.keys(STATES).map((k) => [
        stateJurisdictionForKey("US-" + k)!.id,
        "US-" + k,
      ]),
    ),
    members: new Map(
      world.history.households.map((row) => [
        row.id,
        life.peopleInHouseholdAt(world, row.id, cutoff),
      ]),
    ),
    monthlyPay: recordedMonthlyPayByPerson(world, world.currentDate),
    hud: new Map(world.jurisdictionOrder.map((id) => [id, hudRentRowFor(id)])),
    flowsForPerson: new Map(
      people.map((id) => [
        id,
        resourceFlowsForEndpoint(world, { kind: "person", personId: id }),
      ]),
    ),
    terms: new Map(
      world.history.resourceFlows.map((row) => [
        row.id,
        resourceFlowTermsAt(world, row.id, cutoff),
      ]),
    ),
  };
}
describe("laws: native household and undergraduate financing callers", () => {
  it.each(Object.keys(STATES))(
    "matches published limits, principal ceiling and eligibility in %s",
    (usps) => {
      const f = fixture("US-" + usps);
      const path = lifePathDefinition("college-bachelors");
      {
        const world = recordHouseholdLocation(f.world, {
          stableKey: "rules2:home-location",
          householdId: f.world.history.households.at(-1)!.id,
          effectiveAt: f.world.currentDate,
          jurisdictionId: f.world.jurisdictionOrder.find((id) =>
            lifePlaceByJurisdictionId(id),
          )!,
          label: "Authored household home",
          kind: "residence:primary",
          provenance: {
            kind: "authored",
            note: "Actual saved household location for the eligibility control.",
          },
          supersedesLocationId: null,
        });
        expect(
          recordedStudentAidFacts(
            aidFacts(world, path),
            f.input.enrollmentId,
            path,
          ),
        ).toEqual(
          oldAid.recordedStudentAidFacts(world, f.input.enrollmentId, path),
        );
        expect(
          recordedStudentAidFacts(
            aidFacts(world, path),
            f.input.enrollmentId,
            path,
          ),
        ).not.toBeNull();
        const request = financeStudentTuitionWithSavedAidFacts(
          aidFacts(world, path),
          f.input,
          path,
        );
        const next = request
          ? financeRecordedStudentTuition(world, request)
          : world;
        expect(next).toEqual(
          oldAid.financeStudentTuitionWithSavedAidFacts(world, f.input, path),
        );
        const repeated = financeStudentTuitionWithSavedAidFacts(
          aidFacts(next, path),
          f.input,
          path,
        );
        expect(
          repeated ? financeRecordedStudentTuition(next, repeated) : next,
        ).toEqual(
          oldAid.financeStudentTuitionWithSavedAidFacts(next, f.input, path),
        );
        expect(
          housingVoucherIncomeScope(
            housingFacts(world),
            f.personId,
            world.currentDate,
          ),
        ).toEqual(oldHousing(world, f.personId, world.currentDate));
      }
    },
  );
});
