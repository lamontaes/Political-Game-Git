import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
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
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays } from "./dates";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { createOrganization } from "./life";
import { stateJurisdictionForKey } from "./life-places";
import {
  ensureStateJurisdictionForKey,
  currentStateExecutiveHolders,
} from "./nationwide-world/state-executives";
import { money, createResourcePosition } from "./resources";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import {
  recordProgramAppropriation,
  commitPublicProgram,
} from "./governing/public-program";
import { readMonthFlows } from "./public-budgets/month";
import { BUDGET_SOURCES } from "./public-budgets/store";
import { postFederalStateProgramPayments } from "./federal-state-program-payments";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  FIXTURE,
  pay,
  cash,
} from "../../tests/fixtures/public-program-fixture";
import type { World, EntityId } from "./types";

// Explicit controlled claims and enacted terms, not observed Medicaid awards.
const place = drawRandomPlace("federal-state-payment-authored-fixture");
const questionKey =
  "us-federal-positions:transport-water.expand-passenger-rail";
const termKey = "recorded-test-payment";
const PROGRAM_KEY = "medicaid:explicit-state-payment-fixture";

const legalFixtures = new Map<string, { world: World; measureId: EntityId }>();
function enacted(unit: "minor" | "ratio", value: number) {
  const saved = legalFixtures.get(`${unit}:${value}`);
  if (saved) return saved;
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
    (p) => p.stableKey === questionKey,
  )!;
  // Controlled legal passage, with explicitly authored test ballots.
  // This does not prove ordinary sponsor selection or voting behavior.
  world = introduceMeasure(world, {
    stableKey: "test:state-payment-cost:measure",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. TEST",
    shortTitle: "Controlled state program payment authority",
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
    stableKey: "test:state-payment:cap",
    measureId: measure.id,
    provisionKey: "state-payment-amount",
    sectionNumber: 1,
    heading: "Authored annual cap",
    text: "Authored test state program amount.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Recorded state recipients (authored fixture)",
    },
    applicationScope: {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      segmentKey: null,
    },
    answers: { propositionId: proposition.id, answer: "yes" },
    lawTerms: [
      {
        questionKey: questionKey,
        key: termKey,
        unit: unit,
        value,
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
  const result = { world, measureId: measure.id };
  legalFixtures.set(`${unit}:${value}`, result);
  return result;
}

const run = (world: World) => postFederalStateProgramPayments(world).world;

function fixture(unit: "minor" | "ratio", value: number) {
  const adopted = enacted(unit, value);
  let world = adopted.world;
  const measureId = adopted.measureId;
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!);
  if (!state) throw new Error(`No recipient jurisdiction for ${place.key}`);
  world = ensureStateJurisdictionForKey(world, place.stateJurisdictionKey!);
  const nation = NATIONAL_ELECTION_JURISDICTION.id;
  for (const jurisdictionId of [nation, state.id])
    world = ensurePublicGovernmentAccount(world, {
      kind: "jurisdiction",
      jurisdictionId,
    });
  const federal = publicTaxAccountForJurisdiction(
    world,
    nation,
  )!.organizationId;
  const recipient = publicTaxAccountForJurisdiction(
    world,
    state.id,
  )!.organizationId;
  world = createOrganization(world, {
    stableKey: "test:state-payment:fixture-payer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: FIXTURE.note },
    initialProfile: {
      name: "Authored fixture payer",
      classification: "sector:private",
      locationJurisdictionId: state.id,
    },
  });
  const payer = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "test:state-payment:payer:USD",
    owner: { kind: "organization", organizationId: payer },
    openedAt: world.currentDate,
    openingBalance: money(100_000, "USD"),
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  world = pay(
    world,
    "test:state-payment:federal-receipt",
    payer,
    federal,
    20_000,
  );
  world = pay(
    world,
    "test:state-payment:state-receipt",
    payer,
    recipient,
    20_000,
  );
  // Actual completed state-paid expense from the canonical state account.
  const stateAuthority = recordProgramAppropriation(world, {
    edition: "actual-state-expense-fixture",
    programKey: PROGRAM_KEY,
    jurisdictionId: state.id,
    accountOrganizationId: recipient,
    amount: money(10_000, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 30),
    basis: FIXTURE,
  });
  const executive = currentStateExecutiveHolders(stateAuthority.world).find(
    (row) => row.stateUsps === place.stateJurisdictionKey!.slice(3),
  );
  if (!executive) throw new Error("Missing recorded state executive.");
  const expense = commitPublicProgram(stateAuthority.world, {
    appropriationId: stateAuthority.id,
    recipientOrganizationId: payer,
    personId: executive.personId,
    office: { kind: "state-executive" },
    alternative: {
      key: "eligible-paid-expense",
      title: "Authored eligible expense",
      installments: [
        { afterDays: 0, amount: money(10_000, "USD"), purpose: "operating" },
      ],
      deliveryLeadDays: null,
    },
  });
  if (!expense.ok) throw new Error(expense.reason);
  world = expense.world;
  const expenseId = world.history.resourceTransferOutcomes.at(-1)!.id;
  const period = world.currentDate;
  const claim = {
    stableKey: "test:state-payment:claim",
    recipientJurisdictionId: state.id,
    dueAt: period,
    periodStartsAt: period,
    periodEndsAt: period,
    amountTerm: { questionKey, termKey, unit },
    eligibleExpenditureIds: unit === "ratio" ? [expenseId] : [],
  };
  const written = recordProgramAppropriation(world, {
    edition: "explicit-state-payable",
    programKey: PROGRAM_KEY,
    jurisdictionId: nation,
    accountOrganizationId: federal,
    amount: money(20_000, "USD"),
    sourceMeasureId: measureId,
    availableFrom: period,
    availableThrough: addDays(period, 30),
    basis: FIXTURE,
    statePaymentClaims: [claim],
  });
  world = written.world;
  return {
    world,
    appropriationId: written.id,
    federal,
    recipient,
    expenseId,
    claim,
  };
}

function withClaim(f: ReturnType<typeof fixture>, patch: object) {
  return {
    ...f.world,
    history: {
      ...f.world.history,
      publicProgramRecords: (f.world.history.publicProgramRecords ?? []).map(
        (row) =>
          row.id === f.appropriationId
            ? { ...row, statePaymentClaims: [{ ...f.claim, ...patch }] }
            : row,
      ),
    },
  };
}

describe("explicit saved federal state payment claims", () => {
  for (const [unit, value, amount] of [
    ["minor", 4_000, 4_000],
    ["ratio", 0.5, 5_000],
  ] as const)
    it(`posts ${unit} amount from final adopted law, with exact debit/credit and reload replay`, () => {
      const f = fixture(unit, value);
      const posted = run(f.world);
      expect(cash(posted, f.federal)).toBe(cash(f.world, f.federal) - amount);
      expect(cash(posted, f.recipient)).toBe(
        cash(f.world, f.recipient) + amount,
      );
      const transfers = posted.history.resourceTransferOutcomes.filter(
        (row) =>
          !f.world.history.resourceTransferOutcomes.some(
            (old) => old.id === row.id,
          ),
      );
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toMatchObject({
        status: "completed",
        transferredAmount: money(amount, "USD"),
        periodStartsAt: f.claim.periodStartsAt,
        periodEndsAt: f.claim.periodEndsAt,
      });
      const budget = f.world.publicBudgets!;
      const observed = readMonthFlows(posted, {
        ...budget,
        cursor: {
          flows: f.world.history.resourceFlows.length,
          outcomes: f.world.history.resourceTransferOutcomes.length,
        },
      });
      const stateBudget = budget.governments.find(
        (row) =>
          row.level === "state" &&
          row.jurisdictionId === f.claim.recipientJurisdictionId,
      );
      expect(stateBudget).toBeDefined();
      expect(
        observed.flows.recorded?.get(stateBudget!.key)?.revenueMinorUnits[
          BUDGET_SOURCES.indexOf("intergovernmental")
        ],
      ).toBe(amount);
      const replay = run(deserializeWorld(serializeWorld(posted)));
      expect(cash(replay, f.federal)).toBe(cash(posted, f.federal));
      expect(cash(replay, f.recipient)).toBe(cash(posted, f.recipient));
      expect(replay.history.resourceTransferOutcomes).toHaveLength(
        posted.history.resourceTransferOutcomes.length,
      );
      const commitment = (posted.history.publicProgramRecords ?? []).find(
        (row) =>
          row.kind === "commitment" &&
          row.appropriationId === f.appropriationId,
      );
      expect(commitment?.kind).toBe("commitment");
      if (commitment?.kind !== "commitment")
        throw new Error("No saved payable commitment");
      expect(commitment.federalStatePayment).toMatchObject({
        claimKey: f.claim.stableKey,
        periodStartsAt: f.claim.periodStartsAt,
        periodEndsAt: f.claim.periodEndsAt,
      });
      if (unit === "ratio")
        expect(commitment.federalStatePayment?.eligibleExpenditureIds).toEqual([
          f.expenseId,
        ]);
    }, 30_000);

  it("refuses a federal receipt presented as state expenditure", () => {
    const f = fixture("ratio", 0.5);
    const federalReceipt = f.world.history.resourceTransferOutcomes.find(
      (row) => row.stableKey === "test:state-payment:federal-receipt:transfer",
    )!;
    const before = withClaim(f, {
      eligibleExpenditureIds: [federalReceipt.id],
    });
    const after = run(before);
    expect(cash(after, f.federal)).toBe(cash(before, f.federal));
    expect(cash(after, f.recipient)).toBe(cash(before, f.recipient));
  }, 30_000);

  it("refuses missing adopted term rather than guessing amount", () => {
    const f = fixture("minor", 4_000);
    const before = withClaim(f, {
      amountTerm: { ...f.claim.amountTerm, termKey: "absent-term" },
    });
    const after = run(before);
    expect(cash(after, f.federal)).toBe(cash(before, f.federal));
    expect(cash(after, f.recipient)).toBe(cash(before, f.recipient));
  }, 30_000);

  it("rejects duplicate expense IDs inside the same ratio claim", () => {
    const f = fixture("ratio", 0.5);
    const before = withClaim(f, {
      eligibleExpenditureIds: [f.expenseId, f.expenseId],
    });
    const after = run(before);
    expect(cash(after, f.federal)).toBe(cash(before, f.federal));
  }, 30_000);
  it("does not reimburse the same expense under a second claim key", () => {
    const f = fixture("ratio", 0.5);
    const posted = run(f.world);
    const second = {
      ...posted,
      history: {
        ...posted.history,
        publicProgramRecords: (posted.history.publicProgramRecords ?? []).map(
          (row) =>
            row.id === f.appropriationId
              ? {
                  ...row,
                  statePaymentClaims: [
                    {
                      ...f.claim,
                      stableKey: "test:state-payment:second-claim",
                    },
                  ],
                }
              : row,
        ),
      },
    };
    const result = postFederalStateProgramPayments(second);
    expect(
      result.blocked.some(
        (row) => row.claimKey === "test:state-payment:second-claim",
      ),
    ).toBe(true);
    expect(cash(result.world, f.federal)).toBe(cash(posted, f.federal));
    expect(cash(result.world, f.recipient)).toBe(cash(posted, f.recipient));
  }, 30_000);
});
