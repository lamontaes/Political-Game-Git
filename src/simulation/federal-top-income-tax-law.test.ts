import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { seatedCongressChamber } from "./governing/congress-chambers";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { recordFiledProvision } from "./legislative-politics";
import { introduceMeasure } from "./legislation";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
} from "./life-paths2";
import { advanceWorld } from "./world";
import { recordResourceFlowTerms, money } from "./resources";
import { FEDERAL_INCOME_TAX_KEY } from "./statutory-tax";
import { isTerritory } from "./statutory-tax-rules";
import { serializeWorld, deserializeWorld } from "./serialization";
import { describe, expect, it } from "vitest";
import { createHistoryStore } from "./history";
import { daysBetween, makeIsoDate } from "./dates";
import {
  federalIncomeTaxUnderLaw,
  withTopRate,
  RAISE_TOP_FEDERAL_RATE_QUESTION,
} from "./federal-top-income-tax-law";
import {
  FEDERAL_INCOME_TAX_2026,
  withholdingForPaycheck,
} from "./income-tax-withholding";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "./national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  LegislativeProvisionRecord,
  World,
} from "./types";

/**
 * A federal law on the top income tax rate, enacted in play, reaching the
 * federal withholding: a yes uses the rate in its adopted text from the next
 * tax year, and a later no restores the starting schedule. Controlled reader
 * records are separate from the canonical bill-to-desk and paycheck proof.
 */

const TOP_RATE = "proposition_top_rate" as EntityId;

let sequence = 0;
function enacted(
  answer: "yes" | "no",
  effectiveAt: string,
  rate = 0.396,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
  rate: number;
} {
  sequence += 1;
  const id = `measure_top_rate_${sequence}` as EntityId;
  return {
    rate,
    measure: {
      id,
      stableKey: `test:top-rate:${sequence}`,
      sequence,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: "test",
      designation: `H.R. ${sequence}`,
      shortTitle: "A top rate act",
      summary: "A top rate act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-05"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [TOP_RATE],
      propositionAnswers: [{ propositionId: TOP_RATE, answer }],
    },
    enactment: {
      id: `enactment_top_rate_${sequence}` as EntityId,
      stableKey: `test:top-rate:${sequence}:enactment`,
      sequence: 5000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-03-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_top_rate_${sequence}` as EntityId,
    },
  };
}

function lawWorld(laws: readonly ReturnType<typeof enacted>[]): World {
  const world = {
    seed: "top-rate",
    people: {},
    personOrder: [],
    currentDate: makeIsoDate("2029-06-01"),
    id: "world_top_rate" as EntityId,
    jurisdictions: {
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    policyCatalog: {
      propositionOrder: [TOP_RATE],
      propositions: {
        [TOP_RATE]: {
          id: TOP_RATE,
          stableKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        },
      },
    },
    history: {
      ...createHistoryStore(),
      nextSequence: 10_000,
      legislativeProvisions: [],
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
  // Controlled final-text reader fixture, not a natural legislative outcome.
  const provisions: LegislativeProvisionRecord[] = laws
    .filter((entry) => entry.measure.propositionAnswers?.[0]?.answer === "yes")
    .map((entry) => ({
      id: `${entry.measure.id}:rate` as EntityId,
      stableKey: `${entry.measure.stableKey}:rate`,
      sequence: entry.enactment.sequence - 1,
      recordedAt: entry.enactment.resolvedAt,
      measureId: entry.measure.id,
      provisionKey: "top-rate",
      sectionNumber: 1,
      heading: "Adopted rate",
      text: `The top bracket is taxed at ${entry.rate * 100} percent.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "top-bracket taxable income",
      },
      applicationScope: {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        segmentKey: null,
      },
      lawTerms: [
        {
          questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
          key: "rate",
          value: entry.rate,
          unit: "ratio",
        },
      ],
      fiscalExposureLabel: null,
      fiscalExposureMinorUnits: null,
      supersedesProvisionId: null,
      originAmendmentId: null,
      eventId: entry.enactment.outcomeEventId,
    }));
  return {
    ...world,
    history: { ...world.history, legislativeProvisions: provisions },
  };
}

const topRate = (world: World, paidAt: string) =>
  federalIncomeTaxUnderLaw(
    world,
    "single",
    makeIsoDate(paidAt),
  ).schedule!.brackets.at(-1)!.rateBasisPoints;

/** A $1,000,000 salary paid every two weeks: one paycheck's withholding. */
const withheld = (world: World, paidAt: string) =>
  withholdingForPaycheck(
    100_000_000 / 26,
    26,
    federalIncomeTaxUnderLaw(world, "single", makeIsoDate(paidAt)).schedule!,
  ).withheldMinor;

describe("a federal law on the top income tax rate, as enacted in play", () => {
  it("leaves the 2026 schedule where no law was enacted", () => {
    const none = federalIncomeTaxUnderLaw(
      lawWorld([]),
      "married-filing-jointly",
      makeIsoDate("2027-03-15"),
    );
    expect(none).toEqual({
      schedule: FEDERAL_INCOME_TAX_2026["married-filing-jointly"],
      lawMeasureIds: [],
      governingLaw: null,
    });
  });

  it("taxes the top bracket at 39.6% from the next tax year, and a repeal puts 37% back", () => {
    const raise = enacted("yes", "2026-04-01");
    const repeal = enacted("no", "2028-07-01");
    const world = lawWorld([raise, repeal]);
    // The raise takes effect during 2026, so 2026 pay is taxed as begun.
    expect(topRate(world, "2026-12-15")).toBe(3700);
    expect(topRate(world, "2027-01-15")).toBe(3960);
    // The repeal takes effect during 2028, so all of 2028 keeps 39.6%.
    expect(topRate(world, "2028-12-15")).toBe(3960);
    expect(topRate(world, "2029-01-15")).toBe(3700);
    expect(
      federalIncomeTaxUnderLaw(world, "single", makeIsoDate("2027-01-15"))
        .lawMeasureIds,
    ).toEqual([raise.measure.id]);
    expect(
      federalIncomeTaxUnderLaw(world, "single", makeIsoDate("2027-01-15"))
        .governingLaw?.measureId,
    ).toBe(raise.measure.id);
    expect(
      federalIncomeTaxUnderLaw(world, "single", makeIsoDate("2029-01-15"))
        .governingLaw?.measureId,
    ).toBe(repeal.measure.id);
    // Only the top bracket moves.
    const raised = federalIncomeTaxUnderLaw(
      world,
      "head-of-household",
      makeIsoDate("2027-01-15"),
    ).schedule!;
    const begun = FEDERAL_INCOME_TAX_2026["head-of-household"]!;
    expect(raised.brackets.slice(0, -1)).toEqual(begun.brackets.slice(0, -1));
    expect(raised.brackets.at(-1)!.overMinor).toBe(
      begun.brackets.at(-1)!.overMinor,
    );
  });

  it("withholds 2.6% more of a top earner's pay over the top threshold, and nothing more below it", () => {
    const world = lawWorld([enacted("yes", "2026-04-01")]);
    // $1,000,000 less the $16,100 deduction is $983,900, $343,300 over the
    // $640,600 threshold; 2.6% of that is $8,925.80 a year, $343.30 a check.
    expect(withheld(world, "2027-01-15") - withheld(world, "2026-12-15")).toBe(
      34_330,
    );
    const middle = (paidAt: string) =>
      withholdingForPaycheck(
        8_000_000 / 26,
        26,
        federalIncomeTaxUnderLaw(world, "single", makeIsoDate(paidAt))
          .schedule!,
      ).withheldMinor;
    expect(middle("2027-01-15")).toBe(middle("2026-12-15"));
  });
  it("uses distinct adopted rates and refuses missing, duplicate, wrong-unit or unrepresentable rates", () => {
    for (const rate of [0.38, 0.405, 0.45, 0]) {
      const world = lawWorld([enacted("yes", "2026-04-01", rate)]);
      expect(topRate(world, "2027-01-15")).toBe(Math.round(rate * 10_000));
    }
    const start = lawWorld([enacted("yes", "2026-04-01", 0.45)]);
    const row = start.history.legislativeProvisions![0]!;
    const invalid: readonly LegislativeProvisionRecord[][] = [
      [],
      [row, { ...row, id: "duplicate-rate" as EntityId }],
      [
        {
          ...row,
          lawTerms: row.lawTerms!.map((term) => ({ ...term, unit: "minor" })),
        },
      ],
      ...[NaN, -0.1, 1.1, 0.40001].map((value) => [
        { ...row, lawTerms: row.lawTerms!.map((term) => ({ ...term, value })) },
      ]),
    ];
    for (const provisions of invalid) {
      const world = {
        ...start,
        history: { ...start.history, legislativeProvisions: provisions },
      };
      expect(
        federalIncomeTaxUnderLaw(world, "single", makeIsoDate("2027-01-15"))
          .schedule,
      ).toBeNull();
    }
  });
  it("an adopted 45% rate changes the existing saved paycheck and survives Continue", () => {
    const seed = "a28-top-rate-saved-pay-all56";
    const place = drawRandomPlace(
      seed,
      (candidate) =>
        candidate.stateJurisdictionKey !== null &&
        !isTerritory(candidate.stateJurisdictionKey),
    );
    console.info(
      `A28 top-rate payroll: seed=${seed}, place=${place.displayName} (${place.key})`,
    );
    const f = smallWorld({
      place: place.key,
      date: "2026-12-01",
      people: 3,
      offices: ["congress"],
      laws: [RAISE_TOP_FEDERAL_RATE_QUESTION],
      seed,
    });
    const pack = legislativePackForJurisdiction(
      NATIONAL_ELECTION_JURISDICTION.id,
    )!;
    expect(pack).toBeDefined();
    let world = introduceMeasure(ensureNationalElectionJurisdiction(f.world), {
      stableKey: `${seed}:bill`,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: pack.packId,
      designation: "Authored top-rate act",
      shortTitle: "Adopted 45% top rate",
      summary:
        "Controlled adopted rate and votes, not a measured public policy choice.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: pack.chamberOrder[0]!,
      sponsorPersonId: null,
      propositionIds: [f.propositionIds[RAISE_TOP_FEDERAL_RATE_QUESTION]!],
      propositionAnswers: [
        {
          propositionId: f.propositionIds[RAISE_TOP_FEDERAL_RATE_QUESTION]!,
          answer: "yes",
        },
      ],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    world = recordFiledProvision(world, {
      stableKey: `${seed}:terms`,
      measureId,
      provisionKey: "top-rate",
      sectionNumber: 1,
      heading: "Rate of the top bracket",
      text: "Top-bracket taxable income is taxed at 45%. Other brackets and deductions are unchanged.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "top-bracket taxable income",
      },
      applicationScope: {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        segmentKey: null,
      },
      lawTerms: [
        {
          questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
          key: "rate",
          value: 0.45,
          unit: "ratio",
        },
      ],
    });
    const bodies = pack.chamberOrder.map((key) => {
      const seated = seatedCongressChamber(world, key);
      if (!seated) throw new Error("Expected the opening's seated Congress.");
      return seated.body;
    });
    world = enactThroughDesk(world, measureId, {
      context: {
        pack,
        measureId,
        bodies,
        committeeMemberCount: null,
        votePlan: Object.fromEntries(
          pack.chambers.flatMap((chamber) => [
            ...chamber.committees.map((committee) => [
              votePlanKeyForCommittee(committee.committeeKey),
              { yea: committee.appointedMembers ?? 1 },
            ]),
            ...chamber.floorStages.map((stage) => [
              votePlanKeyForFloor(chamber.chamberKey, stage.stageKey),
              {
                yea: bodies.find(
                  (body) => body.chamberKey === chamber.chamberKey,
                )!.members.length,
              },
            ]),
          ]),
        ),
        governorAction: null,
        governorRationale:
          "Authored favorable procedure; no natural vote claim.",
      },
    });
    function paidShift(start: World) {
      const entered = enterLifePath(start, "shop-assistant");
      expect(entered.ok, entered.message).toBe(true);
      const workId = entered.world.history.workRelationships.at(-1)!.id;
      const flow = entered.world.history.resourceFlows.find(
        (row) =>
          row.basisReference.kind === "work" &&
          row.basisReference.workRelationshipId === workId,
      )!;
      const terms = entered.world.history.resourceFlowTerms.find(
        (row) => row.resourceFlowId === flow.id,
      )!;
      const agreed = recordResourceFlowTerms(entered.world, {
        stableKey: `${seed}:high-pay`,
        resourceFlowId: flow.id,
        effectiveAt: start.currentDate,
        status: "active",
        amount: money(1_500_000, "USD"),
        cadenceKind: terms.cadenceKind,
        reason: "Controlled high-pay work contract to reach the top bracket.",
        provenance: {
          kind: "authored",
          note: "Test compensation, not an observed shop wage.",
        },
        supersedesTermsId: terms.id,
      });
      const scheduled = scheduleLifePathSession(agreed, workId);
      expect(scheduled.ok, scheduled.message).toBe(true);
      const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
      const worked = performLifePathSession(scheduled.world, activityId);
      expect(worked.ok, worked.message).toBe(true);
      const paid = advanceWorld(worked.world, 1);
      const row = paid.history.statutoryTaxLiabilities!.find(
        (entry) => entry.taxKey === FEDERAL_INCOME_TAX_KEY,
      )!;
      expect(row).toBeDefined();
      return { paid, row };
    }
    // The canonical desk takes time. Pay both branches after the following
    // January 1; paying during enactment's year correctly keeps the old rate.
    const payday = makeIsoDate("2027-01-01");
    expect(world.currentDate < payday).toBe(true);
    const before = paidShift(
      advanceWorld(f.world, daysBetween(f.world.currentDate, payday)),
    );
    const after = paidShift(
      advanceWorld(world, daysBetween(world.currentDate, payday)),
    );
    const expected = withholdingForPaycheck(
      1_500_000,
      260,
      withTopRate(FEDERAL_INCOME_TAX_2026.single!, 4500),
    ).withheldMinor;
    expect(after.row.liability?.minorUnits).toBe(expected);
    expect(after.row.liability!.minorUnits).toBeGreaterThan(
      before.row.liability!.minorUnits,
    );
    expect(after.row.lawMeasureIds).toContain(measureId);
    const payment = after.paid.history.statutoryTaxPayments!.find(
      (entry) => entry.liabilityId === after.row.id,
    )!;
    expect(payment.amount.minorUnits).toBe(expected);
    const restored = deserializeWorld(serializeWorld(after.paid));
    expect(
      restored.history.statutoryTaxPayments!.find(
        (entry) => entry.id === payment.id,
      ),
    ).toEqual(payment);
    console.info(
      `A28 recorded federal withholding: before=${before.row.liability!.minorUnits} after=${expected} minor; law=${measureId}`,
    );
  }, 120_000);
});
