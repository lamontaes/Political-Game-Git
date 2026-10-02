import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { buildProductionWorld } from "../../presentation/production-world";
import { budgetLawReading, budgetObligationPayment } from "./fiscal";
import { withOpenedBudgets } from ".";
import { mayAnswerQuestion } from "../governing/question-authority";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  LegislativeProvisionRecord,
} from "../types";
import {
  BUDGET_LAW_KEYS,
  BUDGET_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
} from "./store";

describe("shared obligation allocation", () => {
  it("preserves measured voluntary shares and above-minimum allocations", () => {
    const reading = {
      answer: "unknown",
      measureId: null,
      level: null,
    } as const;
    expect(budgetObligationPayment(1000, 0.75, reading)).toBe(750);
    expect(
      budgetObligationPayment(1000, 0.75, { ...reading, answer: "no" }),
    ).toBe(750);
    expect(
      budgetObligationPayment(1000, 1.25, { ...reading, answer: "yes" }),
    ).toBe(1250);
    expect(
      budgetObligationPayment(1000, 0.75, {
        ...reading,
        answer: "yes",
        requiredContributionShare: 1.1,
      }),
    ).toBe(1100);
    expect(
      budgetObligationPayment(1000, 0.75, {
        ...reading,
        answer: "yes",
        requiredContributionShare: 0.5,
      }),
    ).toBe(1000);
  });

  it("records the evaluated pension appropriation in a random new game's actual books", () => {
    const seed = "overflow4-a17-shared-obligation-20261002";
    const place = drawRandomPlace(seed);
    const { world, playerPersonId } = buildProductionWorld({
      seed,
      place,
      age: 34,
      givenName: null,
      familyName: null,
      startingLife: "ordinary-life",
      household: "lives-alone",
      depth: "summarize-earlier-life",
    });
    expect(world.people[playerPersonId]).toBeDefined();
    const books = withOpenedBudgets(
      world,
      {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      },
      world.currentDate,
    );
    expect(books.governments.length).toBeGreaterThan(0);
    const government = books.governments.find((row) => row.level === "state")!;
    expect(government, `${place.displayName} / ${seed}`).toBeDefined();
    const year = government.years[0]!;
    const law = budgetLawReading(
      world,
      government.lawJurisdictionId,
      "pensions",
      world.currentDate,
      false,
    );
    expect(
      year.appropriations[BUDGET_PROGRAMS.indexOf("pensionContribution")],
    ).toBe(
      budgetObligationPayment(
        year.pensionRequired,
        government.pension.paidShare,
        law,
      ),
    );
    expect(books.cursor).toEqual({ flows: 0, outcomes: 0 });
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (row) => row.stableKey === BUDGET_LAW_KEYS.pensions,
    )!;
    const local = books.governments.find(
      (row) =>
        row.level !== "state" &&
        mayAnswerQuestion(world, row.lawJurisdictionId, proposition.id),
    );
    expect(local, `${place.displayName} / ${seed}`).toBeDefined();
    // Controlled adopted records exercise real authority and term readers;
    // they are not a claim of passage in the random opening.
    const stateOnly = appendContribution(
      world,
      government.lawJurisdictionId,
      1.5,
      1000,
    );
    const withoutOwn = budgetLawReading(
      stateOnly,
      local!.lawJurisdictionId,
      "pensions",
      world.currentDate,
      true,
    );
    expect(withoutOwn.answer).toBe("unknown");
    expect(withoutOwn.requiredContributionShare).toBeUndefined();
    const withOwn = appendContribution(
      stateOnly,
      local!.lawJurisdictionId,
      1.1,
      1002,
    );
    const own = budgetLawReading(
      withOwn,
      local!.lawJurisdictionId,
      "pensions",
      world.currentDate,
      true,
    );
    expect(own).toMatchObject({
      answer: "yes",
      level: "local-ordinance",
      measureId: "controlled_obligation_1002",
      requiredContributionShare: 1.1,
    });
    expect(budgetObligationPayment(1000, 0.75, own)).toBe(1100);
    expect(
      budgetLawReading(
        withOwn,
        government.lawJurisdictionId,
        "pensions",
        world.currentDate,
        false,
      ).requiredContributionShare,
    ).toBe(1.5);
    console.info(`A17 opening: ${place.displayName}; seed=${seed}`);
  });
});

function appendContribution(
  world: World,
  jurisdictionId: EntityId,
  ratio: number,
  sequence: number,
): World {
  const questionKey = BUDGET_LAW_KEYS.pensions;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  const id = `controlled_obligation_${sequence}` as EntityId;
  const measure: LegislativeMeasureRecord = {
    id,
    stableKey: `test:obligation:${sequence}`,
    sequence,
    jurisdictionId,
    rulePackId: "test",
    designation: `Controlled ${sequence}`,
    shortTitle: "Controlled obligation",
    summary: "Controlled adopted contribution term.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_${sequence}` as EntityId,
    stableKey: `test:obligation:${sequence}:enactment`,
    sequence: sequence + 1,
    measureId: id,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: world.currentDate,
    outcomeEventId: `event_${sequence}` as EntityId,
  };
  const provision: LegislativeProvisionRecord = {
    id: `provision_${sequence}` as EntityId,
    stableKey: `test:obligation:${sequence}:term`,
    sequence,
    measureId: id,
    provisionKey: "contribution",
    sectionNumber: 1,
    heading: "Controlled contribution",
    text: "Explicit adopted contribution for reader regression.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Government budget",
    },
    applicationScope: { jurisdictionId, segmentKey: null },
    fiscalExposureLabel: null,
    fiscalExposureMinorUnits: null,
    recordedAt: world.currentDate,
    supersedesProvisionId: null,
    originAmendmentId: null,
    eventId: `provision_event_${sequence}` as EntityId,
    lawTerms: [
      { questionKey, key: "contribution", value: ratio, unit: "ratio" },
    ],
  };
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
      legislativeProvisions: [
        ...(world.history.legislativeProvisions ?? []),
        provision,
      ],
    },
  };
}
