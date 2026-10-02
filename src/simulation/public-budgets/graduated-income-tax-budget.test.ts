import { stdout } from "node:process";
import {
  GRADUATED_STATE_INCOME_TAX_QUESTION,
  stateIncomeTaxUnderLaw,
} from "../state-income-tax-law";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { introduceMeasure } from "../legislation";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../legislation-scenarios";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { createOrganization, createWorkRelationship } from "../life";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { assessPaychecksTaxes } from "../statutory-tax";
import { withholdingForPaycheck } from "../income-tax-withholding";
import stateIncomeTax2026 from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };

import {
  withOpenedBudgets,
  PUBLIC_BUDGETS_VERSION,
  BUDGET_SOURCES,
  type PublicBudgetStore,
} from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";

import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { STATUTORY_WAGE_TAX_ROWS } from "../law-consequences/statutory-wage-tax-rows";
import { taxLawFactor } from "./month";
import { TAX_QUESTION_EFFECTS } from "./rules";
import type { PublicBudgetGovernment } from "./store";

const questionKey = "us-policy-positions:fiscal.graduated-income-tax";

describe("graduated income tax budget receipts", () => {
  it("keeps saved statutory attribution and removes the fiscal-note multiplier", () => {
    expect(
      TAX_QUESTION_EFFECTS.some((row) => row.questionKey === questionKey),
    ).toBe(false);
    expect(
      STATUTORY_WAGE_TAX_ROWS[questionKey]!.map((row) => row.when),
    ).toEqual(["assessment", "payment"]);
    expect(
      TAX_QUESTION_EFFECTS.some(
        (row) =>
          row.questionKey === "us-policy-positions:fiscal.adopt-income-tax",
      ),
    ).toBe(false);
    expect(
      STATUTORY_WAGE_TAX_ROWS[
        "us-policy-positions:fiscal.adopt-income-tax"
      ]!.map((row) => row.when),
    ).toEqual(["assessment", "payment"]);
  });

  it("does not manufacture revenue from a graduated-law answer in any starting place", () => {
    const propositionId = "proposition_graduated_control" as EntityId;
    for (const place of lifePlaceStateIdentities()) {
      const jurisdictionId = stateJurisdictionForKey(place.jurisdictionKey)!.id;
      for (const answer of ["yes", "no"] as const) {
        const world = {
          currentDate: makeIsoDate("2026-06-01"),
          policyCatalog: {
            propositions: {
              [propositionId]: { id: propositionId, stableKey: questionKey },
            },
          },
          history: {
            legislativeMeasures: [
              {
                id: "measure_control",
                jurisdictionId,
                propositionIds: [propositionId],
                propositionAnswers: [{ propositionId, answer }],
              },
            ],
            legislativeEnactments: [
              {
                id: "enactment_control",
                sequence: 1,
                measureId: "measure_control",
                resolvedAt: makeIsoDate("2026-03-01"),
                effectiveAt: makeIsoDate("2026-03-01"),
                outcome: "enacted",
              },
            ],
          },
        } as unknown as World;
        const government = {
          level: "state",
          stateKey: place.jurisdictionKey,
          lawJurisdictionId: jurisdictionId,
        } as PublicBudgetGovernment;
        for (const date of ["2026-06-01", "2027-01-01"]) {
          expect(
            taxLawFactor(
              world,
              government,
              "individualIncomeTax",
              makeIsoDate(date),
            ),
          ).toBe(1);
        }
      }
    }
  });

  it("opens and reloads a new game in a randomly selected recorded place", () => {
    const seed = "overflow3:a22:graduated-factor-retirement";
    const place = drawRandomPlace(seed);
    const { world } = smallWorld({ place: place.key, seed, people: 3 });
    const reopened = deserializeWorld(serializeWorld(world));
    expect(reopened.seed).toBe(seed);
    expect(reopened.jurisdictions[place.context.jurisdiction.id]).toBeDefined();
    console.info(
      `A22 new game: ${place.displayName}; ${place.key}; seed ${seed}`,
    );
  });
});

it.each([100_000, 300_000])(
  "an enacted graduated law collects recorded pay of %i minor units into the state account and budget",
  (grossMinor) => {
    const TERM_SEED = "overflow3:graduated:actual-collection";
    const candidates = Object.entries(stateIncomeTax2026.places).filter(
      ([, row]) => row.wageIncomeTax === "flat",
    );
    const jurisdictionKey =
      candidates[
        Math.abs([...TERM_SEED].reduce((sum, c) => sum + c.charCodeAt(0), 0)) %
          candidates.length
      ]![0];
    const f = smallWorld({
      place: jurisdictionKey,
      seed: `${TERM_SEED}:${jurisdictionKey}`,
      date: "2025-12-18",
      people: 3,
      offices: ["governor"],
      laws: [GRADUATED_STATE_INCOME_TAX_QUESTION],
    });
    const pack = legislativePackForJurisdiction(f.stateJurisdictionId);
    if (!pack) {
      expect(
        stateIncomeTaxUnderLaw(
          f.world,
          jurisdictionKey,
          "single",
          f.world.currentDate,
        ),
      ).toEqual({ kind: "as-begun" });
      throw new Error("Selected recorded state lacks an admitted procedure.");
    }
    let world = introduceMeasure(f.world, {
      stableKey: `${TERM_SEED}:bill`,
      jurisdictionId: f.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "A22 numeric income tax fixture",
      shortTitle: "Controlled graduated-income-tax enactment",
      summary:
        "Controlled adopted terms, not a researched rate or natural vote.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: pack.chamberOrder[0]!,
      sponsorPersonId: null,
      propositionIds: [f.propositionIds[GRADUATED_STATE_INCOME_TAX_QUESTION]!],
      propositionAnswers: [
        {
          propositionId: f.propositionIds[GRADUATED_STATE_INCOME_TAX_QUESTION]!,
          answer: "yes",
        },
      ],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const votePlan = Object.fromEntries(
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
    );
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
        votePlan,
        governorAction: null,
        governorRationale:
          "Authored favorable votes for the numeric terms fixture.",
      },
    });
    // The canonical procedure spends fourteen days before enactment. Start
    // before the tax year rather than backdating the law or its occurrence.
    expect(world.currentDate).toBe("2026-01-01");
    // Keep the actual signer in control while their required desk work is open.
    // The paycheck is for the actual resident, not a fabricated controller.
    const signer = currentStateExecutiveHolders(world).find(
      (row) => row.stateUsps === f.stateUsps,
    )!;
    world = {
      ...world,
      control: { kind: "person", personId: signer.personId },
    };
    const read = stateIncomeTaxUnderLaw(
      world,
      jurisdictionKey,
      "single",
      world.currentDate,
    );
    expect(read.kind).toBe("estimated");
    if (read.kind !== "estimated")
      throw new Error("Graduated enacted schedule unread.");
    expect(read.shape).toBe("graduated");
    expect(read.schedule.brackets.length).toBeGreaterThan(1);
    expect(read.lawMeasureIds).toContain(measureId);
    const provenance = {
      kind: "authored" as const,
      note: "Controlled actual-pay fixture; not natural work or an observed wage.",
    };
    world = createOrganization(world, {
      stableKey: `${TERM_SEED}:employer`,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Recorded terms fixture employer",
        classification: "enterprise:retail",
        locationJurisdictionId: f.stateJurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: `${TERM_SEED}:work`,
      personId: f.personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:employee",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Recorded worker",
        occupationClassification: null,
        locationJurisdictionId: f.stateJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: f.stateJurisdictionId,
        },
      },
    });
    const workRelationshipId = world.history.workRelationships.at(-1)!.id;
    world = createWorkCompensation(world, {
      stableKey: `${TERM_SEED}:pay`,
      workRelationshipId,
      startsAt: world.currentDate,
      amount: money(grossMinor, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: f.stateJurisdictionId,
      provenance,
    });
    const resourceFlowId = world.history.resourceFlows.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: `${TERM_SEED}:cash`,
      owner: { kind: "person", personId: f.personId },
      openedAt: world.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: `${TERM_SEED}:paid`,
      resourceFlowId,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: money(grossMinor, "USD"),
      transferredAmount: money(grossMinor, "USD"),
      reasonKind: null,
      note: "Actual recorded fixture pay.",
      provenance,
    });
    const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
    world = assessPaychecksTaxes(world, [outcomeId]);
    const liability = world.history.statutoryTaxLiabilities!.find(
      (row) =>
        row.sourceOutcomeId === outcomeId &&
        row.authorityKey === jurisdictionKey &&
        row.taxKey.endsWith(":wage-income-tax"),
    )!;
    expect(liability.payer).toEqual({ kind: "person", personId: f.personId });
    expect(liability.lawMeasureIds).toContain(measureId);
    expect(liability.liability?.minorUnits).toBe(
      withholdingForPaycheck(grossMinor, 260, read.schedule).withheldMinor,
    );
    expect(liability.liability!.minorUnits).toBeGreaterThan(0);
    const payments = world.history.statutoryTaxPayments!.filter(
      (record) => record.liabilityId === liability.id,
    );
    expect(payments).toHaveLength(1);
    expect(payments[0]!.amount).toEqual(liability.liability);
    const collection = world.history.resourceTransferOutcomes.find(
      (record) => record.id === payments[0]!.resourceOutcomeId,
    )!;
    expect(collection.status).toBe("completed");
    expect(collection.transferredAmount.minorUnits).toBeGreaterThanOrEqual(
      payments[0]!.amount.minorUnits,
    );
    const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
    const empty: PublicBudgetStore = {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    };
    const budgets = withOpenedBudgets(world, empty, month);
    const government = budgets.governments.find(
      (row) => row.key === jurisdictionKey,
    )!;
    expect(government).toBeDefined();
    const readFlows = readMonthFlows(world, budgets);
    const recorded = readFlows.flows.recorded!.get(jurisdictionKey)!;
    const incomeIndex = BUDGET_SOURCES.indexOf("individualIncomeTax");
    // The state receipt can include its separately saved paid-leave allocation.
    // Sum actual completed withholding transfers, never annualize an estimate.
    const intoState = world.history.resourceTransferOutcomes.filter(
      (outcome) => {
        const flow = world.history.resourceFlows.find(
          (flow) => flow.id === outcome.resourceFlowId,
        )!;
        return (
          flow.basisKind === "custom:tax-withholding" &&
          flow.recipient.kind === "organization" &&
          flow.recipient.organizationId ===
            readFlows.flows.cash!.get(jurisdictionKey)!.organizationId
        );
      },
    );
    const actualReceipts = intoState.reduce(
      (sum, outcome) => sum + outcome.transferredAmount.minorUnits,
      0,
    );
    expect(actualReceipts).toBeGreaterThanOrEqual(
      payments[0]!.amount.minorUnits,
    );
    expect(recorded.revenueMinorUnits[incomeIndex]).toBe(actualReceipts);
    expect(recorded.sourceRecordIds).toContain(collection.id);
    const settled = settleGovernmentMonth(
      world,
      government,
      month,
      readFlows.flows,
    ).government;
    expect(settled.months.at(-1)!.revenue[incomeIndex]).toBe(
      actualReceipts / 100,
    );
    expect(settled.months.at(-1)!.cashSettlement!.sourceRecordIds).toContain(
      collection.id,
    );
    const saved = deserializeWorld(serializeWorld(world));
    expect(assessPaychecksTaxes(saved, [outcomeId])).toBe(saved);
    expect(saved.history.statutoryTaxPayments).toEqual(
      world.history.statutoryTaxPayments,
    );
    const restoredFlows = readMonthFlows(saved, budgets);
    expect(
      restoredFlows.flows.recorded!.get(jurisdictionKey)!.revenueMinorUnits[
        incomeIndex
      ],
    ).toBe(actualReceipts);
    expect(
      settleGovernmentMonth(
        saved,
        government,
        month,
        restoredFlows.flows,
      ).government.months.at(-1)!.revenue[incomeIndex],
    ).toBe(actualReceipts / 100);

    stdout.write(
      JSON.stringify({
        place: jurisdictionKey,
        measureId,
        payOutcomeId: outcomeId,
        grossMinor,
        brackets: read.schedule.brackets,
        liabilityMinor: liability.liability!.minorUnits,
        paymentId: payments[0]!.id,
        collectionId: collection.id,
        budgetReceiptMinor: actualReceipts,
      }) + "\n",
    );
  },
);
