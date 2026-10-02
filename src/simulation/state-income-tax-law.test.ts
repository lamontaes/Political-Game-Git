import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { personName } from "./people";
import { makeIsoDate } from "./dates";
import { annualTax } from "./income-tax-withholding";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
  stateIncomeTaxUnderLaw,
} from "./state-income-tax-law";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./types";
import { smallWorld } from "../../tests/fixtures/small-world";
import { createProductionPolicyCatalog } from "./production-catalog";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { lifePlaceStateIdentities } from "./life-places";
import { stableHash } from "./ids";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import { createOrganization, createWorkRelationship } from "./life";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { assessPaychecksTaxes } from "./statutory-tax";
import { deserializeWorld, serializeWorld } from "./serialization";
import { withholdingForPaycheck } from "./income-tax-withholding";
import { lawInForce } from "./governing/law-in-force";
import stateIncomeTax2026 from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };

import {
  withOpenedBudgets,
  PUBLIC_BUDGETS_VERSION,
  BUDGET_SOURCES,
  type PublicBudgetStore,
} from "./public-budgets";
import { readMonthFlows, settleGovernmentMonth } from "./public-budgets/month";

/**
 * A state's income tax law, enacted in play, reaching the paycheck: a repeal
 * ends the withholding, an adoption starts it at the average of states with
 * that kind of tax, and a change of shape moves a tax between flat and
 * graduated. Read over hand-written laws: the World around them is partial,
 * because the rule reads only the catalog and laws, plus sourced place facts.
 * `state-tax-laws-paycheck.test.ts` carries a rule's answer through a real
 * paycheck.
 */

const ADOPT = "proposition_adopt" as EntityId;
const GRADUATED = "proposition_graduated" as EntityId;
const stateId = (key: string) => chiefExecutiveJurisdiction(key.slice(3))!.id;

let sequence = 0;
function enacted(
  jurisdictionId: EntityId,
  propositionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_tax_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:tax:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `SB ${sequence}`,
      shortTitle: "An income tax act",
      summary: "An income tax act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "senate",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2025-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer }],
    },
    enactment: {
      id: `enactment_tax_${sequence}` as EntityId,
      stableKey: `test:tax:${sequence}:enactment`,
      sequence: 5000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2025-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_tax_${sequence}` as EntityId,
    },
  };
}

function lawWorld(
  seed: string,
  laws: readonly ReturnType<typeof enacted>[],
): World {
  const catalog = createProductionPolicyCatalog();
  const adopted = Object.values(catalog.propositions).find(
    (row) => row.stableKey === ADOPT_STATE_INCOME_TAX_QUESTION,
  )!;
  const graduated = Object.values(catalog.propositions).find(
    (row) => row.stableKey === GRADUATED_STATE_INCOME_TAX_QUESTION,
  )!;
  const {
    [adopted.id]: _adopt,
    [graduated.id]: _graduated,
    ...otherPropositions
  } = catalog.propositions;
  return {
    seed,
    currentDate: makeIsoDate("2027-06-01"),
    jurisdictions: {},
    policyCatalog: {
      ...catalog,
      propositionOrder: catalog.propositionOrder.map((id) =>
        id === adopted.id ? ADOPT : id === graduated.id ? GRADUATED : id,
      ),
      propositions: {
        ...otherPropositions,
        [ADOPT]: { ...adopted, id: ADOPT },
        [GRADUATED]: { ...graduated, id: GRADUATED },
      },
    },
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

const paid = makeIsoDate("2027-03-15");

const TERM_SEED = "a22-adopted-income-rate-small-world";
const termPlaces = [...lifePlaceStateIdentities()]
  .sort((a, b) =>
    stableHash(`${TERM_SEED}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${TERM_SEED}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);

describe("A22 adopted numeric terms reach the existing paycheck writer", () => {
  it.each(
    termPlaces.flatMap((place) =>
      [400, 700].map((rateBasisPoints) => ({ ...place, rateBasisPoints })),
    ),
  )(
    "uses the final $rateBasisPoints basis-point rate for a named saved paycheck in $jurisdictionKey",
    ({ jurisdictionKey, rateBasisPoints }) => {
      const f = smallWorld({
        place: jurisdictionKey,
        seed: `${TERM_SEED}:${jurisdictionKey}`,
        date: "2025-12-18",
        people: 3,
        offices: ["governor"],
        laws: [ADOPT_STATE_INCOME_TAX_QUESTION],
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
        return; // Explicit absent procedure; no proxy bill or paycheck is authored.
      }
      let world = introduceMeasure(f.world, {
        stableKey: `${TERM_SEED}:bill`,
        jurisdictionId: f.stateJurisdictionId,
        rulePackId: pack.packId,
        designation: "A22 numeric income tax fixture",
        shortTitle: `Authored ${rateBasisPoints / 100}% income-tax terms`,
        summary:
          "Controlled adopted terms, not a researched rate or natural vote.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: pack.chamberOrder[0]!,
        sponsorPersonId: null,
        propositionIds: [f.propositionIds[ADOPT_STATE_INCOME_TAX_QUESTION]!],
        propositionAnswers: [
          {
            propositionId: f.propositionIds[ADOPT_STATE_INCOME_TAX_QUESTION]!,
            answer: "yes",
          },
        ],
      });
      const measureId = world.history.legislativeMeasures!.at(-1)!.id;
      world = recordFiledProvision(world, {
        stableKey: `${TERM_SEED}:terms`,
        measureId,
        provisionKey: "income-tax-terms",
        sectionNumber: 1,
        heading: "Flat rate and taxable-income threshold",
        text: `The rate is ${rateBasisPoints / 100}% of annual taxable income above zero USD.`,
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "the state's taxable income",
        },
        applicationScope: {
          jurisdictionId: f.stateJurisdictionId,
          segmentKey: null,
        },
        lawTerms: [
          {
            questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
            key: "rate",
            value: rateBasisPoints / 10_000,
            unit: "ratio",
          },
          {
            questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
            key: "threshold",
            value: 0,
            unit: "minor",
          },
        ],
      });
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
      if (read.kind === "as-begun") {
        expect(
          !(jurisdictionKey in stateIncomeTax2026.places) ||
            lawInForce(
              world,
              f.stateJurisdictionId,
              f.propositionIds[ADOPT_STATE_INCOME_TAX_QUESTION]!,
              world.currentDate,
              "enacted-only",
            ) === null,
        ).toBe(true); // Verify actual unread source or higher-law refusal; never pass an unexercised positive case.
        return;
      }
      expect(read.kind).toBe("enacted");
      if (read.kind !== "enacted")
        throw new Error("Adopted terms became a peer rate.");
      expect(read.schedule.brackets).toEqual([
        { overMinor: 0, rateBasisPoints },
      ]);
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
        amount: money(100_000, "USD"),
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
        attemptedAmount: money(100_000, "USD"),
        transferredAmount: money(100_000, "USD"),
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
        withholdingForPaycheck(100_000, 260, read.schedule).withheldMinor,
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
          seed: TERM_SEED,
          place: jurisdictionKey,
          person: personName(world.people[f.personId]!),
          personId: f.personId,
          measureId,
          operativeAt: world.currentDate,
          payOutcomeId: outcomeId,
          actualWagesMinor: 100_000,
          adoptedRateBasisPoints: rateBasisPoints,
          liabilityId: liability.id,
          liabilityMinor: liability.liability!.minorUnits,
          paymentId: payments[0]!.id,
          collectionOutcomeId: collection.id,
          collectedIncomeTaxMinor: payments[0]!.amount.minorUnits,
          savedStateReceiptMinor: actualReceipts,
        }) + "\n",
      );
    },
  );
});

describe("a state's income tax law, as enacted in play", () => {
  it("keeps sourced schedules and admits flat and graduated starting terms", () => {
    for (const key of ["US-WA"])
      expect(
        stateIncomeTaxUnderLaw(lawWorld("s", []), key, "single", paid),
      ).toEqual({ kind: "as-begun" });
    for (const key of ["US-CO", "US-OR"] as const) {
      const starting = stateIncomeTaxUnderLaw(
        lawWorld("s", []),
        key,
        "single",
        paid,
      );
      expect(starting.kind).toBe("enacted");
      if (starting.kind !== "enacted") throw new Error(starting.kind);
      expect(starting.schedule.brackets).toEqual(
        stateIncomeTax2026.places[key].brackets.map((row) => ({
          overMinor: row.overSingle * 100,
          rateBasisPoints: Math.round(row.ratePercent * 100),
        })),
      );
      expect(starting.lawMeasureIds).toContain(
        `starting-law:${key}:${ADOPT_STATE_INCOME_TAX_QUESTION}`,
      );
    }
  });

  it("ends the withholding when a taxing state repeals its tax", () => {
    const repeal = enacted(stateId("US-OR"), ADOPT, "no", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(lawWorld("s", [repeal]), "US-OR", "single", paid),
    ).toEqual({ kind: "repealed", lawMeasureIds: [repeal.measure.id] });
    // A "no" where there was no tax changes nothing.
    const washington = enacted(stateId("US-WA"), ADOPT, "no", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(
        lawWorld("s", [washington]),
        "US-WA",
        "single",
        paid,
      ),
    ).toEqual({ kind: "as-begun" });
  });

  it("waits for the next tax year when a law takes effect during one", () => {
    const repeal = enacted(stateId("US-OR"), ADOPT, "no", "2027-03-01");
    const world = lawWorld("s", [repeal]);
    expect(stateIncomeTaxUnderLaw(world, "US-OR", "single", paid)).toEqual(
      stateIncomeTaxUnderLaw(lawWorld("s", []), "US-OR", "single", paid),
    );
    expect(
      stateIncomeTaxUnderLaw(
        world,
        "US-OR",
        "single",
        makeIsoDate("2028-01-14"),
      ).kind,
    ).toBe("repealed");
  });

  it("starts an adopted tax graduated from ranked sourced peers, without a seed draw", () => {
    const adopt = enacted(stateId("US-WA"), ADOPT, "yes", "2027-01-01");
    const world = lawWorld("seed-one", [adopt]);
    const read = stateIncomeTaxUnderLaw(world, "US-WA", "single", paid);
    expect(read.kind).toBe("estimated");
    if (read.kind !== "estimated") return;
    expect(read.shape).toBe("graduated");
    expect(read.lawMeasureIds).toEqual([adopt.measure.id]);
    expect(read.estimatedFromAverage).toMatch(/^ESTIMATED FROM AVERAGE: /);
    expect(read.estimatedFromAverage).toContain("27 states");
    expect(read.estimatedFromAverage).toContain("Tax Foundation");
    const schedule = read.schedule;
    // Graduated: the rate rises with income, and never falls.
    const rates = schedule.brackets.map((bracket) => bracket.rateBasisPoints);
    expect(rates.at(-1)!).toBeGreaterThan(rates[0]!);
    for (let index = 1; index < rates.length; index += 1)
      expect(rates[index]!).toBeGreaterThanOrEqual(rates[index - 1]!);
    // At $50,000 taxable the average graduated state takes a few percent.
    const share = annualTax(5_000_000, schedule.brackets) / 5_000_000;
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.06);
    // Identity seeds do not change source facts or the estimated schedule.
    expect(stateIncomeTaxUnderLaw(world, "US-WA", "single", paid)).toEqual(
      read,
    );
    const otherWorld = stateIncomeTaxUnderLaw(
      lawWorld("seed-two", [adopt]),
      "US-WA",
      "single",
      paid,
    );
    expect(otherWorld).toEqual(read);
    expect(read.estimatedFromAverage).toContain(
      "authored reciprocal-rank weights",
    );
    expect(read.estimatedFromAverage).toContain(
      "not a rate written in the bill",
    );
  });

  it("adopts a flat tax when a law on its shape says so", () => {
    const adopt = enacted(stateId("US-FL"), ADOPT, "yes", "2027-01-01");
    const flat = enacted(stateId("US-FL"), GRADUATED, "no", "2027-01-01");
    const read = stateIncomeTaxUnderLaw(
      lawWorld("s", [adopt, flat]),
      "US-FL",
      "single",
      paid,
    );
    if (read.kind !== "estimated") throw new Error(read.kind);
    expect(read.shape).toBe("flat");
    expect(read.lawMeasureIds).toEqual([adopt.measure.id, flat.measure.id]);
    expect(read.schedule.brackets).toHaveLength(1);
    // A labeled peer estimate, rather than a seeded spread or statutory rate.
    const rate = read.schedule.brackets[0]!.rateBasisPoints;
    expect(rate).toBeGreaterThan(330);
    expect(rate).toBeLessThan(420);
    expect(read.estimatedFromAverage).toContain("15 states");
    // Independent packet calculation: Georgia, North Carolina, Kentucky,
    // Louisiana and Mississippi rank first; reciprocal weights give 4.16%
    // and $10,773 annual deduction after rounding. Percent → bp; dollars → cents.
    expect(read.schedule.brackets).toEqual([
      { overMinor: 0, rateBasisPoints: 416 },
    ]);
    expect(read.schedule.standardDeductionMinor).toBe(1_077_300);
  });

  it("reshapes a flat state's tax and keeps its own deduction", () => {
    // Idaho: flat, with a $16,100 standard deduction, and nothing in its
    // constitution on the shape of the tax.
    const graduated = enacted(stateId("US-ID"), GRADUATED, "yes", "2027-01-01");
    const read = stateIncomeTaxUnderLaw(
      lawWorld("s", [graduated]),
      "US-ID",
      "single",
      paid,
    );
    if (read.kind !== "estimated") throw new Error(read.kind);
    expect(read.shape).toBe("graduated");
    expect(read.schedule.standardDeductionMinor).toBe(1_610_000);
    expect(read.estimatedFromAverage).toContain(
      "the state's own standard deduction of $16,100",
    );
    // Colorado's constitution taxes all income at one rate (art. X,
    // sec. 20(8)(a)): a statute cannot graduate it, so paychecks are as
    // they began.
    const barred = enacted(stateId("US-CO"), GRADUATED, "yes", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(lawWorld("s", [barred]), "US-CO", "single", paid),
    ).toEqual(
      stateIncomeTaxUnderLaw(lawWorld("s", []), "US-CO", "single", paid),
    );
    // A "yes" on the shape of a state that is already graduated changes
    // nothing.
    const oregon = enacted(stateId("US-OR"), GRADUATED, "yes", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(lawWorld("s", [oregon]), "US-OR", "single", paid),
    ).toEqual(
      stateIncomeTaxUnderLaw(lawWorld("s", []), "US-OR", "single", paid),
    );
  });

  it("doubles a joint return's brackets and deduction, and says so", () => {
    const adopt = enacted(stateId("US-WA"), ADOPT, "yes", "2027-01-01");
    const world = lawWorld("s", [adopt]);
    const single = stateIncomeTaxUnderLaw(world, "US-WA", "single", paid);
    const joint = stateIncomeTaxUnderLaw(
      world,
      "US-WA",
      "married-filing-jointly",
      paid,
    );
    const head = stateIncomeTaxUnderLaw(
      world,
      "US-WA",
      "head-of-household",
      paid,
    );
    if (
      single.kind !== "estimated" ||
      joint.kind !== "estimated" ||
      head.kind !== "estimated"
    )
      throw new Error("not estimated");
    expect(joint.schedule.standardDeductionMinor).toBe(
      single.schedule.standardDeductionMinor * 2,
    );
    expect(joint.schedule.brackets).toEqual(
      single.schedule.brackets.map((bracket) => ({
        ...bracket,
        overMinor: bracket.overMinor * 2,
      })),
    );
    expect(joint.estimatedFromAverage).toContain("A joint return doubles");
    expect(head.schedule).toEqual(single.schedule);
    expect(head.estimatedFromAverage).toContain("head of household");
  });
  it("does not invent a territory schedule where the source packet has none", () => {
    const adopt = enacted(stateId("US-AS"), ADOPT, "yes", "2027-01-01");
    expect(
      stateIncomeTaxUnderLaw(
        lawWorld("territory", [adopt]),
        "US-AS",
        "single",
        paid,
      ),
    ).toEqual({ kind: "as-begun" });
  });
});
