import * as lifeQueries from "./life-queries";
import {
  dataPrivacyInitialCostOn,
  NATIONAL_DATA_PRIVACY_QUESTION,
  ESTIMATED_PRIVACY_REVENUE_THRESHOLD_DOLLARS,
} from "./federal-data-privacy-law";
import { afterEach, describe, expect, it, vi } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { makeIsoDate } from "./dates";
import * as lawQuery from "./governing/law-in-force";
import * as termQuery from "./governing/final-law-term-query";
import { createWorld } from "./world";
import { stateJurisdictionForKey } from "./life-places";
import {
  anyTeacherFloorLawEnacted,
  teacherSalaryFloorAt,
  TEACHER_SALARY_FLOOR_QUESTION,
} from "./teacher-salary-floor";
import { serializeWorld, deserializeWorld } from "./serialization";
import { money } from "./resources";
import { TEST_TAX_TERMS } from "../../tests/fixtures/tax-policy-fixture";
import * as taxPolicy from "./tax-policy";
import {
  resolveTaxConsequences,
  TAX_SELECTOR,
  TAX_ACTION,
  TAX_AMOUNT,
} from "./law-consequences/tax";
import type { LawConsequenceRow } from "./law-consequence-types";
import type {
  TaxProposalRecord,
  TaxPolicyRecord,
  TaxBaseRecord,
} from "./tax-types";
import type { EntityId, World } from "./types";

const seed = "a15-starting-reader-admission";
const place = drawRandomPlace(seed);
const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
const date = makeIsoDate("2026-01-05");
const law: lawQuery.LawInForce = {
  answer: "yes",
  measureId:
    `starting-law:${place.stateJurisdictionKey}:${TEACHER_SALARY_FLOOR_QUESTION}` as EntityId,
  origin: "in-force-at-start",
  level: "state-statute",
  operativeAt: makeIsoDate("2026-01-01"),
  operativeBasis: "enacted-date",
};
afterEach(() => vi.restoreAllMocks());

// Controlled term-query boundary fixtures. These are not published starting
// teacher amounts; absent structured source rows remain an explicit gap.
describe("A15 starting teacher reader uses canonical numeric evidence", () => {
  function world() {
    return createWorld({
      seed,
      currentDate: date,
      jurisdictions: [state],
      people: [],
      lineage: "production",
    });
  }
  it("reads an admitted annual term without a fabricated enactment or median", () => {
    const w = world();
    vi.spyOn(lawQuery, "lawInForce").mockReturnValue(law);
    const term = {
      value: 50_000,
      unit: "dollars/year" as const,
      measureId: law.measureId,
      provisionId: null,
      sourceRecordIds: [law.measureId],
    };
    const query = vi
      .spyOn(termQuery, "readFinalEnactedLawTerm")
      .mockReturnValue(term);
    expect(anyTeacherFloorLawEnacted(w)).toBe(true);
    expect(w.history.legislativeEnactments ?? []).toHaveLength(0);
    expect(teacherSalaryFloorAt(w, state.id, date, null)).toEqual({
      annual: term.value,
      measureId: law.measureId,
      from: law.operativeAt,
    });
    expect(query).toHaveBeenCalledWith(w, law, {
      questionKey: TEACHER_SALARY_FLOOR_QUESTION,
      termKey: "floor",
      unit: "dollars/year",
      onDate: date,
    });
  });
  it.each([null, -1, Number.NaN])(
    "does not infer a salary amount from a yes answer (%s)",
    (value) => {
      vi.spyOn(lawQuery, "lawInForce").mockReturnValue(law);
      vi.spyOn(termQuery, "readFinalEnactedLawTerm").mockReturnValue(
        value === null
          ? null
          : {
              value,
              unit: "dollars/year",
              measureId: law.measureId,
              provisionId: null,
              sourceRecordIds: [law.measureId],
            },
      );
      expect(teacherSalaryFloorAt(world(), state.id, date, 80_000)).toBeNull();
    },
  );
  it("honors a starting repeal and an unavailable jurisdiction", () => {
    vi.spyOn(lawQuery, "lawInForce").mockReturnValue({ ...law, answer: "no" });
    expect(teacherSalaryFloorAt(world(), state.id, date, 80_000)).toBeNull();
    expect(teacherSalaryFloorAt(world(), null, date, 80_000)).toBeNull();
  });
});

it("opens a real new game in a random place and preserves starting-law reads on Continue", () => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed,
  });
  expect(game.world.people[game.playerPersonId]).toBeDefined();
  const before = teacherSalaryFloorAt(
    game.world,
    state.id,
    game.world.currentDate,
    null,
  );
  const loaded = deserializeWorld(serializeWorld(game.world));
  expect(
    teacherSalaryFloorAt(loaded, state.id, loaded.currentDate, null),
  ).toEqual(before);
  expect(loaded.people[game.playerPersonId]).toEqual(
    game.world.people[game.playerPersonId],
  );
  console.info(
    "A15_NEW_GAME",
    JSON.stringify({
      seed,
      place: place.key,
      personId: game.playerPersonId,
      teacherFloor: before,
    }),
  );
});

// Authored saved-base/typed-policy query boundary, not admission of a real
// starting-law levy or creation of a new assessment/collection.
it("lets an exact starting-law typed-policy join reach the existing tax preview", () => {
  const w = createWorld({
    seed,
    currentDate: date,
    jurisdictions: [state],
    people: [],
    lineage: "production",
  });
  const personId = "person_a15_fixture" as EntityId;
  const proposition = Object.values(w.policyCatalog.propositions).find(
    (p) => p.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
  )!;
  const base = {
    id: "tax-base_a15_fixture" as EntityId,
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: state.id,
    payer: { kind: "person", personId },
    baseKey: TEST_TAX_TERMS.baseKey,
    amount: money(10_000, "USD"),
    sourceEventId: "event_a15_fixture" as EntityId,
  } as TaxBaseRecord;
  const proposal = {
    id: "tax-proposal_a15_fixture" as EntityId,
    measureId: law.measureId,
    jurisdictionId: state.id,
    power: {},
    recordedAt: date,
    terms: TEST_TAX_TERMS,
    levyProvisionId: "provision_a15_fixture" as EntityId,
  } as TaxProposalRecord;
  const policy = {
    id: "tax-policy_a15_fixture" as EntityId,
    proposalId: proposal.id,
    enactmentId: law.measureId,
  } as TaxPolicyRecord;
  const saved = {
    ...w,
    people: { [personId]: { id: personId } },
    history: { ...w.history, taxBases: [base], taxProposals: [proposal] },
  } as unknown as World;
  vi.spyOn(lawQuery, "lawInForce").mockReturnValue(law);
  vi.spyOn(taxPolicy, "taxBaseOccurrenceSource").mockReturnValue(null);
  vi.spyOn(taxPolicy, "effectiveTaxPolicy").mockReturnValue(policy);
  const preview = vi.spyOn(taxPolicy, "previewTax");
  const row: LawConsequenceRow = {
    id: "a15:controlled-typed-query",
    kind: "tax",
    when: "assessment",
    who: { selector: TAX_SELECTOR, predicates: [] },
    what: TAX_ACTION,
    amount: { op: "record", key: TAX_AMOUNT, unit: "minor" },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: [],
      population: "Authored typed query boundary",
      scope: "No production starting levy is supplied",
      why: "The exact saved proposal joins the law",
      uncertainty: "Fixture only",
    },
  };
  const before = JSON.stringify(saved);
  const result = resolveTaxConsequences(saved, row, {
    onDate: date,
    activity: "assessment",
    activityId: base.id,
    subjectIds: [personId],
    questionKey: proposition.stableKey,
  });
  expect(preview).toHaveBeenCalledWith(
    proposal.terms,
    base.baseKey,
    base.amount,
  );
  expect(result).toHaveLength(1);
  expect(result[0]!.law).toEqual(law);
  expect(result[0]!.sourceRecordIds).toContain(proposal.id);
  expect(JSON.stringify(saved)).toBe(before);
  expect(
    resolveTaxConsequences(
      { ...saved, history: { ...saved.history, taxProposals: [] } },
      row,
      {
        onDate: date,
        activity: "assessment",
        activityId: base.id,
        subjectIds: [personId],
        questionKey: proposition.stableKey,
      },
    ),
  ).toEqual([]);
});

// Controlled law/profile query boundary. No national starting privacy law is
// asserted to exist, and this read-only test never writes a business expense.
it("uses a canonical starting privacy key without manufacturing an enactment", () => {
  const w = createWorld({
    seed,
    currentDate: date,
    jurisdictions: [state],
    people: [],
    lineage: "production",
  });
  const firm = "organization_a15_fixture" as EntityId;
  const personId = "person_a15_fixture" as EntityId;
  const workId = "work_a15_fixture" as EntityId;
  const starting = {
    ...law,
    level: "federal-statute" as const,
    measureId: `starting-law:US:${NATIONAL_DATA_PRIVACY_QUESTION}` as EntityId,
  };
  const saved = {
    ...w,
    people: { [personId]: { id: personId } },
    townFinances: {
      businesses: {
        [firm]: {
          openedAt: date,
          annualRevenue: ESTIMATED_PRIVACY_REVENUE_THRESHOLD_DOLLARS + 1,
        },
      },
    },
    history: {
      ...w.history,
      workRelationships: [
        {
          id: workId,
          organizationId: firm,
          personId,
          kind: "employment:staff",
          compensation: "paid",
          startedAt: date,
          recordedAt: date,
        },
      ],
    },
  } as unknown as World;
  vi.spyOn(lawQuery, "lawInForce").mockReturnValue(starting);
  const terms = vi.spyOn(lawQuery, "startingLawTerms").mockReturnValue([]);
  vi.spyOn(lawQuery, "startingLawScope").mockReturnValue(null);
  vi.spyOn(lifeQueries, "organizationProfileAt").mockReturnValue({
    id: "profile_a15_fixture" as EntityId,
    closed: false,
    classification: "sector:private",
  } as unknown as NonNullable<
    ReturnType<typeof lifeQueries.organizationProfileAt>
  >);
  vi.spyOn(lifeQueries, "workStatusAt").mockReturnValue({
    id: "status_a15_fixture" as EntityId,
    status: "active",
  } as NonNullable<ReturnType<typeof lifeQueries.workStatusAt>>);
  vi.spyOn(lifeQueries, "workRoleAt").mockReturnValue({
    id: "role_a15_fixture" as EntityId,
  } as NonNullable<ReturnType<typeof lifeQueries.workRoleAt>>);
  const before = JSON.stringify(saved);
  const result = dataPrivacyInitialCostOn(saved, date, firm);
  expect(result).not.toBeNull();
  expect(result!.law).toEqual(starting);
  expect(result!.sourceRecordIds).toContain(starting.measureId);
  expect(saved.history.legislativeEnactments ?? []).toHaveLength(0);
  expect(JSON.stringify(saved)).toBe(before);
  terms.mockReturnValue([
    {
      questionKey: NATIONAL_DATA_PRIVACY_QUESTION,
      key: "coverage",
      value: 1,
      unit: "ratio",
    },
  ]);
  expect(dataPrivacyInitialCostOn(saved, date, firm)).toBeNull();
});
