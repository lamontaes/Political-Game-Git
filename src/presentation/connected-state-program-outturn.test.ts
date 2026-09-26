import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  deserializeWorld,
  nextMeasureStableKey,
  recordEnactment,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  ensureStateExecutiveIncumbent,
  currentStateExecutiveHolders,
} from "../simulation/nationwide-world/state-executives";
import { daysBetween } from "../simulation/dates";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { createOrganization } from "../simulation/life";
import {
  advanceWorld,
  availableMeasureSteps,
  measurePosition,
} from "../simulation";
import {
  commitPublicProgram,
  programAppropriations,
  programCapacity,
  programInstallments,
  programOutturns,
  programPosition,
  programAuthority,
} from "../simulation/governing/public-program";
import {
  programAlternativesFor,
  programOperatorOrganization,
} from "../simulation/governing/program-governing";
import { createResourcePosition, money } from "../simulation/resources";
import { pay } from "../../tests/fixtures/public-program-fixture";
import { applyLegislativeStep } from "./legislation-session";
import { fileDraft } from "./legislation-docket";
import { publishLegislativeTransition } from "./publish-legislative-transition";

const TEST_NOTE =
  "Connected state-program test fixture; authored cash, not a real receipt.";
const STATE_PROGRAM = "transit:ne";

function advance(world: World, count: number): World {
  return advanceWorld(world, count, createCampaignElectionTransitionRegistry());
}

function enactNebraskaTransitAppropriation(
  initial: World,
  scenario: ReturnType<typeof createLegislativeScenario>,
): { readonly world: World; readonly measureId: EntityId } {
  const jurisdictionId =
    initial.history.legislativeMeasures![0]!.jurisdictionId;
  const filed = fileDraft(initial, {
    scenarioKey: "nebraska",
    playerPersonId: scenario.playerPersonId,
    jurisdictionId,
    familyKey: "appropriations",
    variantKey: "transit-staged-service-v2",
    authorityKey: "standing:rural-transit-assistance",
  });
  const measureId = filed.bill.measureId;
  const context = { ...scenario, measureId };
  let world = filed.world;
  for (
    let guard = 0;
    guard < 40 && measurePosition(world, measureId).phase !== "enacted";
    guard++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step)
      throw new Error("The transit bill has no next legislative step.");
    if (step === "record-enactment") {
      world = publishLegislativeTransition(
        world,
        recordEnactment(world, {
          stableKey: nextMeasureStableKey(
            world,
            measureId,
            `measure:${measureId}:enactment`,
          ),
          measureId,
          effectiveAt: world.currentDate,
        }),
      );
    } else {
      world = publishLegislativeTransition(
        world,
        applyLegislativeStep(context, world, step).world,
      );
    }
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return { world, measureId };
}

function fundAccount(
  world: World,
  jurisdictionId: EntityId,
  accountOrganizationId: EntityId,
  amountMinorUnits: number,
): World {
  let next = createOrganization(world, {
    stableKey: "connected-state-program:fixture-payer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: TEST_NOTE },
    initialProfile: {
      name: "Connected state-program fixture payer",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const payerId = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: "connected-state-program:fixture-payer:USD",
    owner: { kind: "organization", organizationId: payerId },
    openedAt: next.currentDate,
    openingBalance: money(amountMinorUnits, "USD"),
    provenance: { kind: "authored", note: TEST_NOTE },
  });
  return pay(
    next,
    "connected-state-program:fixture-cash-transfer",
    payerId,
    accountOrganizationId,
    amountMinorUnits,
  );
}

describe("a state appropriation funds and restores its recorded service", () => {
  it("carries a Nebraska transit law through the saved governor, payment, and capacity outturn", () => {
    const scenario = createLegislativeScenario("nebraska");
    const jurisdictionId =
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId;
    const governorCandidate = scenario.world.personOrder.find(
      (personId) => personId !== scenario.playerPersonId,
    );
    if (!governorCandidate)
      throw new Error("The legislative scenario needs a governor candidate.");
    let world = ensureStateExecutiveIncumbent(
      scenario.world,
      governorCandidate,
      "NE",
    );
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === "NE",
    );
    if (!governor) throw new Error("Nebraska has no saved state executive.");

    const enacted = enactNebraskaTransitAppropriation(world, scenario);
    world = enacted.world;
    const appropriation = programAppropriations(world, STATE_PROGRAM).find(
      (record) => record.sourceMeasureId === enacted.measureId,
    );
    expect(appropriation).toBeDefined();
    if (!appropriation)
      throw new Error("The law wrote no transit appropriation.");
    expect(programCapacity(world, STATE_PROGRAM)).toMatchObject({
      unitsTotal: 1,
      unitsOperational: 0,
      basis: { kind: "game-profile" },
    });

    const toAvailability = daysBetween(
      world.currentDate,
      appropriation.availableFrom,
    );
    expect(toAvailability).toBeGreaterThanOrEqual(0);
    if (toAvailability > 0) world = advance(world, toAvailability);

    const alternative = programAlternativesFor(world, appropriation).find(
      (candidate) => candidate.key === "restore-units",
    );
    if (!alternative)
      throw new Error("The state capacity profile has no restoration choice.");
    const paymentMinorUnits = alternative.installments.reduce(
      (total, installment) => total + installment.amount.minorUnits,
      0,
    );
    expect(paymentMinorUnits).toBeGreaterThan(0);
    const dueClockAlternative = {
      ...alternative,
      key: "restore-units-through-due-clock",
      installments: alternative.installments.map((installment) => ({
        ...installment,
        afterDays: Math.max(1, installment.afterDays),
      })),
    };
    world = fundAccount(
      world,
      jurisdictionId,
      appropriation.accountOrganizationId,
      paymentMinorUnits,
    );
    const authority = programAuthority(
      world,
      governor.personId,
      { kind: "state-executive" },
      appropriation,
    );
    expect(authority.status).toBe("available");

    const operator = programOperatorOrganization(
      world,
      appropriation.programKey,
      jurisdictionId,
    );
    world = operator.world;
    const committed = commitPublicProgram(world, {
      appropriationId: appropriation.id,
      alternative: dueClockAlternative,
      personId: governor.personId,
      office: { kind: "state-executive" },
      recipientOrganizationId: operator.organizationId,
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) throw new Error(committed.reason);
    expect(
      programInstallments(committed.world, STATE_PROGRAM).some(
        (record) => record.commitmentId === committed.recordId,
      ),
    ).toBe(false);
    world = advance(committed.world, 1);

    const commitment = world.history.publicProgramRecords?.find(
      (record) =>
        record.kind === "commitment" &&
        record.appropriationId === appropriation.id,
    );
    if (commitment?.kind !== "commitment")
      throw new Error("The state-executive commitment was not recorded.");
    expect(commitment).toMatchObject({
      kind: "commitment",
      decidedByPersonId: governor.personId,
      deliveryLeadDays: dueClockAlternative.deliveryLeadDays,
    });
    const installment = programInstallments(world, STATE_PROGRAM).find(
      (record) =>
        record.commitmentId === commitment.id && record.status === "posted",
    );
    expect(installment).toBeDefined();
    if (!installment) throw new Error("The funded installment did not post.");
    const leadDays = commitment.deliveryLeadDays;
    if (leadDays === null || leadDays <= 0)
      throw new Error("The commitment did not save a positive delivery lead.");
    world = advance(world, leadDays - 1);
    expect(
      programOutturns(world, STATE_PROGRAM).filter(
        (record) => record.commitmentId === commitment.id,
      ),
    ).toHaveLength(0);
    world = advance(world, 1);

    const outturn = programOutturns(world, STATE_PROGRAM).find(
      (record) => record.commitmentId === commitment.id,
    );
    expect(outturn).toMatchObject({ restoredUnits: 1, unitsOperational: 1 });
    expect(
      programPosition(world, STATE_PROGRAM, appropriation.id),
    ).toMatchObject({
      posted: money(paymentMinorUnits, "USD"),
      unitsOperational: 1,
    });

    const outlaysMetricId = Object.values(world.metricCatalog.definitions).find(
      (definition) => definition.stableKey === "government.outlays",
    )?.id;
    expect(outlaysMetricId).toBeDefined();
    const outlays = world.history.metricStates.find(
      (record) => record.metricId === outlaysMetricId,
    );
    expect(outlays).toMatchObject({
      scope: { jurisdictionId, segmentKey: null },
      value: { kind: "money", money: money(paymentMinorUnits, "USD") },
      provenance: { kind: "simulated", sourceEntityIds: [installment.eventId] },
    });

    const reopened = deserializeWorld(serializeWorld(world));
    expect(programOutturns(reopened, STATE_PROGRAM)).toEqual(
      programOutturns(world, STATE_PROGRAM),
    );
    expect(
      reopened.history.metricStates.find(
        (record) => record.metricId === outlaysMetricId,
      ),
    ).toEqual(outlays);
    expect(
      programAppropriations(reopened, STATE_PROGRAM).some(
        (record) => record.id === appropriation.id,
      ),
    ).toBe(true);
  });
});
