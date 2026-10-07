import { advanceWorld } from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { introduceMeasure } from "./legislation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "./congress-rule-pack";
import { seatedCongressChamber } from "./governing/congress-chambers";
import { chamberByKey } from "./legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { federalProgramCostsForMonth } from "./federal-cost-ledger";
import {
  FARM_PAYMENT_QUESTION,
  farmProgramPaymentAt,
} from "./federal-farm-payments";
import { makeIsoDate } from "./dates";
import {
  FEDERAL_OUTLAYS,
  openFederalTreasury,
  settleFederalTreasuryMonth,
} from "./public-budgets/federal-treasury";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { addDays } from "./dates";
import { currentPresidentOf } from "./crisis/offices";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { money } from "./resources";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import type { World, EntityId, PublicProgramCommitmentRecord } from "./types";
import type { LawEffectStampedRecord } from "./law-effect-stamp";
import { serializeWorld, deserializeWorld } from "./serialization";
import { recordFiledProvision } from "./legislative-politics";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  programInstallments,
  programPosition,
  recordProgramAppropriation,
  settleProgramInstallment,
} from "./governing/public-program";
import { programOperatorOrganization } from "./governing/program-governing";
import { FIXTURE, cash } from "./../../tests/fixtures/public-program-fixture";

import {
  resolveLawServiceConsequence,
  applyLawServiceConsequence,
  SERVICE_DELIVERED_LAW_ROWS,
} from "./law-consequences/service-delivered";

const PROGRAM_KEY = "farm:recorded-fixture";
const place = drawRandomPlace("farm-recorded-payment-opening");
const PAYMENT = money(100_000_00, "USD");

let authorizedWorld: World;
let farmMeasureId: EntityId;

describe("recorded farm payments use the adopted annual recipient cap", () => {
  it(`opens ${place.key} and records the authored annual cap through the actual executive desk`, () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "farm-recorded-payment-opening",
        placeKey: place.key,
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game;
    if (!game) throw new Error("Expected an ordinary opening life.");

    let world = ensureNationalElectionJurisdiction(game.world);
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === FARM_PAYMENT_QUESTION,
    )!;
    // Controlled legal passage, with explicitly authored test ballots.
    // This does not prove ordinary sponsor selection or voting behavior.
    world = introduceMeasure(world, {
      stableKey: "test:farm-cost:measure",
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
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
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
      answers: { propositionId: proposition.id, answer: "yes" },
      lawTerms: [
        {
          questionKey: FARM_PAYMENT_QUESTION,
          key: "cap",
          unit: "dollars/year",
          value: 50_000,
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
      effectiveAt: world.currentDate,
    });
    const president = currentPresidentOf(world);
    if (!president) throw new Error("Expected a sitting President.");
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    world = ensurePublicGovernmentAccount(world, {
      kind: "jurisdiction",
      jurisdictionId,
    });
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
    if (!account) throw new Error("Expected the federal public account.");

    authorizedWorld = world;
    farmMeasureId = measure.id;
    expect(
      world.history.legislativeEnactments?.some(
        (record) => record.measureId === measure.id,
      ),
    ).toBe(true);
  }, 30_000);

  it("caps actual cash, budget and recipient records with reload/replay protection", () => {
    if (!authorizedWorld)
      throw new Error("The actual legal setup must succeed first.");
    let world = authorizedWorld;
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
    const president = currentPresidentOf(world);
    if (!account || !president)
      throw new Error("Missing saved federal payer/executive.");
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
      sourceMeasureId: farmMeasureId,
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 30),
      basis: FIXTURE,
    });
    world = written.world;
    const appropriation = programAppropriations(world, PROGRAM_KEY).find(
      (record) => record.id === written.id,
    );
    if (!appropriation)
      throw new Error("The federal appropriation is missing.");

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
        installments: [
          { afterDays: 1, amount: PAYMENT, purpose: "maintenance" },
        ],
        deliveryLeadDays: 1,
      },
      personId: president.personId,
      office: { kind: "federal-executive" },
      recipientOrganizationId: operator.organizationId,
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) throw new Error(committed.reason);

    const beforePayment = committed.world;
    const governmentCashBefore = cash(beforePayment, account.organizationId);
    const recipientCashBefore = cash(beforePayment, operator.organizationId);
    const month = makeIsoDate(`${dueAt.slice(0, 7)}-01`);
    const opened = openFederalTreasury(month);
    const unpaid = settleFederalTreasuryMonth(
      beforePayment,
      opened,
      month,
    ).months.at(-1)!;
    expect(federalProgramCostsForMonth(beforePayment, month)).toEqual([]);
    world = advanceWorld(
      beforePayment,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    const installment = programInstallments(world, PROGRAM_KEY).find(
      (record) => record.commitmentId === committed.recordId,
    );
    expect(installment).toMatchObject({ status: "posted", recordedAt: dueAt });
    if (!installment) throw new Error("The federal payment did not post.");
    const outcome = world.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === installment.resourceFlowId,
    )!;
    expect(outcome.transferredAmount.minorUnits).toBe(50_000_00);
    expect(cash(world, account.organizationId)).toBe(
      governmentCashBefore - 50_000_00,
    );
    expect(cash(world, operator.organizationId)).toBe(
      recipientCashBefore + 50_000_00,
    );
    expect(
      (outcome as typeof outcome & LawEffectStampedRecord).lawEffectStamps?.[0],
    ).toMatchObject({
      governingLawKey: farmMeasureId,
      questionKey: FARM_PAYMENT_QUESTION,
      effectKind: "service-delivered",
    });
    const resolved = resolveLawServiceConsequence(
      world,
      SERVICE_DELIVERED_LAW_ROWS[FARM_PAYMENT_QUESTION]![0]!,
      {
        activity: "payment",
        activityId: outcome.id,
        onDate: dueAt,
        subjectIds: [operator.organizationId],
        questionKey: FARM_PAYMENT_QUESTION,
        governingLawId: farmMeasureId,
      },
    );
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.value).toMatchObject({
      type: "amount",
      value: 50_000_00,
      unit: "minor",
    });
    expect(applyLawServiceConsequence(world, resolved[0]!)).toBe(world);
    const costs = federalProgramCostsForMonth(world, month);
    expect(costs).toHaveLength(1);
    expect(costs[0]!.amountMinorUnits).toBe(50_000_00);
    expect(programPosition(world, PROGRAM_KEY).posted.minorUnits).toBe(
      50_000_00,
    );
    const paid = settleFederalTreasuryMonth(world, opened, month).months.at(
      -1,
    )!;
    expect(
      paid.outlays[FEDERAL_OUTLAYS.indexOf("agriculture")]! -
        unpaid.outlays[FEDERAL_OUTLAYS.indexOf("agriculture")]!,
    ).toBe(50_000);
    const saved = deserializeWorld(serializeWorld(world));
    const repeated = settleProgramInstallment(saved, committed.recordId, 0);
    expect(repeated.world).toBe(saved);
    expect(federalProgramCostsForMonth(saved, month)).toEqual(costs);
    const exhausted = farmProgramPaymentAt(
      saved,
      appropriation,
      saved.history.publicProgramRecords!.find(
        (row) => row.id === committed.recordId,
      ) as PublicProgramCommitmentRecord,
      PAYMENT,
    );
    expect(exhausted.amount.minorUnits).toBe(0);
    expect(exhausted.reason).toMatch(/exhausted/);
    const otherProgram = farmProgramPaymentAt(
      saved,
      { ...appropriation, programKey: "non-farm:authored-refusal" },
      saved.history.publicProgramRecords!.find(
        (row) => row.id === committed.recordId,
      ) as PublicProgramCommitmentRecord,
      PAYMENT,
    );
    expect(otherProgram.amount).toEqual(PAYMENT);
    expect(otherProgram.lawEffectStamps).toEqual([]);
  }, 30_000);
});
