import { propositionIdFor } from "../simulation/public-budgets/fiscal";
import { operativeDateInWorld } from "../simulation/governing/law-in-force";
import { projectBudgetEconomy } from "./budget-economy";
import { recordPaidTransitProgramService } from "../simulation/governing/public-program-transit";
import { SeededRng } from "../simulation/rng";
import { type LawEffectStampedRecord } from "../simulation/law-effect-stamp";
import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { applyEnactedLawEffects } from "../simulation/enacted-law-effects";
import {
  commitPublicProgram,
  programAppropriations,
  programInstallments,
} from "../simulation/governing/public-program";
import { programOperatorOrganization } from "../simulation/governing/program-governing";
import { seatsForChamber } from "../simulation/legislature-game-profile";
import {
  legislativePackForJurisdiction,
  legislativeWorkKey,
} from "../simulation/legislative-institutions";
import { legislativeProcedureForJurisdiction } from "../simulation/legislative-procedure-world";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../simulation/legislation-scenarios";
import {
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_PROGRAM_KEY,
} from "../simulation/legislation-transit-families";
import {
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../simulation/nationwide-world/state-executives";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { money } from "../simulation/resources";
import { resourcePositionAt } from "../simulation/resource-queries";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import type { World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { applyLegislativeStep } from "./legislation-session";
import { fileDraft } from "./legislation-docket";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { publishLegislativeTransition } from "./publish-legislative-transition";

/** Synthetic passage inputs test the saved spending writers, not voter behavior. */
function enactedTransitBill(stateUsps: string, fareRelief = false) {
  const jurisdictionId = stateJurisdictionForKey(`US-${stateUsps}`)?.id;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${stateUsps}`,
    scope: "locality",
  })[0];
  if (!jurisdictionId || !place) throw new Error(`${stateUsps}: no locality`);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `all-state-transit-payment:${stateUsps}`,
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  });
  let world = ensureWorldStartingConditions(game.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  const savedProcedure = legislativeProcedureForJurisdiction(
    world,
    jurisdictionId,
  );
  if (!savedProcedure)
    throw new Error(`${stateUsps}: no saved opening procedure`);
  // A biennial odd-year opening remains on its own calendar. Time advances
  // through the ordinary world writer before this synthetic bill is filed.
  if (
    savedProcedure.sessionCadence === "biennial" &&
    savedProcedure.sessionYearParity === "odd"
  ) {
    world = advanceWorld(
      world,
      daysBetween(world.currentDate, makeIsoDate("2027-01-05")),
      createCampaignElectionTransitionRegistry(),
    );
  }
  world = ensureStateExecutiveIncumbent(world, game.playerPersonId, stateUsps);
  const pack = legislativePackForJurisdiction(jurisdictionId);
  if (!pack) throw new Error(`${stateUsps}: no legislature`);
  const filed = fileDraft(world, {
    scenarioKey: legislativeWorkKey(pack),
    playerPersonId: game.playerPersonId,
    jurisdictionId,
    familyKey: fareRelief ? "transit-access" : "appropriations",
    variantKey: fareRelief
      ? "enrollment-fare-relief"
      : STATE_TRANSIT_VARIANT_KEY,
    ...(fareRelief ? {} : { authorityKey: TRANSIT_PROGRAM_KEY }),
    parameterValues: fareRelief
      ? {
          "support-limit": {
            kind: "money",
            minorUnits: 800_000_000,
            currency: "USD",
          },
          "rider-eligibility": {
            kind: "enumerated",
            value: "assistance-enrollees",
          },
          "pilot-term": { kind: "duration-years", years: 2 },
        }
      : {
          appropriation: {
            kind: "money",
            minorUnits: 2_000_000,
            currency: "USD",
          },
          "service-window": { kind: "enumerated", value: "weekday" },
        },
  });
  world = filed.world;
  const measureId = filed.bill.measureId;
  // Authored saved-answer fixture matching automatic transit measures. Manual
  // fileDraft currently omits answers; this does not repair that production gap.
  const propositionId = propositionIdFor(
    world,
    fareRelief
      ? "us-policy-positions:transportation-infrastructure.fare-free-transit"
      : "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
  );
  if (!propositionId)
    throw new Error("The transit question is missing from the test catalog.");
  world = {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: world.history.legislativeMeasures!.map((row) =>
        row.id === measureId
          ? {
              ...row,
              propositionIds: [
                ...new Set([...(row.propositionIds ?? []), propositionId]),
              ],
              propositionAnswers: [{ propositionId, answer: "yes" as const }],
            }
          : row,
      ),
    },
  };

  const bodies = pack.chambers.map((chamber) => {
    const seats = seatsForChamber(pack, chamber.chamberKey)?.seats;
    if (!seats)
      throw new Error(`${stateUsps}: no seats in ${chamber.chamberKey}`);
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats,
      [],
      pack.structure === "unicameral",
    );
  });
  const votePlan: Record<string, { readonly yea: number }> = {};
  for (const chamber of pack.chambers) {
    const seats = bodies.find((body) => body.chamberKey === chamber.chamberKey)!
      .members.length;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(seats, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Supplied fictional signature for the payment fixture.",
  };
  for (let guard = 0; guard < 40; guard++) {
    if (measurePosition(world, measureId).outcome === "enacted") break;
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) throw new Error(`${stateUsps}: no passage step`);
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(procedure, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return {
    world,
    measureId,
    jurisdictionId,
    playerPersonId: game.playerPersonId,
  };
}

function paidService(
  stateUsps: string,
  purpose: "operating" | "maintenance" = "operating",
  fareRelief = false,
) {
  const enacted = enactedTransitBill(stateUsps, fareRelief);
  let { world } = enacted;
  const appropriations = world.history.publicProgramRecords!.filter(
    (row) =>
      row.kind === "appropriation" && row.sourceMeasureId === enacted.measureId,
  );
  expect(appropriations).toHaveLength(1);
  const appropriation = appropriations[0]!;
  if (appropriation.kind !== "appropriation")
    throw new Error("Missing authority");
  const programKey = appropriation.programKey;
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === enacted.measureId && row.outcome === "enacted",
  );
  if (!enactment) throw new Error("The appropriation has no enacted measure.");
  const operativeAt = operativeDateInWorld(world, enactment)?.date;
  if (!operativeAt) throw new Error("Missing law operative date");
  if (!fareRelief) expect(appropriation.availableFrom).toBe(operativeAt);
  // Generic family authority currently opens before the statute; wait for
  // the canonical operative date rather than claiming premature law effects.
  const paymentFrom =
    appropriation.availableFrom > operativeAt
      ? appropriation.availableFrom
      : operativeAt;
  expect(appropriation.amount.minorUnits).toBe(
    fareRelief ? 800_000_000 : 2_000_000,
  );
  const account = publicTaxAccountForJurisdiction(
    world,
    enacted.jurisdictionId,
  )!;
  expect(appropriation.accountOrganizationId).toBe(account.organizationId);
  expect(
    worldOpeningRecord(world)?.publicCashOpening?.stateByJurisdictionId[
      enacted.jurisdictionId
    ],
  ).toBeGreaterThan(0);

  const days = daysBetween(world.currentDate, paymentFrom);
  if (days > 0)
    world = advanceWorld(
      world,
      days,
      createCampaignElectionTransitionRegistry(),
    );
  const operator = programOperatorOrganization(
    world,
    programKey,
    enacted.jurisdictionId,
  );
  world = operator.world;
  const governor = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === stateUsps,
  );
  if (!governor) throw new Error(`${stateUsps}: no executive holder`);
  const choice = {
    appropriationId: appropriation.id,
    alternative: {
      key:
        purpose === "operating"
          ? "actual-operating-payment"
          : "maintenance-payment",
      title:
        purpose === "operating"
          ? "Pay the saved operating commitment"
          : "Pay modeled maintenance",
      installments: [
        {
          afterDays: 0,
          amount: money(10_000, "USD"),
          purpose,
        },
      ],
      deliveryLeadDays: null,
    },
    personId: governor.personId,
    office: { kind: "state-executive" as const },
    recipientOrganizationId: operator.organizationId,
  };
  const committed = commitPublicProgram(world, choice);
  expect(committed.ok, committed.ok ? "posted" : committed.reason).toBe(true);
  if (!committed.ok) throw new Error(`${stateUsps}: ${committed.reason}`);
  const saved = deserializeWorld(serializeWorld(committed.world));
  const payer = {
    kind: "organization" as const,
    organizationId: account.organizationId,
  };
  const openingCash = resourcePositionAt(
    world,
    payer,
    appropriation.amount.currency,
  )?.liquidBalance.minorUnits;
  const paidCash = resourcePositionAt(
    saved,
    payer,
    appropriation.amount.currency,
  )?.liquidBalance.minorUnits;
  expect(openingCash).toBeDefined();
  expect(paidCash).toBe(openingCash! - 10_000);
  const installments = programInstallments(saved, programKey);
  expect(installments).toHaveLength(1);
  expect(installments[0]?.status).toBe("posted");
  const flowId = installments[0]?.resourceFlowId;
  expect(flowId).toBeDefined();
  const flow = saved.history.resourceFlows.find((row) => row.id === flowId);
  expect(flow?.source).toEqual({
    kind: "organization",
    organizationId: account.organizationId,
  });
  expect(flow?.recipient).toEqual({
    kind: "organization",
    organizationId: operator.organizationId,
  });
  expect(flow?.jurisdictionId).toBe(enacted.jurisdictionId);
  expect(
    saved.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId === flowId &&
        row.status === "completed" &&
        row.transferredAmount.minorUnits === 10_000,
    ),
  ).toHaveLength(1);
  const service = saved.history.events.filter(
    (row) =>
      row.type === "transit.program-paid-service-hours" &&
      row.involvedEntityIds.includes(enacted.measureId),
  );
  if (purpose === "maintenance") {
    expect(service).toHaveLength(0);
    return saved;
  }
  expect(service).toHaveLength(0);
  expect(
    saved.history.metricStates.some(
      (row) =>
        row.value.kind === "quantity" &&
        row.value.quantity.unit === "duration:vehicle-service-hour",
    ),
  ).toBe(false);
  expect(
    programAppropriations(saved, programKey).filter(
      (row) => row.sourceMeasureId === enacted.measureId,
    ),
  ).toHaveLength(1);
  expect(serializeWorld(applyEnactedLawEffects(saved, enacted.measureId))).toBe(
    serializeWorld(saved),
  );
  const replay = commitPublicProgram(saved, choice);
  expect(replay.ok).toBe(false);
  expect(serializeWorld(replay.world)).toBe(serializeWorld(saved));
  return saved;
}

describe("same fictional state transit bill reaches exact paid service", () => {
  it("saved maintenance stays distinct from operating hours and mismatched payment chains", () => {
    const seed = "team6-transit-payment-purpose-20260930";
    const usps =
      US_STATE_USPS[new SeededRng(seed).integer(0, US_STATE_USPS.length - 1)]!;
    const maintained = paidService(usps, "maintenance");
    const outturn = maintained.history.publicProgramRecords!.find(
      (row) => row.kind === "capacity-outturn",
    );
    expect(outturn, `${seed}: ${usps}`).toBeDefined();
    if (!outturn || outturn.kind !== "capacity-outturn")
      throw new Error("Missing maintenance outturn.");
    expect(outturn.restoredUnits).toBe(0);
    const installment = maintained.history.publicProgramRecords!.find(
      (row) => row.kind === "installment" && row.id === outturn.installmentId,
    );
    expect(installment?.kind).toBe("installment");
    if (!installment || installment.kind !== "installment")
      throw new Error("Missing maintenance installment.");
    const commitment = maintained.history.publicProgramRecords!.find(
      (row) => row.kind === "commitment" && row.id === installment.commitmentId,
    );
    if (!commitment || commitment.kind !== "commitment")
      throw new Error("Missing maintenance commitment.");
    expect(commitment.installments[installment.installmentIndex]?.purpose).toBe(
      "maintenance",
    );
    expect(outturn.commitmentId).toBe(commitment.id);
    expect(
      maintained.history.metricStates.filter(
        (row) =>
          row.value.kind === "quantity" &&
          row.value.quantity.unit === "duration:vehicle-service-hour",
      ),
    ).toHaveLength(0);

    const operated = paidService(usps);
    const records = operated.history.publicProgramRecords!;
    const paid = records.find((row) => row.kind === "installment")!;
    if (paid.kind !== "installment")
      throw new Error("Missing operating installment.");
    const decision = records.find(
      (row) => row.kind === "commitment" && row.id === paid.commitmentId,
    )!;
    if (decision.kind !== "commitment")
      throw new Error("Missing operating commitment.");
    const authority = records.find(
      (row) =>
        row.kind === "appropriation" && row.id === decision.appropriationId,
    )!;
    if (authority.kind !== "appropriation")
      throw new Error("Missing operating appropriation.");
    expect(() =>
      recordPaidTransitProgramService(
        operated,
        authority,
        { ...decision, appropriationId: operated.id },
        paid,
      ),
    ).toThrow("saved appropriation payment chain");
    expect(() =>
      recordPaidTransitProgramService(operated, authority, decision, {
        ...paid,
        commitmentId: operated.id,
      }),
    ).toThrow("saved appropriation payment chain");
    const differentCurrency: World = {
      ...operated,
      history: {
        ...operated.history,
        resourceTransferOutcomes: operated.history.resourceTransferOutcomes.map(
          (row) =>
            row.resourceFlowId === paid.resourceFlowId
              ? {
                  ...row,
                  transferredAmount: money(
                    row.transferredAmount.minorUnits,
                    "CAD",
                  ),
                }
              : row,
        ),
      },
    };
    expect(() =>
      recordPaidTransitProgramService(
        differentCurrency,
        authority,
        decision,
        paid,
      ),
    ).toThrow("exact posted payment");
  });
  it.each(US_STATE_USPS)(
    "%s: enacted authority pays actual stamped cost without inferred hours",
    (usps) => {
      const world: World = paidService(usps);
      const budgetMetric = Object.values(world.metricCatalog.definitions).find(
        (row) => row.stableKey === "government.outlays",
      )!;
      const budgetStates = world.history.metricStates.filter(
        (row) =>
          row.metricId === budgetMetric.id && row.scope.segmentKey === null,
      );
      const budget = budgetStates.at(-1)!;
      const budgetStamp = (
        budget as typeof budget & LawEffectStampedRecord
      ).lawEffectStamps?.find((row) => row.effectKind === "state-spending");
      expect(budgetStamp).toBeDefined();
      const measure = world.history.legislativeMeasures!.find(
        (row) => row.id === budgetStamp!.governingLawKey,
      )!;
      const appropriation = world.history.publicProgramRecords!.find(
        (row) =>
          row.kind === "appropriation" && row.sourceMeasureId === measure.id,
      )!;
      expect(budgetStamp).toMatchObject({
        governingLawKey: measure.id,
        jurisdictionId: appropriation.jurisdictionId,
      });
      expect(budgetStamp?.sourceRecordIds).toContain(appropriation.id);
      expect(budget.value).toMatchObject({
        kind: "money",
        money: { minorUnits: 10_000, currency: "USD" },
      });
      expect(budget.supersedesStateId).toBe(budgetStates.at(-2)?.id);
      expect(budget.value).toEqual(budgetStates.at(-2)?.value);
      const budgetView = projectBudgetEconomy(
        world,
        appropriation.jurisdictionId,
      );
      const outlays = budgetView.fiscalGraphs
        .flatMap((row) => row.series)
        .find(
          (row) => row.seriesKey === "government.outlays:simulated-history",
        )!;
      expect(outlays.points).toHaveLength(1);
      expect(outlays.points[0]?.value).toBe(10_000);
      expect(outlays.points[0]?.pointKey).toBe(budget.id);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(
        (
          reopened.history.metricStates.find(
            (row) => row.id === budget.id,
          ) as typeof budget & LawEffectStampedRecord
        ).lawEffectStamps,
      ).toEqual(
        (budget as typeof budget & LawEffectStampedRecord).lawEffectStamps,
      );
    },
  );

  it("fare-relief payment stamps actual government cost without inventing eligible boardings", () => {
    const seed = "team6-fare-relief-cost-20260930";
    const usps =
      US_STATE_USPS[new SeededRng(seed).integer(0, US_STATE_USPS.length - 1)]!;
    const enacted = enactedTransitBill(usps, true);
    const law = enacted.world.history.legislativeEnactments!.find(
      (row) => row.measureId === enacted.measureId,
    )!;
    const operativeAt = operativeDateInWorld(enacted.world, law)?.date;
    if (!operativeAt) throw new Error("Missing operative date");
    const world = advanceWorld(
      enacted.world,
      daysBetween(enacted.world.currentDate, operativeAt) + 62,
      createCampaignElectionTransitionRegistry(),
    );
    const stamp = world.history.metricStates
      .flatMap(
        (row) =>
          (row as typeof row & LawEffectStampedRecord).lawEffectStamps ?? [],
      )
      .find(
        (row) =>
          row.questionKey ===
            "us-policy-positions:transportation-infrastructure.fare-free-transit" &&
          row.governingLawKey === enacted.measureId,
      );
    expect(stamp, usps).toBeDefined();
    expect(stamp?.effectKind).toBe("state-spending");
    const sourceRecordIds = stamp?.sourceRecordIds;
    if (!sourceRecordIds) throw new Error("Missing exact stamp source IDs");
    const paid = world.history.publicProgramRecords!.find(
      (row) => row.kind === "installment" && sourceRecordIds.includes(row.id),
    );
    if (!paid || paid.kind !== "installment")
      throw new Error("No exact paid installment");
    const commitment = world.history.publicProgramRecords!.find(
      (row) => row.kind === "commitment" && row.id === paid.commitmentId,
    );
    if (!commitment || commitment.kind !== "commitment")
      throw new Error("No exact commitment");
    const plan = commitment.installments[paid.installmentIndex]!;
    const outcome = world.history.resourceTransferOutcomes.find(
      (row) =>
        row.resourceFlowId === paid.resourceFlowId &&
        row.status === "completed",
    );
    expect(outcome?.transferredAmount).toEqual(plan.amount);
    expect(stamp!.sourceRecordIds).toContain(outcome!.id);
    expect(stamp!.appliedAt >= operativeAt).toBe(true);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      reopened.history.metricStates.flatMap(
        (row) =>
          (row as typeof row & LawEffectStampedRecord).lawEffectStamps ?? [],
      ),
    ).toContainEqual(stamp);
    expect(
      world.history.events.some(
        (row) => row.type === "transit.program-paid-service-hours",
      ),
    ).toBe(false);
  });
  it.each(["AK", "CO"])(
    "%s: a payment creates no inferred ride or reaction",
    (usps) => {
      const world = paidService(usps);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(
        reopened.history.events.filter((row) =>
          [
            "transit.modeled-rider-experience",
            "transit.government-decision-reported",
          ].includes(row.type),
        ),
      ).toHaveLength(0);
    },
  );
});
