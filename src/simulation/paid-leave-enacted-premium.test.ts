import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { stableHash } from "./ids";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { lawInForce } from "./governing/law-in-force";
import { PAID_LEAVE_QUESTION } from "./state-paid-leave-law";
import { paidLeavePremium, premiumOn } from "./state-paid-leave-law";
import { createOrganization, createWorkRelationship } from "./life";
import {
  createResourcePosition,
  createWorkCompensation,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { assessPaychecksTaxes } from "./statutory-tax";
import { serializeWorld, deserializeWorld } from "./serialization";
import { personName } from "./people";
import type { LawAmountUnit } from "./law-consequence-types";
import type { World, EntityId } from "./types";

const SEED = "a45-enacted-premium-all56";
const rankedPlaces = [...lifePlaceStateIdentities()].sort((a, b) =>
  stableHash(`${SEED}:${a.jurisdictionKey}`).localeCompare(
    stableHash(`${SEED}:${b.jurisdictionKey}`),
  ),
);
const supported = (place: (typeof rankedPlaces)[number]) =>
  !!legislativePackForJurisdiction(
    stateJurisdictionForKey(place.jurisdictionKey)!.id,
  );
const places = rankedPlaces.filter(supported).slice(0, 5);
const unsupported = rankedPlaces
  .slice(0, 5)
  .filter((place) => !supported(place));

function enactedPremium(
  place: string,
  value: number = 37.5,
  unit: LawAmountUnit = "basis-points",
  cap: number = 50,
) {
  const f = smallWorld({
    place,
    date: "2029-01-05",
    people: 3,
    seed: `${SEED}:${place}`,
    offices: ["governor"],
    laws: [PAID_LEAVE_QUESTION],
  });
  const pack = legislativePackForJurisdiction(f.stateJurisdictionId);
  if (!pack) return { f, world: f.world, measureId: null };
  let world = introduceMeasure(f.world, {
    stableKey: `${SEED}:bill`,
    jurisdictionId: f.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "Authored employee premium",
    shortTitle: "Paid-leave premium terms",
    summary: "Controlled terms and votes; not a researched rate.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    sponsorPersonId: null,
    propositionIds: [f.propositionIds[PAID_LEAVE_QUESTION]!],
    propositionAnswers: [
      { propositionId: f.propositionIds[PAID_LEAVE_QUESTION]!, answer: "yes" },
    ],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = recordFiledProvision(world, {
    stableKey: `${SEED}:terms`,
    measureId,
    provisionKey: "premium",
    sectionNumber: 1,
    heading: "Employee premium and annual covered wages",
    text: "The replacement share is specified by this provision.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "covered workers",
    },
    applicationScope: {
      jurisdictionId: f.stateJurisdictionId,
      segmentKey: null,
    },
    lawTerms: [
      { questionKey: PAID_LEAVE_QUESTION, key: "rate", value, unit },
      {
        questionKey: PAID_LEAVE_QUESTION,
        key: "cap",
        value: cap,
        unit: "dollars/year",
      },
    ],
  });
  const before = world;
  world = enactThroughDesk(world, measureId, {
    context: {
      pack,
      measureId,
      bodies: pack.chambers.map((chamber) =>
        seatBodyForPack(
          chamber.chamberKey,
          chamber.name,
          authoredScenarioSeatCount(pack, chamber.chamberKey),
          [],
          false,
        ),
      ),
      committeeMemberCount: null,
      votePlan: Object.fromEntries(
        pack.chambers.flatMap((chamber) => [
          ...chamber.committees.map((committee) => [
            votePlanKeyForCommittee(committee.committeeKey),
            { yea: committee.appointedMembers ?? 1 },
          ]),
          ...chamber.floorStages.map((stage) => [
            votePlanKeyForFloor(chamber.chamberKey, stage.stageKey),
            { yea: authoredScenarioSeatCount(pack, chamber.chamberKey) },
          ]),
        ]),
      ),
      governorAction: null,
      governorRationale:
        "Controlled favorable votes for employee-premium terms.",
    },
  });
  return { f, world, measureId, before };
}

function recordedPay(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
) {
  // The existing desk fixture restores resident control while implementation
  // work belongs to the signer. Keep that actual signer in control for writers.
  const holder = currentStateExecutiveHolders(world).find(
    (row) =>
      stateJurisdictionForKey(`US-${row.stateUsps}`)?.id === jurisdictionId,
  )!;
  expect(holder).toBeDefined();
  world = { ...world, control: { kind: "person", personId: holder.personId } };
  const provenance = {
    kind: "authored" as const,
    note: "Controlled saved wage transfer, not natural work or a researched wage.",
  };
  const date = world.currentDate;
  world = createOrganization(world, {
    stableKey: "a45:employer",
    formedAt: date,
    provenance,
    initialProfile: {
      name: "Recorded fixture employer",
      classification: "enterprise:retail",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a45:work",
    personId,
    organizationId,
    startedAt: date,
    kind: "employment:employee",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Saved worker",
      occupationClassification: null,
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 20 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const workRelationshipId = world.history.workRelationships.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a45:employer-cash",
    owner: { kind: "organization", organizationId },
    openedAt: date,
    openingBalance: money(7200, "USD"),
    provenance,
  });
  if (
    !resourcePositionAt(
      world,
      { kind: "person", personId },
      money(0, "USD").currency,
    )
  ) {
    world = createResourcePosition(world, {
      stableKey: "a45:worker-cash",
      owner: { kind: "person", personId },
      openedAt: date,
      openingBalance: money(0, "USD"),
      provenance,
    });
  }
  world = createWorkCompensation(world, {
    stableKey: "a45:pay",
    workRelationshipId,
    startsAt: date,
    amount: money(7200, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  world = recordResourceTransferOutcome(world, {
    stableKey: "a45:pay-completed",
    resourceFlowId: flow.id,
    periodStartsAt: date,
    periodEndsAt: date,
    occurredAt: date,
    status: "completed",
    attemptedAmount: money(7200, "USD"),
    transferredAmount: money(7200, "USD"),
    reasonKind: null,
    note: provenance.note,
    provenance,
  });
  return {
    world,
    outcomeId: world.history.resourceTransferOutcomes.at(-1)!.id,
  };
}

const fixtures = new Map<string, ReturnType<typeof enactedPremium>>();
function fixture(
  place = places[0]!.jurisdictionKey,
  rate = 37.5,
  unit: LawAmountUnit = "basis-points",
  cap = 50,
) {
  const key = JSON.stringify([place, rate, unit, cap]);
  if (!fixtures.has(key))
    fixtures.set(key, enactedPremium(place, rate, unit, cap));
  return fixtures.get(key)!;
}

describe("A45 final employee premium terms reach the sole statutory writer", () => {
  for (const place of unsupported)
    it.todo(
      `${place.jurisdictionKey}: canonical legislature is absent; not an enacted-premium proof`,
    );
  it.each(places)(
    "withholds the bill rate and cap from saved pay in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const { f, world, measureId, before } = fixture(jurisdictionKey);
      expect(measureId).not.toBeNull();
      const law = lawInForce(
        world,
        f.stateJurisdictionId,
        f.propositionIds[PAID_LEAVE_QUESTION]!,
        world.currentDate,
        "enacted-only",
      );
      expect(law?.measureId).toBe(measureId);
      expect(
        paidLeavePremium(before!, jurisdictionKey, before!.currentDate),
      ).toEqual(
        paidLeavePremium(f.world, jurisdictionKey, f.world.currentDate),
      );
      const premium = paidLeavePremium(
        world,
        jurisdictionKey,
        world.currentDate,
      );
      expect(premium).toMatchObject({
        kind: "premium",
        employeeRatePerMillion: 3750,
        annualWageCapMinor: 5000,
        lawMeasureIds: [measureId],
      });
      if (premium.kind !== "premium") throw new Error(premium.kind);
      expect(premium.estimatedFromAverage).toBeUndefined();
      expect(premiumOn(7200, 0, premium)).toEqual({
        taxableMinor: 5000,
        premiumMinor: 19,
      });
      expect(premiumOn(7200, 5000, premium)).toEqual({
        taxableMinor: 0,
        premiumMinor: 0,
      });
      const pay = recordedPay(world, f.personId, f.stateJurisdictionId);
      const paid = assessPaychecksTaxes(pay.world, [pay.outcomeId]);
      const liability = paid.history.statutoryTaxLiabilities!.find(
        (row) =>
          row.sourceOutcomeId === pay.outcomeId &&
          row.taxKey.endsWith(":paid-leave-premium"),
      )!;
      expect(liability).toMatchObject({
        status: "assessed",
        taxableAmount: money(5000, "USD"),
        liability: money(19, "USD"),
        lawMeasureIds: [measureId],
      });
      const allocation = paid.history.statutoryTaxPayments!.find(
        (row) => row.liabilityId === liability.id,
      )!;
      expect(allocation.amount).toEqual(money(19, "USD"));
      const transfer = paid.history.resourceTransferOutcomes.find(
        (row) => row.id === allocation.resourceOutcomeId,
      )!;
      expect(transfer.status).toBe("completed");
      expect(transfer.transferredAmount.minorUnits).toBeGreaterThanOrEqual(19);
      const restored = deserializeWorld(serializeWorld(paid));
      const repeated = assessPaychecksTaxes(restored, [pay.outcomeId]);
      expect(repeated.history.statutoryTaxLiabilities).toEqual(
        paid.history.statutoryTaxLiabilities,
      );
      expect(repeated.history.statutoryTaxPayments).toEqual(
        paid.history.statutoryTaxPayments,
      );
      expect(repeated.history.resourceTransferOutcomes).toEqual(
        paid.history.resourceTransferOutcomes,
      );
      expect(
        resourcePositionAt(
          repeated,
          { kind: "person", personId: f.personId },
          money(0, "USD").currency,
        ),
      ).toEqual(
        resourcePositionAt(
          paid,
          { kind: "person", personId: f.personId },
          money(0, "USD").currency,
        ),
      );
      stdout.write(
        JSON.stringify({
          place: jurisdictionKey,
          person: personName(paid.people[f.personId]!),
          personId: f.personId,
          lawId: measureId,
          liabilityId: liability.id,
          paymentId: allocation.id,
          transferId: transfer.id,
          premiumMinor: 19,
        }) + "\n",
      );
    },
  );
  it.each([
    { value: -1, unit: "basis-points" as const },
    { value: 10001, unit: "basis-points" as const },
    { value: 37.5, unit: "ratio" as const },
  ])(
    "preserves the labeled existing rate for invalid $value $unit",
    ({ value, unit }) => {
      const { f, world } = fixture(places[0]!.jurisdictionKey, value, unit);
      const actual = paidLeavePremium(
        world,
        places[0]!.jurisdictionKey,
        world.currentDate,
      );
      expect(actual.kind).toBe("premium");
      if (actual.kind !== "premium") throw new Error(actual.kind);
      expect(actual.employeeRatePerMillion).not.toBe(value * 100);
      expect(actual.annualWageCapMinor).toBe(5000);
      const prior = paidLeavePremium(
        f.world,
        places[0]!.jurisdictionKey,
        f.world.currentDate,
      );
      if (prior.kind === "premium")
        expect(actual.employeeRatePerMillion).toBe(
          prior.employeeRatePerMillion,
        );
      else
        expect(actual.estimatedFromAverage).toContain("ESTIMATED FROM AVERAGE");
    },
  );
  it.each([-1, 0.001])(
    "retains an accurately labeled fallback cap for %s dollars/year",
    (cap) => {
      const place = places.find(
        (row) =>
          fixture(row.jurisdictionKey).f.world &&
          paidLeavePremium(
            fixture(row.jurisdictionKey).f.world,
            row.jurisdictionKey,
            fixture(row.jurisdictionKey).f.world.currentDate,
          ).kind === "none",
      )!;
      expect(place).toBeDefined();
      const { world } = fixture(
        place.jurisdictionKey,
        37.5,
        "basis-points",
        cap,
      );
      const premium = paidLeavePremium(
        world,
        place.jurisdictionKey,
        world.currentDate,
      );
      expect(premium).toMatchObject({
        kind: "premium",
        employeeRatePerMillion: 3750,
      });
      if (premium.kind !== "premium") throw new Error(premium.kind);
      expect(premium.annualWageCapMinor).not.toBe(cap * 100);
      expect(premium.estimatedFromAverage).toContain("annual covered-wage cap");
      expect(premium.estimatedFromAverage).toContain(
        "employee rate is the bill",
      );
    },
  );
  it("uses an explicit zero cap rather than treating it as a missing term", () => {
    const { world } = fixture(
      places[0]!.jurisdictionKey,
      37.5,
      "basis-points",
      0,
    );
    const premium = paidLeavePremium(
      world,
      places[0]!.jurisdictionKey,
      world.currentDate,
    );
    expect(premium).toMatchObject({ kind: "premium", annualWageCapMinor: 0 });
    if (premium.kind !== "premium") throw new Error(premium.kind);
    expect(premiumOn(7200, 0, premium)).toEqual({
      taxableMinor: 0,
      premiumMinor: 0,
    });
  });
  it("does not apply a provision appended after enactment", () => {
    const { f, world, measureId } = fixture();
    const changed = recordFiledProvision(world, {
      stableKey: "a45:late",
      measureId: measureId!,
      provisionKey: "late-premium",
      sectionNumber: 2,
      heading: "Unadopted",
      text: "Not adopted.",
      beneficiary: { kind: "general-application", appliesToLabel: "workers" },
      applicationScope: {
        jurisdictionId: f.stateJurisdictionId,
        segmentKey: null,
      },
      lawTerms: [
        {
          questionKey: PAID_LEAVE_QUESTION,
          key: "rate",
          value: 99,
          unit: "basis-points",
        },
      ],
    });
    expect(
      paidLeavePremium(
        changed,
        places[0]!.jurisdictionKey,
        changed.currentDate,
      ),
    ).toEqual(
      paidLeavePremium(world, places[0]!.jurisdictionKey, world.currentDate),
    );
  });
  it("keeps an adopted premium above a typical-program rate through Save/Continue", () => {
    const { f, world } = fixture(places[0]!.jurisdictionKey, 600);
    const pay = recordedPay(world, f.personId, f.stateJurisdictionId);
    const paid = assessPaychecksTaxes(pay.world, [pay.outcomeId]);
    const liability = paid.history.statutoryTaxLiabilities!.find(
      (row) =>
        row.sourceOutcomeId === pay.outcomeId &&
        row.taxKey.endsWith(":paid-leave-premium"),
    )!;
    expect(liability.liability).toEqual(money(300, "USD"));
    expect(
      deserializeWorld(serializeWorld(paid)).history.statutoryTaxLiabilities,
    ).toEqual(paid.history.statutoryTaxLiabilities);
  });
});
