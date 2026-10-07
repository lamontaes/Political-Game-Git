import { expect } from "vitest";
import { smallWorld } from "./small-world";
import { enactThroughDesk } from "./enact-through-desk";
import { FIXTURE, cash, pay } from "./public-program-fixture";
import { advanceWorld, assertWorldIntegrity } from "../../src/simulation/world";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { introduceMeasure } from "../../src/simulation/legislation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../../src/simulation/congress-rule-pack";
import { seatedCongressChamber } from "../../src/simulation/governing/congress-chambers";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../../src/simulation/legislation-scenarios";
import { recordFiledProvision } from "../../src/simulation/legislative-politics";
import { FARM_PAYMENT_QUESTION } from "../../src/simulation/federal-farm-payments";
import { federalProgramCostsForMonth } from "../../src/simulation/federal-cost-ledger";
import {
  FEDERAL_OUTLAYS,
  openFederalTreasury,
  settleFederalTreasuryMonth,
} from "../../src/simulation/public-budgets/federal-treasury";
import { PUBLIC_BUDGETS_VERSION } from "../../src/simulation/public-budgets/store";
import { firstOfNextMonth } from "../../src/simulation/public-budgets/fiscal";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../src/simulation/national-election-geography";
import { currentPresidentOf } from "../../src/simulation/crisis/offices";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "../../src/simulation/tax-policy";
import { createOrganization } from "../../src/simulation/life";
import { createResourcePosition, money } from "../../src/simulation/resources";
import { createProductionWorldMetricCatalog } from "../../src/simulation/production-catalog";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  programInstallments,
  recordProgramAppropriation,
  settleProgramInstallment,
} from "../../src/simulation/governing/public-program";
import { programOperatorOrganization } from "../../src/simulation/governing/program-governing";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { isLawEffectStamp } from "../../src/simulation/law-effect-stamp";
import type { World } from "../../src/simulation/types";

const PROGRAM_KEY = "farm:recorded-fixture";
const PAYMENT = money(100_000_00, "USD");

// These cap, appropriation and payment inputs are authored tests, not production defaults.
function enactFarmLaw(
  start: World,
  answer: "yes" | "no",
  capDollars: number | null,
) {
  let world = ensureNationalElectionJurisdiction(start);
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === FARM_PAYMENT_QUESTION,
  )!;
  // Controlled legal passage, with explicitly authored test ballots.
  // This does not prove ordinary sponsor selection or voting behavior.
  world = introduceMeasure(world, {
    stableKey: `test:farm-cost:measure:${world.history.legislativeMeasures?.length ?? 0}`,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. TEST",
    shortTitle: "Controlled farm payment authority",
    summary: "Fixture appropriation authority, not natural passage.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  if (answer === "yes")
    world = recordFiledProvision(world, {
      stableKey: "test:farm:cap",
      measureId: measure.id,
      provisionKey: "farm-cap",
      sectionNumber: 1,
      heading: "Authored annual cap",
      text: "Authored test annual farm recipient cap.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Recorded farm recipients (authored fixture)",
      },
      applicationScope: {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        segmentKey: null,
      },
      answers: { propositionId: proposition.id, answer },
      lawTerms: [
        {
          questionKey: FARM_PAYMENT_QUESTION,
          key: "cap",
          unit: "dollars/year",
          value: capDollars!,
        },
      ],
    });
  const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map((key) => {
    const seated = seatedCongressChamber(world, key);
    if (!seated) throw new Error("Expected the actual seated Congress.");
    return seated.body;
  });
  const votePlan: Record<string, { yea: number }> = {};
  for (const key of US_CONGRESS_RULE_PACK.chamberOrder) {
    const chamber = chamberByKey(US_CONGRESS_RULE_PACK, key);
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 1,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(key, stage.stageKey)] = {
        yea: bodies.find((b) => b.chamberKey === key)!.members.length,
      };
  }
  const procedure = {
    pack: US_CONGRESS_RULE_PACK,
    measureId: measure.id,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed" as const,
    governorRationale: "Explicit controlled payment-authority fixture.",
  };
  world = enactThroughDesk(world, measure.id, {
    context: procedure,
  });
  return { world, measureId: measure.id };
}

function paidFarmFixture(start: World, capDollars: number) {
  const enacted = enactFarmLaw(start, "yes", capDollars);
  let world = ensurePublicGovernmentAccount(enacted.world, {
    kind: "jurisdiction",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
  });
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
  const president = currentPresidentOf(world);
  if (!account || !president)
    throw new Error("Missing saved government payer or executive.");
  world = createOrganization(world, {
    stableKey: "test:farm-cost:receipts-payer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: FIXTURE.note },
    initialProfile: {
      name: "Controlled receipts payer",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const payerId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "test:farm-cost:receipts-cash",
    owner: { kind: "organization", organizationId: payerId },
    openedAt: world.currentDate,
    openingBalance: money(150_000_00, "USD"),
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  world = pay(
    world,
    "test:farm-cost:actual-funding",
    payerId,
    account.organizationId,
    150_000_00,
  );
  world = declareProgramCapacity(world, {
    edition: "recorded-farm-payment-fixture",
    programKey: PROGRAM_KEY,
    jurisdictionId,
    serviceLabel: "Recorded farm payment authority",
    unitLabel: "service units",
    unitsTotal: 1,
    unitsOperational: 0,
    monthlyOperatingNeed: money(1, "USD"),
    completedPermille: null,
    restorationCostPerUnit: PAYMENT,
    basis: FIXTURE,
  }).world;
  const written = recordProgramAppropriation(world, {
    edition: "recorded-farm-payment-fixture",
    programKey: PROGRAM_KEY,
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(150_000_00, "USD"),
    sourceMeasureId: enacted.measureId,
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 30),
    basis: FIXTURE,
  });
  world = written.world;
  const appropriation = programAppropriations(world, PROGRAM_KEY).find(
    (record) => record.id === written.id,
  );
  if (!appropriation) throw new Error("The federal appropriation is missing.");

  const operator = programOperatorOrganization(
    world,
    PROGRAM_KEY,
    jurisdictionId,
  );
  world = operator.world;
  const dueAt = addDays(world.currentDate, 1);
  const committed = commitPublicProgram(world, {
    appropriationId: appropriation.id,
    alternative: {
      key: "recorded-farm-payment-proof",
      title: "One recorded farm payment",
      installments: [{ afterDays: 1, amount: PAYMENT, purpose: "maintenance" }],
      deliveryLeadDays: 1,
    },
    personId: president.personId,
    office: { kind: "federal-executive" },
    recipientOrganizationId: operator.organizationId,
  });
  expect(committed.ok).toBe(true);
  if (!committed.ok) throw new Error(committed.reason);

  const governmentCashBefore = cash(committed.world, account.organizationId);
  const recipientCashBefore = cash(committed.world, operator.organizationId);
  const month = makeIsoDate(`${dueAt.slice(0, 7)}-01`);
  const treasury = openFederalTreasury(month);
  const before = settleFederalTreasuryMonth(
    committed.world,
    treasury,
    month,
  ).months.at(-1)!;
  expect(before.programCosts).toEqual([]);
  expect(
    before.laws.some((row) => row.questionKey === FARM_PAYMENT_QUESTION),
  ).toBe(false);
  world = advanceWorld(
    committed.world,
    1,
    createCampaignElectionTransitionRegistry(),
  );
  const installment = programInstallments(world, PROGRAM_KEY).find(
    (record) => record.commitmentId === committed.recordId,
  )!;
  expect(installment.status).toBe("posted");
  const transfer = world.history.resourceTransferOutcomes.find(
    (row) => row.resourceFlowId === installment.resourceFlowId,
  )!;
  expect(transfer.transferredAmount.minorUnits).toBe(capDollars * 100);
  expect(cash(world, account.organizationId)).toBe(
    governmentCashBefore - transfer.transferredAmount.minorUnits,
  );
  expect(cash(world, operator.organizationId)).toBe(
    recipientCashBefore + transfer.transferredAmount.minorUnits,
  );
  const settled = settleFederalTreasuryMonth(world, treasury, month);
  const after = settled.months.at(-1)!;
  return {
    world,
    month,
    settled,
    before,
    after,
    transfer,
    measureId: enacted.measureId,
    commitmentId: committed.recordId,
  };
}

/** Two actual payments under controlled adopted caps, not a forecast reduction. */
export function assertRecordedFarmCost(seed: string, place: string) {
  const opened = smallWorld({
    place,
    seed,
    people: 3,
    offices: ["congress"],
    laws: [FARM_PAYMENT_QUESTION],
  });
  const start = {
    ...opened.world,
    metricCatalog: createProductionWorldMetricCatalog(),
  };
  assertWorldIntegrity(start);
  const full = paidFarmFixture(start, 100_000);
  const capped = paidFarmFixture(start, 50_000);
  expect(capped.month).toBe(full.month);
  const costs = (capped.after.programCosts ?? []).filter(
    (cost) => cost.questionKey === FARM_PAYMENT_QUESTION,
  );
  expect(costs.length).toBeGreaterThan(0);
  expect(costs).toHaveLength(1);
  const cost = costs[0]!;
  expect(cost.amountMinorUnits).toBe(
    capped.transfer.transferredAmount.minorUnits,
  );
  expect(cost.amountMinorUnits).toBeGreaterThan(0);
  expect(cost.lawEffectStamps).toHaveLength(1);
  const stamp = cost.lawEffectStamps[0]!;
  expect(isLawEffectStamp(stamp)).toBe(true);
  expect(stamp).toMatchObject({
    governingLawKey: capped.measureId,
    effectKind: "government-program-payment",
    questionKey: FARM_PAYMENT_QUESTION,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    appliedAt: capped.transfer.occurredAt,
  });
  expect(stamp.sourceRecordIds).toContain(capped.transfer.id);
  expect(stamp.sourceRecordIds).toContain(capped.commitmentId);
  expect(capped.transfer.lawEffectStamps?.[0]).toMatchObject({
    governingLawKey: capped.measureId,
    effectKind: "service-delivered",
    questionKey: FARM_PAYMENT_QUESTION,
  });
  const index = FEDERAL_OUTLAYS.indexOf("agriculture");
  expect(capped.after.outlays[index]! - capped.before.outlays[index]!).toBe(
    cost.amountMinorUnits / 100,
  );
  const changed = capped.after.outlays.reduce(
    (sum, value, i) => sum + value - full.after.outlays[i]!,
    0,
  );
  expect(changed).toBe(
    (capped.transfer.transferredAmount.minorUnits -
      full.transfer.transferredAmount.minorUnits) /
      100,
  );
  expect(changed * -1).toBeGreaterThan(0);
  expect(capped.after.deficit - full.after.deficit).toBe(changed);
  expect(capped.after.debtHeldByPublic - full.after.debtHeldByPublic).toBe(
    changed,
  );
  const saved = deserializeWorld(
    serializeWorld({
      ...capped.world,
      publicBudgets: {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
        federal: capped.settled,
      },
    }),
  );
  expect(saved.publicBudgets!.federal!.months).toEqual(capped.settled.months);
  expect(settleProgramInstallment(saved, capped.commitmentId, 0).world).toBe(
    saved,
  );
  expect(federalProgramCostsForMonth(saved, capped.month)).toEqual(
    capped.after.programCosts,
  );
  const repealed = enactFarmLaw(saved, "no", null).world;
  const next = settleFederalTreasuryMonth(
    repealed,
    saved.publicBudgets!.federal!,
    firstOfNextMonth(capped.month),
  );
  expect(next.months.at(-1)!.programCosts).toEqual([]);
  expect(
    next.months
      .at(-1)!
      .laws.some((row) => row.questionKey === FARM_PAYMENT_QUESTION),
  ).toBe(false);
  expect(next.months[0]!.programCosts).toEqual(capped.after.programCosts);
  console.info(
    JSON.stringify({
      seed,
      place: opened.place.key,
      state: opened.stateUsps,
      actualPaidMinor: cost.amountMinorUnits,
      avoidedOutlayDollars: -changed,
      stamps: cost.lawEffectStamps.length,
      reloadAndRepeal: "PASS",
      scope:
        "controlled actual cash fixture; ordinary farm enrollment producer remains missing",
    }),
  );
}
