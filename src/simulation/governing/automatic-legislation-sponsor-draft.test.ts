import { beforeAll, describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createWorld, assertWorldIntegrity } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createLegislativeScenario,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
  type AuthoredVoteCounts,
} from "../legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
  referMeasure,
  recordCommitteeDisposition,
} from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { applyLegislativeStep } from "../../presentation/legislation-session";
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
  readFinalEnactedLawTerm,
  readFinalEnactedLawCategories,
} from "./automatic-legislation";
import { fileMemberAgendaBills } from "./member-agenda";
import { lawInForce } from "./law-in-force";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { seatsForChamber } from "../legislature-game-profile";
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
const places = pickDistinct(new SeededRng(seed), US_STATE_USPS, 5);
let world: World;
let opening: World;
const cases = new Map<string, World>();
let questionId: EntityId;
const sponsors = new Map<string, EntityId>();
const baselines = new Map<string, EntityId>();
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
    governorAction: "signed",
    governorRationale:
      "Controlled unanimous fixture decisions; not a simulated real vote.",
  };
  let next = start;
  for (let guard = 0; guard < 40; guard++) {
    if (measurePosition(next, measureId).phase === "awaiting-enactment")
      return recordEnactment(next, {
        stableKey: `${measureId}:law`,
        measureId,
        effectiveAt: next.currentDate,
      });
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No next step in ${place}: ${measurePosition(next, measureId).phase}`,
      );
    next = applyLegislativeStep(context, next, step).world;
  }
  throw new Error(`No enactment in ${place}`);
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
  for (const place of places) {
    const baseline = file(opening, place, 10, "weekday");
    baselines.set(place, baseline.measureId);
    let start = enact(baseline.world, place, baseline.measureId);
    start = file(start, place, 15, "weekday").world;
    start = file(start, place, 25, "weekend").world;
    cases.set(place, strength(start, sponsors.get(place)!, 1));
  }
  world = cases.get(places[0]!)!;
}, 30000);

describe("automatic bills request actual saved reference terms", () => {
  it.each(places)(
    "writes sponsor numbers, copied categories and reasons in %s",
    (place) => {
      const start = cases.get(place)!;
      const draft = compileAutomaticLawDraft(input(start, place))!;
      expect(draft).not.toBeNull();
      expect(draft.appropriatedMinorUnits).toBe(
        Math.round(population(start, place) * 25),
      );
      expect(draft.parameterValues["service-window"]).toEqual({
        kind: "enumerated",
        value: "weekend",
      });
      const personId = sponsors.get(place)!;
      const args = {
        ...input(start, place),
        stableKey: `g2-filed:${place}`,
        originChamberKey: legislativePackForJurisdiction(jurisdiction(place))!
          .chamberOrder[0]!,
        principleRecordIds: [],
        principleScore: 0,
      };
      const written = introduceAutomaticLawMeasure(start, args)!;
      expect(written).not.toBeNull();
      const amount = written.world.history.legislativeProvisions!.find(
        (row) =>
          row.measureId === written.measureId &&
          row.provisionKey === "amount-provided",
      )!;
      expect(amount.lawTerms?.[0]?.value).toBe(draft.appropriatedMinorUnits);
      expect(amount.lawCategories?.[0]?.values).toEqual(["weekend"]);
      const event = written.world.history.events.find(
        (row) => row.stableKey === `g2-filed:${place}:requested-terms-reason`,
      )!;
      expect(event.participants[0]!.personId).toBe(personId);
      expect(
        event.tags.some((tag) => tag.startsWith("source-record:principle_")),
      ).toBe(true);
      assertWorldIntegrity(written.world);
      const loaded = deserializeWorld(serializeWorld(written.world));
      expect(serializeWorld(loaded)).toBe(serializeWorld(written.world));
      expect(introduceAutomaticLawMeasure(loaded, args)?.world).toBe(loaded);
      const enacted = enact(loaded, place, written.measureId);
      const law = lawInForce(enacted, jurisdiction(place), questionId)!;
      expect(
        readFinalEnactedLawTerm(enacted, law, {
          questionKey: STATE_TRANSIT_SERVICE_QUESTION,
          termKey: "appropriation",
          unit: "minor",
        })?.value,
      ).toBe(draft.appropriatedMinorUnits);
      expect(
        readFinalEnactedLawCategories(enacted, law, {
          questionKey: STATE_TRANSIT_SERVICE_QUESTION,
          termKey: "service-window",
        })?.values,
      ).toEqual(["weekend"]);
      console.log(
        JSON.stringify({
          seed,
          place,
          sponsor: personName(start.people[personId]!),
          personId,
          population: population(start, place),
          requestedMinor: draft.appropriatedMinorUnits,
          measureId: written.measureId,
          eventId: event.id,
        }),
      );
    },
  );
  it("keeps a seated member's supported bill alive when no numeric references exist", () => {
    const place = places[0]!;
    let start = opening;
    const pack = legislativePackForJurisdiction(jurisdiction(place))!;
    const members = stateLegislators(start, `${pack.packId}:candidacy`).filter(
      (row) => row.officeKey.endsWith(`:${pack.chamberOrder[0]}`),
    );
    for (const member of members) start = strength(start, member.personId, 1);
    // Catalog-order ties select this controlled opportunity; no other question's bearing is changed.
    start = {
      ...start,
      policyCatalog: {
        ...start.policyCatalog,
        propositionOrder: [
          questionId,
          ...start.policyCatalog.propositionOrder.filter(
            (id) => id !== questionId,
          ),
        ],
      },
    };
    const next = fileMemberAgendaBills(start, {
      jurisdictionId: jurisdiction(place),
      chamberKey: legislativePackForJurisdiction(jurisdiction(place))!
        .chamberOrder[0]!,
      intakeKey: "g2-no-number-filing",
    });
    const bill = (next.history.legislativeMeasures ?? []).find((row) =>
      row.propositionIds?.includes(questionId),
    );
    expect(bill).toBeDefined();
    expect(members.map((row) => row.personId)).toContain(bill!.sponsorPersonId);
    expect(bill!.propositionAnswers).toEqual([
      { propositionId: questionId, answer: "yes" },
    ]);
    expect(
      (next.history.legislativeProvisions ?? []).filter(
        (row) => row.measureId === bill!.id,
      ),
    ).toHaveLength(0);
    expect(
      (next.history.legislativeDraftLineages ?? []).filter(
        (row) => row.measureId === bill!.id,
      ),
    ).toHaveLength(0);
    expect(bill!.summary).toContain("No numeric terms are requested");
    assertWorldIntegrity(next);
    const loaded = deserializeWorld(serializeWorld(next));
    expect(
      fileMemberAgendaBills(loaded, {
        jurisdictionId: jurisdiction(place),
        chamberKey: legislativePackForJurisdiction(jurisdiction(place))!
          .chamberOrder[0]!,
        intakeKey: "g2-no-number-filing",
      }),
    ).toBe(loaded);
  });
  it("the real agenda files requested numeric changes to an existing yes law", () => {
    const place = places[0]!;
    const pack = legislativePackForJurisdiction(jurisdiction(place))!;
    let start = cases.get(place)!;
    const committee = pack.chambers[0]!.committees[0]!;
    for (const measure of start.history.legislativeMeasures!.filter(
      (row) =>
        row.jurisdictionId === jurisdiction(place) &&
        !measurePosition(start, row.id).terminal,
    )) {
      start = referMeasure(start, {
        stableKey: `${measure.id}:fixture-referral`,
        measureId: measure.id,
        committeeKey: committee.committeeKey,
      });
      start = recordCommitteeDisposition(start, {
        stableKey: `${measure.id}:fixture-rejection`,
        measureId: measure.id,
        recommendation: "favorable",
        dispositions: Array.from(
          { length: committee.appointedMembers ?? 1 },
          (_, i) => ({
            memberKey: `fixture-member:${i}`,
            personId: null,
            disposition: "nay" as const,
          }),
        ),
        rationale:
          "Explicit fixture rejection ends this reference bill without changing the law.",
        provenance: {
          method: "authored-fixture",
          note: "Controlled earlier bill outcome, not a generated person decision.",
          sourceEntityIds: [],
        },
      });
      expect(measurePosition(start, measure.id).terminal).toBe(true);
    }
    const members = stateLegislators(start, `${pack.packId}:candidacy`).filter(
      (row) => row.officeKey.endsWith(`:${pack.chamberOrder[0]}`),
    );
    for (const member of members) start = strength(start, member.personId, 1);
    start = {
      ...start,
      policyCatalog: {
        ...start.policyCatalog,
        propositionOrder: [
          questionId,
          ...start.policyCatalog.propositionOrder.filter(
            (id) => id !== questionId,
          ),
        ],
      },
    };
    const ids = new Set(
      start.history.legislativeMeasures!.map((row) => row.id),
    );
    expect(lawInForce(start, jurisdiction(place), questionId)?.answer).toBe(
      "yes",
    );
    const next = fileMemberAgendaBills(start, {
      jurisdictionId: jurisdiction(place),
      chamberKey: pack.chamberOrder[0]!,
      intakeKey: "g2-backed-amendment",
    });
    const bill = next.history.legislativeMeasures!.find(
      (row) => !ids.has(row.id) && row.propositionIds?.includes(questionId),
    );
    expect(bill).toBeDefined();
    expect(members.map((row) => row.personId)).toContain(bill!.sponsorPersonId);
    const amount = next.history.legislativeProvisions!.find(
      (row) =>
        row.measureId === bill!.id && row.provisionKey === "amount-provided",
    )!;
    expect(amount.fiscalExposureMinorUnits).toBe(
      Math.round(population(start, place) * 25),
    );
    expect(amount.lawTerms?.[0]?.value).toBe(amount.fiscalExposureMinorUnits);
    expect(amount.lawCategories?.[0]?.values).toEqual(["weekend"]);
    assertWorldIntegrity(next);
  });
  it("uses another government's recorded per-resident amount against this government's actual base", () => {
    const target = places[0]!;
    const source = places[1]!;
    const reference = file(cases.get(target)!, source, 35, "weekend");
    const draft = compileAutomaticLawDraft(input(reference.world, target))!;
    expect(draft.appropriatedMinorUnits).toBe(
      Math.round(population(reference.world, target) * 35),
    );
    expect(draft.appropriatedMinorUnits).not.toBe(
      Math.round(population(reference.world, source) * 35),
    );
    expect(draft.sponsorRequest?.referenceMeasureId).toBe(reference.measureId);
    const otherMember = stateLegislators(
      reference.world,
      `${legislativePackForJurisdiction(jurisdiction(target))!.packId}:candidacy`,
    ).find((row) => row.personId !== sponsors.get(target))!;
    const weak = strength(reference.world, otherMember.personId, 0.25);
    expect(
      compileAutomaticLawDraft({
        ...input(weak, target),
        sponsorPersonId: otherMember.personId,
      })?.appropriatedMinorUnits,
    ).toBe(Math.round(population(weak, target) * 15));
  });
  it("refuses to recover parameter choices from reference text that no longer matches", () => {
    const place = places[0]!;
    const start = cases.get(place)!;
    const reference = start.history.legislativeMeasures!.find(
      (row) => row.stableKey === `g2-reference:${place}:25:weekend`,
    )!;
    const extra = recordFiledProvision(start, {
      stableKey: `${reference.stableKey}:extra`,
      measureId: reference.id,
      provisionKey: "additional-service-rule",
      sectionNumber: 99,
      heading: "Additional controlled rule",
      text: "This fixture adds a rule the stored parameter lineage does not express.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the existing program",
      },
      applicationScope: {
        jurisdictionId: jurisdiction(place),
        segmentKey: null,
      },
    });
    expect(
      compileAutomaticLawDraft(input(extra, place))?.appropriatedMinorUnits,
    ).toBe(Math.round(population(extra, place) * 15));
  });
  it("uses actual strength and population, independently of intake keys", () => {
    const place = places[0]!;
    const weak = strength(world, sponsors.get(place)!, 0.25);
    const nearest = compileAutomaticLawDraft(input(weak, place))!;
    expect(nearest.appropriatedMinorUnits).toBe(
      Math.round(population(weak, place) * 15),
    );
    expect(nearest.parameterValues["service-window"]).toEqual({
      kind: "enumerated",
      value: "weekday",
    });
    expect(
      compileAutomaticLawDraft({
        ...input(world, place),
        intakeKey: "another-intake",
      })?.parameterValues,
    ).toEqual(compileAutomaticLawDraft(input(world, place))?.parameterValues);
    expect(
      compileAutomaticLawDraft({
        ...input(world, place),
        sponsorPersonId: undefined,
      }),
    ).toBeNull();
    expect(
      compileAutomaticLawDraft({
        ...input(world, place),
        world: { ...world, publicBudgets: undefined },
      }),
    ).toBeNull();
  });
  it("does not replace an unavailable current law with a default amount", () => {
    const place = places[0]!;
    const measureId = baselines.get(place)!;
    const without = {
      ...world,
      history: {
        ...world.history,
        legislativeDraftLineages:
          world.history.legislativeDraftLineages!.filter(
            (row) => row.measureId !== measureId,
          ),
      },
    };
    expect(compileAutomaticLawDraft(input(without, place))).toBeNull();
    const unrelated = CHIEF_EXECUTIVE_JURISDICTIONS.find(
      (code) => !places.includes(code as (typeof places)[number]),
    )!;
    expect(
      compileAutomaticLawDraft({
        ...input(world, place),
        jurisdictionId: jurisdiction(unrelated),
      }),
    ).toBeNull();
  });
});
