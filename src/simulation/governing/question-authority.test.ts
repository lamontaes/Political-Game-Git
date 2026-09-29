import { describe, expect, it } from "vitest";

import catalog from "../../../data/research/powers-catalog/catalog.json" with { type: "json" };
import questionPowers from "../../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { townQuestions } from "../living-world/local-council-meetings";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawInForce } from "./law-in-force";
import {
  jurisdictionPowersLevels,
  questionAuthority,
  type PowersLevel,
  type QuestionReach,
} from "./question-authority";

/**
 * A level answers only the questions its powers cover, for every place: the
 * 50 states, D.C., the five territories, a county and a town in each where
 * the place corpus has one, and the United States.
 */

const POLICY = createProductionPolicyCatalog();
const WORLD = { policyCatalog: POLICY } as unknown as World;
const FEDERAL = NATIONAL_ELECTION_JURISDICTION.id;

interface Row {
  readonly dial: string;
  readonly levels: readonly QuestionReach[];
  readonly why?: string;
}
const ROWS = questionPowers.questions as unknown as Readonly<
  Record<string, Row>
>;
const CELLS = new Map(
  (
    catalog.dials as unknown as readonly {
      id: string;
      levels: Record<string, { may: string }>;
    }[]
  ).map((dial) => [dial.id, dial.levels]),
);
const ISSUE_REACH: Record<string, QuestionReach> = {
  federal: "federal",
  state: "state",
  county: "county",
  municipality: "city",
  "school-district": "school-district",
};

const QUESTIONS = POLICY.propositionOrder.map((id) => {
  const proposition = POLICY.propositions[id]!;
  return {
    id,
    key: proposition.stableKey,
    issueLevels: (POLICY.issues[proposition.issueId]?.levels ?? []).map(
      (level) => ISSUE_REACH[level]!,
    ),
  };
});
const questionId = (key: string) =>
  QUESTIONS.find((question) => question.key === key)!.id;

/** The questions only a state's own law answers. */
const STATE_ONLY = QUESTIONS.filter((question) => {
  const levels = ROWS[question.key]!.levels;
  return (
    levels.includes("state") &&
    !levels.some((l) => l === "county" || l === "city")
  );
});

const TERRITORIES = new Set(["PR", "GU", "VI", "AS", "MP"]);

interface Place {
  readonly name: string;
  readonly id: EntityId;
  readonly expected: readonly PowersLevel[];
}

function everyPlace(): readonly Place[] {
  const places: Place[] = [{ name: "US", id: FEDERAL, expected: ["federal"] }];
  for (const state of lifePlaceStateIdentities()) {
    const usps = state.usps;
    const own: PowersLevel =
      usps === "DC" ? "dc" : TERRITORIES.has(usps) ? "territory" : "state";
    places.push({
      name: state.jurisdictionKey,
      id: stateJurisdictionForKey(state.jurisdictionKey)!.id,
      expected: [own],
    });
    const local = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
    }).filter((place) => place.scope !== "state");
    const county = local.find(
      (place) => place.context.jurisdiction.kind === "census-county",
    );
    const town = local.find(
      (place) =>
        place.context.jurisdiction.kind === "census-place" ||
        place.context.jurisdiction.kind === "territory-place",
    );
    for (const [place, level] of [
      [county, "county"],
      [town, "city"],
    ] as const) {
      if (!place) continue;
      places.push({
        name: `${state.jurisdictionKey} ${place.key}`,
        id: place.context.jurisdiction.id,
        expected: usps === "DC" ? ["dc"] : [level],
      });
    }
  }
  const lexington = lifePlaceByKey("lexington-fayette")!;
  places.push({
    name: "Lexington (a consolidated city-county)",
    id: lexington.context.jurisdiction.id,
    expected: ["county", "city"],
  });
  return places;
}

const PLACES = everyPlace();

describe("which question each level may answer", () => {
  it("maps every question in the catalog to a powers dial, at levels its issue allows", () => {
    expect(QUESTIONS.length).toBe(87);
    expect(Object.keys(ROWS).sort()).toEqual(
      QUESTIONS.map((question) => question.key).sort(),
    );
    for (const question of QUESTIONS) {
      const row = ROWS[question.key]!;
      expect(CELLS.has(row.dial), `${question.key}: ${row.dial}`).toBe(true);
      expect(row.levels.length, question.key).toBeGreaterThan(0);
      // Wider than its issue only for federal law, and only with the reason.
      for (const level of row.levels)
        if (!question.issueLevels.includes(level)) {
          expect(level, question.key).toBe("federal");
          expect(row.why, question.key).toBeTruthy();
        }
      // Narrower than its issue only with the reason.
      if (question.issueLevels.some((level) => !row.levels.includes(level)))
        expect(row.why, question.key).toBeTruthy();
      // The catalog never withholds the dial from a level the row names.
      const cells = CELLS.get(row.dial)!;
      for (const level of row.levels)
        expect(cells[level]?.may, `${question.key} at ${level}`).not.toBe("no");
    }
  });

  it("knows the level of every place: the 50 states, D.C., the territories, their counties and towns", () => {
    expect(
      PLACES.filter((place) => place.expected[0] === "state"),
    ).toHaveLength(50);
    expect(
      PLACES.filter((place) => place.expected[0] === "territory"),
    ).toHaveLength(5);
    expect(PLACES.filter((place) => place.expected[0] === "dc")).toHaveLength(
      3,
    );
    for (const place of PLACES)
      expect(jurisdictionPowersLevels(WORLD, place.id), place.name).toEqual(
        place.expected,
      );
  });

  it("lets a county or town answer no state question, in any state", () => {
    expect(STATE_ONLY.length).toBeGreaterThanOrEqual(45);
    const locals = PLACES.filter((place) =>
      place.expected.every((level) => level === "county" || level === "city"),
    );
    expect(locals.length).toBeGreaterThanOrEqual(100);
    for (const place of locals)
      for (const question of STATE_ONLY)
        expect(
          questionAuthority(WORLD, place.id, question.id).may,
          `${place.name}: ${question.key}`,
        ).toBe("no");
  });

  it("names the questions the one-year Lexington report caught a city answering", () => {
    const lexington =
      lifePlaceByKey("lexington-fayette")!.context.jurisdiction.id;
    for (const key of [
      "us-policy-positions:fiscal.graduated-income-tax",
      "us-policy-positions:fiscal.adopt-income-tax",
      "us-policy-positions:government-operations.legislative-term-limits",
      "us-policy-positions:government-operations.independent-redistricting",
      "us-policy-positions:fiscal.cap-property-tax-growth",
    ]) {
      expect(
        questionAuthority(WORLD, lexington, questionId(key)).may,
        key,
      ).toBe("no");
      const kentucky = stateJurisdictionForKey("US-KY")!.id;
      expect(questionAuthority(WORLD, kentucky, questionId(key)).may, key).toBe(
        "yes",
      );
    }
  });

  it("gives every place the same answer from the same catalog cell", () => {
    for (const place of PLACES) {
      for (const question of QUESTIONS) {
        const row = ROWS[question.key]!;
        const authority = questionAuthority(WORLD, place.id, question.id);
        const reach: Record<PowersLevel, readonly QuestionReach[]> = {
          federal: ["federal"],
          state: ["state"],
          territory: ["state"],
          dc: ["state", "county", "city"],
          county: ["county"],
          city: ["city"],
          "school-district": ["school-district"],
          "special-district": [],
        };
        const own = place.expected.filter((level) =>
          reach[level].some((kind) => row.levels.includes(kind)),
        );
        const label = `${place.name}: ${question.key}`;
        if (own.length === 0) {
          expect(authority.may, label).toBe("no");
          continue;
        }
        const cells = own.map((level) => CELLS.get(row.dial)![level]!.may);
        const expected = cells.some((may) => may === "yes" || may === "limited")
          ? "yes"
          : cells.some((may) => may !== "no")
            ? "unknown"
            : "no";
        expect(authority.may, label).toBe(expected);
        expect(authority.dial, label).toBe(row.dial);
      }
    }
  });

  it("lets Congress answer only federal questions and the state questions federal law already answers", () => {
    const answered = QUESTIONS.filter(
      (question) => questionAuthority(WORLD, FEDERAL, question.id).may !== "no",
    ).map((question) => question.key);
    expect(
      answered.filter((key) => key.startsWith("us-federal-positions:")),
    ).toHaveLength(20);
    expect(
      answered.filter((key) => !key.startsWith("us-federal-positions:")),
    ).toEqual([
      "us-policy-positions:health-human-services.medicaid-work-requirement",
      "us-policy-positions:health-human-services.work-requirement-for-assistance",
    ]);
    // And no state, territory or town answers a federal question.
    for (const place of PLACES.filter((p) => p.id !== FEDERAL))
      for (const question of QUESTIONS.filter((q) =>
        q.key.startsWith("us-federal-positions:"),
      ))
        expect(
          questionAuthority(WORLD, place.id, question.id).may,
          `${place.name}: ${question.key}`,
        ).toBe("no");
  });

  it("agrees with every row of the starting law", () => {
    const questions = (
      startingLaw as unknown as {
        questions: Record<string, { answers: Record<string, unknown> }>;
      }
    ).questions;
    let rows = 0;
    for (const [key, question] of Object.entries(questions))
      for (const placeKey of Object.keys(question.answers)) {
        const place =
          placeKey === "US" ? FEDERAL : stateJurisdictionForKey(placeKey)!.id;
        expect(
          questionAuthority(WORLD, place, questionId(key)).may,
          `${placeKey}: ${key}`,
        ).not.toBe("no");
        rows += 1;
      }
    expect(rows).toBeGreaterThan(300);
  });

  it("gives a town council only its own questions to file ordinances on, in every state", () => {
    const towns = PLACES.filter((place) => place.expected.includes("city"));
    for (const town of towns) {
      const keys = new Set(
        townQuestions(WORLD, town.id).map((question) => question.stableKey),
      );
      expect(keys.size, town.name).toBeGreaterThan(0);
      for (const question of STATE_ONLY)
        if (!town.expected.includes("dc"))
          expect(keys.has(question.key), `${town.name}: ${question.key}`).toBe(
            false,
          );
    }
  });
});

describe("the law in force keeps to each level's powers", () => {
  const lexington =
    lifePlaceByKey("lexington-fayette")!.context.jurisdiction.id;
  const kentucky = stateJurisdictionForKey("US-KY")!.id;
  let sequence = 0;
  function enacted(
    jurisdictionId: EntityId,
    key: string,
    answer: "yes" | "no",
  ): {
    measure: LegislativeMeasureRecord;
    enactment: LegislativeEnactmentRecord;
  } {
    sequence += 1;
    const id = `measure_${sequence}` as EntityId;
    const propositionId = questionId(key);
    return {
      measure: {
        id,
        stableKey: `test:${sequence}`,
        sequence,
        jurisdictionId,
        rulePackId: "test",
        designation: `ORD ${sequence}`,
        shortTitle: "A test ordinance",
        summary: "A test ordinance.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "council",
        sponsorPersonId: null,
        introducedAt: makeIsoDate("2026-01-01"),
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [propositionId],
        propositionAnswers: [{ propositionId, answer }],
      },
      enactment: {
        id: `enactment_${sequence}` as EntityId,
        stableKey: `test:${sequence}:enactment`,
        sequence: 1000 + sequence,
        measureId: id,
        resolvedAt: makeIsoDate("2026-02-01"),
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: makeIsoDate("2026-02-01"),
        outcomeEventId: `event_${sequence}` as EntityId,
      },
    };
  }
  function worldWith(laws: readonly ReturnType<typeof enacted>[]): World {
    return {
      currentDate: makeIsoDate("2027-01-01"),
      policyCatalog: POLICY,
      history: {
        legislativeMeasures: laws.map((law) => law.measure),
        legislativeEnactments: laws.map((law) => law.enactment),
      },
    } as unknown as World;
  }

  it("keeps a city ordinance on a state question on the record, governing nothing", () => {
    const key = "us-policy-positions:fiscal.graduated-income-tax";
    const ordinance = enacted(lexington, key, "yes");
    const world = worldWith([ordinance]);
    // Kentucky's own starting law answers it; the ordinance never does.
    const state = lawInForce(world, kentucky, questionId(key));
    expect(state?.origin).toBe("in-force-at-start");
    expect(lawInForce(world, lexington, questionId(key))).toEqual(state);
    expect(world.history.legislativeMeasures).toHaveLength(1);
  });

  it("lets a city ordinance govern the city's own question, in that city only", () => {
    const key =
      "us-policy-positions:justice-public-safety.civilian-oversight-of-police";
    const ordinance = enacted(lexington, key, "yes");
    const world = worldWith([ordinance]);
    expect(lawInForce(world, lexington, questionId(key))).toMatchObject({
      answer: "yes",
      level: "local-ordinance",
      measureId: ordinance.measure.id,
    });
    expect(lawInForce(world, kentucky, questionId(key))).toBeNull();
  });

  it("still puts a state law over an ordinance on a question both may answer", () => {
    const key = "us-policy-positions:housing-land-use.rent-stabilization";
    const ordinance = enacted(lexington, key, "yes");
    const statute = enacted(kentucky, key, "no");
    expect(
      lawInForce(worldWith([ordinance, statute]), lexington, questionId(key)),
    ).toMatchObject({ answer: "no", level: "state-statute" });
  });
});
