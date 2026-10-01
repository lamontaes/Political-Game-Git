import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import startingLaws from "../../../data/research/laws/starting-law-2026.json";
import { makeIsoDate } from "../dates";
import { createWorld, assertWorldIntegrity } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createLegislativeScenario } from "../legislation-scenarios";
import { introduceMeasure } from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { stateJurisdictionForKey } from "../life-places";
import { createFormationContext, recordPrinciples } from "../politics";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  budgetCandidates,
  openGovernmentBudget,
} from "../public-budgets/opening";
import {
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
} from "../public-budgets/store";
import { recordDraftLineage } from "../legislation-draft-lineage";
import { compileBillDraft, draftScope } from "../legislation-drafting";
import {
  compileAutomaticLawDraft,
  introduceAutomaticLawMeasure,
  stateTransitAutomaticLawContext,
} from "./automatic-legislation";
import { lawInForce } from "./law-in-force";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  ensureStateLegislatureOpening,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import {
  US_STATE_USPS,
  CHIEF_EXECUTIVE_JURISDICTIONS,
} from "../nationwide-world/state-executive-candidacy-packs";
import { STATE_TRANSIT_SERVICE_QUESTION } from "../legislation-transit-families";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { SeededRng, pickDistinct } from "../rng";
import { personName } from "../people";
import type { EntityId, World } from "../types";

// Prices, coverage declarations and unanimous votes below are controlled fixture inputs,
// not sourced law levels or forecasts. The real saved population supplies each place's base.
const seed = "g2-automatic-sponsor-five-places";
const proofRows: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM1_STARTING_PROOF_PATH)
    writeFileSync(
      process.env.TEAM1_STARTING_PROOF_PATH,
      JSON.stringify(proofRows, null, 2) + "\n",
    );
});
const places = pickDistinct(new SeededRng(seed), US_STATE_USPS, 5);
let world: World;
let opening: World;
let questionId: EntityId;
const sponsors = new Map<string, EntityId>();
function jurisdiction(place: string) {
  return stateJurisdictionForKey(`US-${place}`)!.id;
}
function population(start: World, place: string) {
  return publicBudgetFor(start, jurisdiction(place))!.population;
}
function strength(start: World, personId: EntityId, value: number) {
  return recordPrinciples(
    start,
    start.policyCatalog.propositions[questionId]!.principles!.map(
      (bearing) => ({
        stableKey: `g2-request:${personId}:${value}:${start.history.principles.length}:${bearing.principleId}`,
        personId,
        principleId: bearing.principleId,
        formedAt: start.currentDate,
        stance: bearing.bearing === "consistent-with" ? "endorses" : "rejects",
        strength: value,
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("experience:life", {
          note: "Explicit fixture request from this seated member's own saved principles.",
        }),
        supersedesPrincipleRecordId:
          start.history.principles
            .filter(
              (row) =>
                row.personId === personId &&
                row.principleId === bearing.principleId,
            )
            .at(-1)?.id ?? null,
      }),
    ),
  );
}
function file(
  start: World,
  place: string,
  perResident: number,
  service: "weekday" | "weekend",
) {
  const jurisdictionId = jurisdiction(place);
  const context = stateTransitAutomaticLawContext(start, jurisdictionId)!;
  const key = `g2-reference:${place}:${perResident}:${service}`;
  const designation = `HB ${1 + (start.history.legislativeMeasures?.filter((row) => row.jurisdictionId === jurisdictionId).length ?? 0)}`;
  const draft = compileBillDraft({
    familyKey: "appropriations",
    variantKey: "transit-staged-service-v2",
    parameterValues: {
      appropriation: {
        kind: "money",
        minorUnits: Math.round(population(start, place) * perResident),
        currency: "USD",
      },
      "service-window": { kind: "enumerated", value: service },
    },
    scenarioKey: context.scenarioKey,
    jurisdictionId,
    rulePackId: context.rulePackId,
    designation,
    filedOn: start.currentDate,
    predicateAuthority: context.predicateAuthority,
  });
  let next = introduceMeasure(start, {
    stableKey: key,
    jurisdictionId,
    rulePackId: draft.rulePackId,
    designation,
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    sponsorPersonId: sponsors.get(place)!,
    originChamberKey:
      legislativePackForJurisdiction(jurisdictionId)!.chamberOrder[0]!,
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  const amount = draft.clauses.find(
    (row) => row.provisionKey === "amount-provided",
  )!;
  next = recordFiledProvision(next, {
    stableKey: `${key}:draft:${draft.familyKey}:${draft.variantKey}:amount-provided`,
    measureId,
    provisionKey: amount.provisionKey,
    sectionNumber: amount.sectionNumber,
    heading: amount.heading,
    text: amount.text,
    beneficiary: amount.beneficiary,
    applicationScope: draftScope(draft),
    fiscalExposureLabel: amount.fiscalExposureLabel,
    fiscalExposureMinorUnits: amount.fiscalExposureMinorUnits,
    fiscalPeriod: amount.fiscalPeriod,
    operativeEffect: amount.operativeEffect,
    lawTerms: [
      {
        questionKey: STATE_TRANSIT_SERVICE_QUESTION,
        key: "appropriation",
        value: draft.appropriatedMinorUnits!,
        unit: "minor",
      },
    ],
    lawCategories: [
      {
        questionKey: STATE_TRANSIT_SERVICE_QUESTION,
        key: "service-window",
        values: [service],
      },
    ],
  });
  for (const clause of draft.clauses.filter(
    (row) => row.provisionKey !== "amount-provided",
  ))
    next = recordFiledProvision(next, {
      stableKey: `${key}:draft:${draft.familyKey}:${draft.variantKey}:${clause.provisionKey}`,
      measureId,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      beneficiary: clause.beneficiary,
      applicationScope: draftScope(draft),
      fiscalExposureLabel: clause.fiscalExposureLabel,
      fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
      fiscalPeriod: clause.fiscalPeriod,
      operativeEffect: clause.operativeEffect,
    });
  next = recordDraftLineage(next, {
    stableKey: `${key}:draft-lineage`,
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: draft.filedOn,
    parameterValues: draft.parameterValues,
    authorityKey: draft.predicateAuthority!.authorityKey,
    provenanceNote:
      "Explicit canonical fixture reference with typed terms; not an automatically chosen number.",
  });
  return { world: next, measureId };
}
function input(start: World, place: string) {
  return {
    world: start,
    jurisdictionId: jurisdiction(place),
    propositionId: questionId,
    sponsorPersonId: sponsors.get(place)!,
    answer: "yes" as const,
    designation: "HB 99",
    intakeKey: `g2-request:${place}`,
  };
}
beforeAll(() => {
  const scenario = createLegislativeScenario("kentucky");
  const catalog = createProductionPolicyCatalog();
  questionId = Object.values(catalog.propositions).find(
    (row) => row.stableKey === STATE_TRANSIT_SERVICE_QUESTION,
  )!.id;
  const question = catalog.propositions[questionId]!;
  world = createWorld({
    seed: scenario.world.seed,
    currentDate: makeIsoDate("2026-02-01"),
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    jurisdictions: CHIEF_EXECUTIVE_JURISDICTIONS.map((place) =>
      stateJurisdictionForKey(`US-${place}`)!,
    ),
    policyCatalog: {
      ...catalog,
      propositions: {
        ...catalog.propositions,
        [questionId]: {
          ...question,
          parameters: [
            { key: "appropriation", value: "usd-per-budget-year" },
            {
              key: "service-window",
              value: "fixture-service-category",
              allowedValues: ["weekday", "weekend"],
            },
          ],
        },
      },
    },
  });
  world = ensureWorldStartingConditions(world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  for (const place of places) {
    const pack = legislativePackForJurisdiction(jurisdiction(place))!;
    world = ensureStateLegislatureOpening(world, world.personOrder[0]!, place);
    const member = stateLegislators(world, `${pack.packId}:candidacy`).find(
      (row) => row.officeKey.endsWith(`:${pack.chamberOrder[0]}`),
    )!;
    sponsors.set(place, member.personId);
  }
  const candidates = budgetCandidates(world).candidates;
  world = {
    ...world,
    publicBudgets: {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      adjustments: [],
      unknown: [],
      governments: places.map((place) => {
        const candidate = candidates.find(
          (row) => row.jurisdictionId === jurisdiction(place),
        )!;
        const budget = openGovernmentBudget(
          world,
          candidate,
          world.currentDate,
        );
        if (typeof budget === "string") throw new Error(budget);
        return budget;
      }),
    },
  };
  opening = world;
}, 30000);

describe("starting-law numeric predecessor uses canonical dated terms", () => {
  it.each(places)(
    "uses a controlled saved starting amount in %s, without a synthetic measure",
    (place) => {
      // This process-only research-row fixture is explicitly authored. It is not a researched
      // starting transit appropriation and never changes the production JSON file.
      const questions = startingLaws.questions as unknown as Record<
        string,
        {
          answers: Record<
            string,
            {
              answer: string;
              operativeAt?: string;
              lawTerms?: {
                questionKey: string;
                key: string;
                value: number;
                unit: string;
              }[];
            }
          >;
        }
      >;
      const priorQuestion = questions[STATE_TRANSIT_SERVICE_QUESTION];
      const fixtureQuestion = priorQuestion ?? { answers: {} };
      questions[STATE_TRANSIT_SERVICE_QUESTION] = fixtureQuestion;
      const answers = fixtureQuestion.answers;
      const key = `US-${place}`;
      const prior = answers[key];
      try {
        answers[key] = {
          answer: "yes",
          operativeAt: "2026-01-01",
          lawTerms: [
            {
              questionKey: STATE_TRANSIT_SERVICE_QUESTION,
              key: "appropriation",
              value: Math.round(population(opening, place) * 10),
              unit: "minor",
            },
          ],
        };
        let start = file(opening, place, 15, "weekday").world;
        start = file(start, place, 25, "weekend").world;
        start = strength(start, sponsors.get(place)!, 1);
        const law = lawInForce(start, jurisdiction(place), questionId)!;
        expect(law.origin).toBe("in-force-at-start");
        const count = start.history.legislativeMeasures!.length;
        const draft = compileAutomaticLawDraft(input(start, place))!;
        expect(draft).not.toBeNull();
        expect(draft.appropriatedMinorUnits).toBe(
          Math.round(population(start, place) * 25),
        );
        expect(draft.sponsorRequest!.sourceRecordIds).toContain(law.measureId);
        expect(start.history.legislativeMeasures).toHaveLength(count);
        console.log(
          JSON.stringify({
            seed,
            place,
            personId: sponsors.get(place),
            sponsorName: personName(start.people[sponsors.get(place)!]!),
            startingLawKey: law.measureId,
            requestedMinorUnits: draft.appropriatedMinorUnits,
            referenceMeasureId: draft.sponsorRequest!.referenceMeasureId,
            limits:
              "Controlled source-row amount and saved reference bills, not researched transit levels or natural filing.",
          }),
        );
        expect(
          start.history.legislativeMeasures!.some(
            (row) => row.id === law.measureId,
          ),
        ).toBe(false);
        const written = introduceAutomaticLawMeasure(start, {
          ...input(start, place),
          stableKey: `g2-starting-filed:${place}`,
          originChamberKey: legislativePackForJurisdiction(jurisdiction(place))!
            .chamberOrder[0]!,
          principleRecordIds: [],
          principleScore: 0,
        })!;
        expect(written).not.toBeNull();
        proofRows.push({
          seed,
          place,
          sponsorPersonId: sponsors.get(place),
          sponsorName: personName(start.people[sponsors.get(place)!]!),
          startingLawKey: law.measureId,
          requestedMinorUnits: draft.appropriatedMinorUnits,
          referenceMeasureId: draft.sponsorRequest!.referenceMeasureId,
          sourceRecordIds: draft.sponsorRequest!.sourceRecordIds,
          filedMeasureId: written.measureId,
          limitation:
            "Controlled process-only starting amount and canonical reference bills. No researched transit level, natural filing, passage, cash or service claim.",
        });
        expect(
          written.world.history.legislativeProvisions!.find(
            (row) =>
              row.measureId === written.measureId &&
              row.provisionKey === "amount-provided",
          )!.lawTerms?.[0]?.value,
        ).toBe(draft.appropriatedMinorUnits);
        assertWorldIntegrity(written.world);
        const loaded = deserializeWorld(serializeWorld(written.world));
        expect(
          introduceAutomaticLawMeasure(loaded, {
            ...input(loaded, place),
            stableKey: `g2-starting-filed:${place}`,
            originChamberKey: legislativePackForJurisdiction(
              jurisdiction(place),
            )!.chamberOrder[0]!,
            principleRecordIds: [],
            principleScore: 0,
          })?.world,
        ).toBe(loaded);
        answers[key] = { answer: "yes", operativeAt: "2026-01-01" };
        expect(compileAutomaticLawDraft(input(start, place))).toBeNull();
        answers[key] = {
          answer: "yes",
          operativeAt: "2026-01-01",
          lawTerms: [
            {
              questionKey: STATE_TRANSIT_SERVICE_QUESTION,
              key: "appropriation",
              value: 10,
              unit: "minor/hour",
            },
          ],
        };
        expect(compileAutomaticLawDraft(input(start, place))).toBeNull();
      } finally {
        if (prior) answers[key] = prior;
        else delete answers[key];
        if (!priorQuestion) delete questions[STATE_TRANSIT_SERVICE_QUESTION];
      }
    },
  );
});
