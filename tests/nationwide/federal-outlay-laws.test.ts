import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  DEBT_LIMIT_CUT_SHARE,
  DEBT_LIMIT_CUTS_QUESTION,
  federalDeficitChangePctOfGdp,
  FOREIGN_AID_RISE_DOLLARS,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../../src/simulation/federal-outlay-laws";
import { stableHash } from "../../src/simulation/ids";
import { createHistoryStore } from "../../src/simulation/history";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import {
  researchedLinkSize,
  OUTCOME_LINKS,
  outcomeLinkStatus,
} from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeRecords,
  placeOutcomesForMonth,
} from "../../src/simulation/outcome-web/place-outcomes";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "../../src/simulation/public-budgets";
import { firstOfNextMonth } from "../../src/simulation/public-budgets/fiscal";
import {
  settleGovernmentMonth,
  type MonthFlows,
} from "../../src/simulation/public-budgets/month";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * Federal laws that change what Washington spends, watched in a place drawn
 * from all 56. A law that makes Congress cut spending before it raises the
 * debt limit cuts the federal aid in a government's budget and lowers what
 * states pay to borrow; a law that spends more on foreign aid raises the
 * federal deficit and, by a hair, what states pay to borrow. A later law
 * answering no ends each.
 */

const SEED = "federal-outlay-laws";
const POLICY = createProductionPolicyCatalog();
const ALL_PLACES = lifePlaceStateIdentities();
const PLACE =
  ALL_PLACES[
    Number.parseInt(stableHash(SEED).slice(0, 8), 16) % ALL_PLACES.length
  ]!;
const STATE = stateJurisdictionForKey(PLACE.jurisdictionKey)!.id;
const FEDERAL_AID = BUDGET_SOURCES.indexOf("federalAid");
const BORROWING = "gov.borrowing-cost";

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

const questionId = (stableKey: string) =>
  POLICY.propositionOrder.find(
    (id) => POLICY.propositions[id]!.stableKey === stableKey,
  )!;

let sequence = 0;
function act(
  questionKey: string,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const question = questionId(questionKey);
  const measure: LegislativeMeasureRecord = {
    id: `measure_outlay_${sequence}` as EntityId,
    stableKey: `test:outlay:${sequence}`,
    sequence,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${sequence}`,
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: addDays(effectiveAt, -90),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_outlay_${sequence}` as EntityId,
    stableKey: `test:outlay:${sequence}:enactment`,
    sequence: 1000 + sequence,
    measureId: measure.id,
    resolvedAt: addDays(effectiveAt, -30),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_outlay_${sequence}` as EntityId,
  };
  return { measure, enactment };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  const world = {
    id: "world_test" as EntityId,
    seed: SEED,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: POLICY,
    history: {
      ...createHistoryStore(),
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  return {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
}

function settle(
  world: World,
  lastMonth: string,
  state: EntityId = STATE,
): PublicBudgetGovernment {
  let government = publicBudgetFor(world, state)!;
  let month = makeIsoDate("2026-01-01");
  while (month <= lastMonth) {
    government = settleGovernmentMonth(
      world,
      government,
      month,
      NO_FLOWS,
    ).government;
    month = firstOfNextMonth(month);
  }
  return government;
}

/** Monthly borrowing-cost records from January 2026 for `months` months. */
function run(start: World, months: number): World {
  let world = start;
  let month = makeIsoDate("2026-01-01");
  for (let index = 0; index < months; index += 1) {
    world = {
      ...world,
      currentDate: month,
      placeOutcomes: {
        months: [
          ...(world.placeOutcomes?.months ?? []),
          { month, records: placeOutcomesForMonth(world, month, [BORROWING]) },
        ],
      },
    } as World;
    const next = new Date(`${month}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    month = makeIsoDate(next.toISOString().slice(0, 10));
  }
  return world;
}

describe("a federal law that makes Congress cut spending before the debt limit rises", () => {
  it("cuts the federal aid in a budget the month it takes effect, and a later law restores it", () => {
    const cut = act(DEBT_LIMIT_CUTS_QUESTION, "yes", makeIsoDate("2027-03-01"));
    const restore = act(
      DEBT_LIMIT_CUTS_QUESTION,
      "no",
      makeIsoDate("2029-03-01"),
    );
    const world = worldWith([cut, restore]);
    const government = publicBudgetFor(world, STATE);
    // A territory's revenue is known only in total, with no federal aid line.
    if (
      !government ||
      government.years[0]!.expectedRevenue[FEDERAL_AID]! <= 0
    ) {
      expect(
        ["US-PR", "US-GU", "US-VI", "US-AS", "US-MP"],
        `${PLACE.name} is a place whose federal aid is not recorded apart`,
      ).toContain(PLACE.jurisdictionKey);
      return;
    }
    const withLaw = settle(world, "2030-06-01");
    const without = settle(worldWith([]), "2030-06-01");
    const aid = (g: PublicBudgetGovernment, on: string) =>
      g.months.find((row) => row.month === on)!.revenue[FEDERAL_AID]!;

    // Before it takes effect: the same aid. After: aid less the cut share.
    expect(aid(withLaw, "2027-02-01")).toBe(aid(without, "2027-02-01"));
    const after = aid(withLaw, "2027-06-01");
    const usual = aid(without, "2027-06-01");
    expect(usual).toBeGreaterThan(0);
    expect(after / usual).toBeCloseTo(1 - DEBT_LIMIT_CUT_SHARE, 3);
    // Once the later law takes effect the aid is back.
    expect(aid(withLaw, "2029-06-01")).toBe(aid(without, "2029-06-01"));
  });

  it("cuts the federal aid in the budget of every place that records it", () => {
    const world = worldWith([
      act(DEBT_LIMIT_CUTS_QUESTION, "yes", makeIsoDate("2027-03-01")),
    ]);
    const plain = worldWith([]);
    let cutPlaces = 0;
    for (const place of ALL_PLACES) {
      const state = stateJurisdictionForKey(place.jurisdictionKey)!.id;
      const government = publicBudgetFor(world, state);
      if (
        !government ||
        government.years[0]!.expectedRevenue[FEDERAL_AID]! <= 0
      )
        continue;
      const aid = (w: World) =>
        settle(w, "2027-06-01", state).months.find(
          (row) => row.month === "2027-06-01",
        )!.revenue[FEDERAL_AID]!;
      expect(aid(world) / aid(plain), place.jurisdictionKey).toBeCloseTo(
        1 - DEBT_LIMIT_CUT_SHARE,
        3,
      );
      cutPlaces += 1;
    }
    // Every state and D.C. records federal aid; the territories record totals only.
    expect(cutPlaces).toBeGreaterThanOrEqual(51);
  });

  it(`lowers what ${PLACE.name} pays to borrow when the law is made, and raises it a hair when a law spends more on foreign aid (seed ${SEED})`, () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "federal-deficit-to-borrowing-cost",
    )!;
    expect(outcomeLinkStatus(link)).toBe("built");
    const base = PLACE_OUTCOME_BASES[BORROWING]!.places[PLACE.jurisdictionKey];
    if (base === undefined) {
      // The territories and Puerto Rico have no borrowing-cost base yet.
      expect(["US-PR", "US-GU", "US-VI", "US-AS", "US-MP"]).toContain(
        PLACE.jurisdictionKey,
      );
      return;
    }
    const world = run(
      worldWith([
        act(DEBT_LIMIT_CUTS_QUESTION, "yes", makeIsoDate("2027-01-01")),
        act(DEBT_LIMIT_CUTS_QUESTION, "no", makeIsoDate("2029-01-01")),
        act(INCREASE_FOREIGN_AID_QUESTION, "yes", makeIsoDate("2029-01-01")),
      ]),
      60,
    );
    const size = researchedLinkSize(world, link, STATE);
    const records = placeOutcomeRecords(world).filter(
      (record) =>
        record.measure === BORROWING &&
        record.placeKey === PLACE.jurisdictionKey,
    );
    const cause = (date: string) =>
      records
        .find((record) => record.month >= makeIsoDate(date))!
        .causes.find((entry) => entry.key === link.key);
    const deficit = (date: string) =>
      federalDeficitChangePctOfGdp(world, makeIsoDate(date));

    expect(cause("2026-12-01")).toBeUndefined();
    // The cut lowers the deficit by about half a point of GDP, and the state's
    // cost to borrow by that times the drawn basis points.
    expect(deficit("2027-02-01")).toBeLessThan(-0.4);
    expect(cause("2027-02-01")!.factor - 1).toBeCloseTo(
      size * deficit("2027-02-01"),
      10,
    );
    expect(cause("2027-02-01")!.factor).toBeLessThan(1);
    // The later law ends the cut; the aid law adds a hair to the deficit.
    const aidPct = (FOREIGN_AID_RISE_DOLLARS / 30_762_099e6) * 100;
    expect(deficit("2029-02-01")).toBeCloseTo(aidPct, 6);
    expect(cause("2029-02-01")!.factor - 1).toBeCloseTo(size * aidPct, 10);
    expect(size * aidPct).toBeGreaterThan(0);
    expect(size * aidPct).toBeLessThan(1);
  });
});
