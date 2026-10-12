import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { STATES } from "../../simulation/state-reference";
import { regularSessionYearForWorld } from "../../simulation/legislative-procedure-world";
import { makeIsoDate } from "../../simulation/dates";
import {
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "../../simulation/life-places";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../../simulation/legislative-institutions";
import { legislativeWorkKey } from "../../simulation/legislative-work-key";
import { seatsForChamber } from "../../simulation/legislature-game-profile";
import { stateLegislators } from "../../simulation/nationwide-world/state-legislature-opening";
import { governorOfficeForJurisdiction } from "../../simulation/governing/state-governing";
import { introduceMeasure } from "../../simulation/legislation";
import { recordFiledProvision } from "../../simulation/legislative-politics";
import {
  recordDraftLineage,
  draftParameterValues,
} from "../../simulation/legislation-draft-lineage";
import {
  createFormationContext,
  recordPrinciples,
} from "../../simulation/politics";
import {
  budgetCandidates,
  openGovernmentBudget,
} from "../../simulation/public-budgets/opening";
import {
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
} from "../../simulation/public-budgets/store";
import {
  censusRegionOf,
  censusRegionStates,
} from "../../simulation/world-setup/census-regions";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
  type AuthoredVoteCounts,
} from "../../simulation/legislation-scenarios";
import { programVariant } from "../../simulation/legislation-program-families";
import * as drafting from "../../simulation/legislation-drafting";
import {
  compileBillDraft,
  draftScope,
} from "../../simulation/legislation-drafting";
import * as native from "../../simulation/governing/automatic-legislation";
import {
  stateTransitAutomaticLawContext,
  readFinalEnactedLawTerm,
  AUTOMATIC_LAW_POSITION_MAPPINGS,
} from "../../simulation/governing/automatic-legislation";
import { lawInForce } from "../../simulation/governing/law-in-force";
import { finalTermProvisions } from "../../simulation/governing/final-law-term-query";
import { STATE_TRANSIT_SERVICE_QUESTION } from "../../simulation/legislation-transit-families";
import {
  compileAutomaticLawDraft,
  sponsorRequestedLawTerm,
  type AutomaticLawFacts,
} from "./automatic-laws";
import type { EntityId, World } from "../../simulation/types";
const sponsors = new Map<string, EntityId>();
let questionId: EntityId;
const jurisdiction = (place: string) =>
  stateJurisdictionForKey(`US-${place}`)!.id;
const population = (world: World, place: string) =>
  publicBudgetFor(world, jurisdiction(place))!.population;
// Canonical fixture helpers from the frozen sponsor-draft test. Fictional votes,
// amounts and categories admit the compiler edge; no ordinary NPC route is claimed.
function fileDraft(
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
function enact(start: World, place: string, measureId: EntityId): World {
  const pack = legislativePackForJurisdiction(jurisdiction(place))!;
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 1,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seatsForChamber(pack, chamber.chamberKey)!.seats,
      };
  }
  const context: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies: pack.chambers.map((chamber) =>
      seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        seatsForChamber(pack, chamber.chamberKey)!.seats,
        [],
        false,
      ),
    ),
    committeeMemberCount: pack.chambers[0]!.committees[0]!.appointedMembers,
    votePlan,
    governorAction: null,
    governorRationale: "The actual holder decides through the shared desk.",
  };
  const office = governorOfficeForJurisdiction(start, pack.jurisdictionKey)!;
  return enactThroughDesk(
    { ...start, control: { kind: "person", personId: office.holderPersonId } },
    measureId,
    { context },
  );
}

function facts(world: World): AutomaticLawFacts {
  const measures = world.history.legislativeMeasures ?? [],
    lineages = world.history.legislativeDraftLineages ?? [];
  const jurisdictions = [...new Set(measures.map((row) => row.jurisdictionId))];
  const contexts = new Map<string, native.AutomaticLawCompileContext>();
  const compiledReferences = new Map(),
    parameterValuesByLineage = new Map();
  for (const row of lineages) {
    const measure = measures.find((measure) => measure.id === row.measureId)!;
    const context = stateTransitAutomaticLawContext(
      world,
      measure.jurisdictionId,
    )!;
    const values = draftParameterValues(row);
    contexts.set(
      `${measure.jurisdictionId}:${row.familyKey}:${row.variantKey}`,
      context,
    );
    parameterValuesByLineage.set(row.id, values);
    compiledReferences.set(
      row.id,
      compileBillDraft({
        familyKey: row.familyKey,
        variantKey: row.variantKey,
        parameterValues: values,
        scenarioKey: context.scenarioKey,
        jurisdictionId: measure.jurisdictionId,
        rulePackId: context.rulePackId,
        designation: measure.designation,
        filedOn: row.compiledAt,
        predicateAuthority: context.predicateAuthority,
      }),
    );
  }
  const laws = new Map(),
    currentTerms = new Map();
  for (const id of jurisdictions) {
    const law = lawInForce(world, id, questionId);
    if (law) {
      laws.set(`${id}:${questionId}`, law);
      const term = readFinalEnactedLawTerm(world, law, {
        questionKey: STATE_TRANSIT_SERVICE_QUESTION,
        termKey: "appropriation",
        unit: "minor",
      });
      if (term)
        currentTerms.set(
          `${law.measureId}:${STATE_TRANSIT_SERVICE_QUESTION}:appropriation`,
          term,
        );
    }
  }
  const packs = jurisdictions.map(
    (id) => [id, legislativePackForJurisdiction(id)!] as const,
  );
  return {
    onDate: world.currentDate,
    policyCatalog: world.policyCatalog,
    principles: world.history.principles,
    personIds: new Set(world.personOrder),
    measures,
    enactments: world.history.legislativeEnactments ?? [],
    lineages,
    regionByState: new Map(
      censusRegionStates().map((state) => [state, censusRegionOf(state)]),
    ),
    stateByJurisdiction: new Map(
      jurisdictions.map((id) => [
        id,
        stateKeyForJurisdiction(world.jurisdictions[id]!)!.slice(3),
      ]),
    ),
    populationByJurisdiction: new Map(
      jurisdictions.map((id) => [id, publicBudgetFor(world, id)!.population]),
    ),
    laws,
    currentTerms,
    finalProvisions: new Map(
      measures.map((row) => [row.id, finalTermProvisions(world, row.id)]),
    ),
    contexts,
    mappings: AUTOMATIC_LAW_POSITION_MAPPINGS,
    packsByJurisdiction: new Map(packs),
    packsByWorkKey: new Map(
      packs.map(([, pack]) => [
        legislativeWorkKey(pack),
        legislativePackForWorkKey(legislativeWorkKey(pack))!,
      ]),
    ),
    workKeysByPack: new Map(
      packs.map(([, pack]) => [pack.packId, legislativeWorkKey(pack)]),
    ),
    programVariants: new Map(
      AUTOMATIC_LAW_POSITION_MAPPINGS.map((row) => [
        `${row.familyKey}:${row.variantKey}`,
        programVariant(row.familyKey, row.variantKey),
      ]),
    ),
    compiledReferences,
    parameterValuesByLineage,
    compiledResult: null,
  };
}
describe("legislatures: automatic-law selection and compiler protocol from native Worlds", () => {
  let selected = 0;
  afterAll(() => expect(selected).toBeGreaterThan(0));
  it.each(Object.keys(STATES))(
    "matches sponsor and compiler requests in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-automatic:${place}`,
        offices: ["governor", "state-legislature"],
      }).world;
      let sessionYear = Number(world.currentDate.slice(0, 4));
      while (
        !regularSessionYearForWorld(world, jurisdiction(place), sessionYear)
      )
        sessionYear++;
      const filedOn = makeIsoDate(`${sessionYear}-01-05`);
      if (filedOn !== world.currentDate)
        world = smallWorld({
          place: `US-${place}`,
          date: filedOn,
          seed: `rules2-automatic:${place}`,
          offices: ["governor", "state-legislature"],
        }).world;
      const context = stateTransitAutomaticLawContext(
        world,
        jurisdiction(place),
      );
      questionId = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === STATE_TRANSIT_SERVICE_QUESTION,
      )!.id;
      const pack = legislativePackForJurisdiction(jurisdiction(place));
      const sponsor = (
        pack ? stateLegislators(world, `${pack.packId}:candidacy`) : []
      ).find((row) =>
        row.officeKey.endsWith(
          `:${legislativePackForJurisdiction(jurisdiction(place))?.chamberOrder[0]}`,
        ),
      );
      if (!context || !sponsor) {
        // The native unsupported-place context is absent, not fabricated authority.
        expect(context === null || sponsor === undefined).toBe(true);
        const empty = {
          ...facts({
            ...world,
            history: {
              ...world.history,
              legislativeMeasures: [],
              legislativeDraftLineages: [],
            },
          }),
          compiledResult: null,
        };
        expect(
          compileAutomaticLawDraft({
            facts: empty,
            jurisdictionId: jurisdiction(place),
            propositionId: questionId,
            answer: "yes",
            designation: "HB 99",
            intakeKey: "unsupported",
          }),
        ).toBe(
          native.compileAutomaticLawDraft({
            world,
            jurisdictionId: jurisdiction(place),
            propositionId: questionId,
            answer: "yes",
            designation: "HB 99",
            intakeKey: "unsupported",
          }),
        );
        return;
      }
      sponsors.set(place, sponsor.personId);
      const candidate = budgetCandidates(world).candidates.find(
        (row) => row.jurisdictionId === jurisdiction(place),
      )!;
      const budget = openGovernmentBudget(world, candidate, world.currentDate);
      if (typeof budget === "string") throw new Error(budget);
      world = {
        ...world,
        publicBudgets: {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          adjustments: [],
          unknown: [],
          governments: [budget],
        },
      };
      const question = world.policyCatalog.propositions[questionId]!;
      // The shipped fixture's service-category control is explicit, not an
      // assertion that this authored catalog extension is a real law.
      world = {
        ...world,
        policyCatalog: {
          ...world.policyCatalog,
          propositions: {
            ...world.policyCatalog.propositions,
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
      };
      world = recordPrinciples(
        world,
        question.principles!.map((bearing) => ({
          stableKey: `rules2:auto:${place}:${bearing.principleId}`,
          personId: sponsor.personId,
          principleId: bearing.principleId,
          formedAt: world.currentDate,
          stance:
            bearing.bearing === "consistent-with"
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("experience:life", {
            note: "Authored automatic-law math admission.",
          }),
          supersedesPrincipleRecordId:
            world.history.principles
              .filter(
                (row) =>
                  row.personId === sponsor.personId &&
                  row.principleId === bearing.principleId,
              )
              .at(-1)?.id ?? null,
        })),
      );
      const baseline = fileDraft(world, place, 10, "weekday");
      world = enact(baseline.world, place, baseline.measureId);
      world = fileDraft(world, place, 15, "weekday").world;
      const reference = fileDraft(world, place, 25, "weekend");
      world = reference.world;
      const input = {
        jurisdictionId: jurisdiction(place),
        propositionId: questionId,
        sponsorPersonId: sponsor.personId,
        answer: "yes" as const,
        designation: "HB 99",
        intakeKey: `rules2:auto:${place}`,
      };
      const raw = facts(world),
        requests: Parameters<typeof compileBillDraft>[0][] = [];
      const original = drafting.compileBillDraft;
      const capture = vi
        .spyOn(drafting, "compileBillDraft")
        .mockImplementation((request) => {
          requests.push(request);
          return original(request);
        });
      let expected;
      try {
        expected = native.compileAutomaticLawDraft({ ...input, world });
      } finally {
        capture.mockRestore();
      }
      const actual = compileAutomaticLawDraft({ ...input, facts: raw });
      expect(expected).not.toBeNull();
      expect(actual).toEqual({
        kind: "compile-request",
        request: requests.at(-1),
      });
      expect(
        compileAutomaticLawDraft({
          ...input,
          facts: { ...raw, compiledResult: expected! },
        }),
      ).toEqual(expected);
      selected++;
      const request = {
        measureId: reference.measureId,
        questionKey: STATE_TRANSIT_SERVICE_QUESTION,
        termKey: "appropriation",
        unit: "minor" as const,
        basis: "appropriation-per-resident" as const,
        supportDirection: "raise" as const,
      };
      expect(sponsorRequestedLawTerm(raw, request)).toEqual(
        native.sponsorRequestedLawTerm(world, request),
      );
    },
    30000,
  );
});
