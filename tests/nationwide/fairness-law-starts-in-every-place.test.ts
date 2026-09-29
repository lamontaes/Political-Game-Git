import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../../src/simulation/dates";
import {
  lawInForce,
  lawInForceAtStart,
} from "../../src/simulation/governing/law-in-force";
import { questionAuthority } from "../../src/simulation/governing/question-authority";
import { stableHash } from "../../src/simulation/ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * What each place's fairness law already covers when a game starts. The
 * state question asks whether state law should bar discrimination on grounds
 * it does not cover yet; every one of the 56 places starts with a recorded
 * answer, and a state whose "no" preempts its localities bars a city's own
 * fairness ordinance. The watched place is drawn from all 56.
 */

const SEED = "fairness-law-starts-in-every-place";
const P = "us-policy-positions:civil-family-community.";
const POLICY = createProductionPolicyCatalog();
const id = (key: string) =>
  POLICY.propositionOrder.find(
    (entry) => POLICY.propositions[entry]!.stableKey === `${P}${key}`,
  )!;
const STATE_FAIRNESS = id("ban-discrimination-in-housing-and-work");
const CITY_FAIRNESS = id("city-nondiscrimination-ordinance");
const PLACES = lifePlaceStateIdentities();
const START = makeIsoDate("2026-01-05");

function worldWith(
  laws: readonly {
    measure: LegislativeMeasureRecord;
    enactment: LegislativeEnactmentRecord;
  }[] = [],
): World {
  return {
    currentDate: START,
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
}

function stateLaw(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  on: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const measure: LegislativeMeasureRecord = {
    id: "measure_fairness_1" as EntityId,
    stableKey: "test:fairness:1",
    sequence: 1,
    jurisdictionId,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "A fairness act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate(on),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [STATE_FAIRNESS],
    propositionAnswers: [{ propositionId: STATE_FAIRNESS, answer }],
  };
  return {
    measure,
    enactment: {
      id: "enactment_fairness_1" as EntityId,
      stableKey: "test:fairness:1:enactment",
      sequence: 1001,
      measureId: measure.id,
      resolvedAt: makeIsoDate(on),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(on),
      outcomeEventId: "event_fairness_1" as EntityId,
    },
  };
}

/** A city or town of the place, where the place has one. */
const cityIn = (jurisdictionKey: string) =>
  searchLifePlaces("", 5, {
    stateJurisdictionKey: jurisdictionKey,
    scope: "locality",
  })[0]?.context.jurisdiction.id;

describe("each place's fairness law at the start", () => {
  it("every one of the 56 places starts with a recorded answer", () => {
    const world = worldWith();
    const unanswered = PLACES.filter((place) => {
      const state = stateJurisdictionForKey(place.jurisdictionKey)!.id;
      const answer = lawInForceAtStart(world, state, STATE_FAIRNESS, START);
      return answer !== "yes" && answer !== "no";
    }).map((place) => place.name);
    expect(unanswered).toEqual([]);
  });

  it("a city's own ordinance is barred exactly where its state's no preempts", () => {
    const world = worldWith();
    const checked = { barred: 0, free: 0 };
    for (const place of PLACES) {
      const city = cityIn(place.jurisdictionKey);
      if (!city) continue;
      const state = stateJurisdictionForKey(place.jurisdictionKey)!.id;
      const law = lawInForce(world, state, STATE_FAIRNESS, START)!;
      const verdict = questionAuthority(world, city, CITY_FAIRNESS, START).may;
      // What the town could do if its state's law covered the grounds: the
      // fairness gate then bars nothing, and only the town's other powers
      // (home rule, the catalog) speak.
      const covered = questionAuthority(
        worldWith([stateLaw(state, "yes", "2025-01-01")]),
        city,
        CITY_FAIRNESS,
        START,
      ).may;
      const barred = law.answer === "no" && law.preempts === true;
      if (barred) expect(verdict, place.name).toBe("no");
      else expect(verdict, place.name).toBe(covered);
      checked[barred ? "barred" : "free"] += 1;
    }
    // Both kinds of state are in the data, so neither branch is empty.
    expect(checked.barred).toBeGreaterThan(0);
    expect(checked.free).toBeGreaterThan(0);
  });

  const place =
    PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;
  it(`${place.name} (seed ${SEED}): a state law that covers the grounds does not bar its towns from going further`, () => {
    const state = stateJurisdictionForKey(place.jurisdictionKey)!.id;
    const city = cityIn(place.jurisdictionKey);
    const start = lawInForce(worldWith(), state, STATE_FAIRNESS, START)!;
    expect(["yes", "no"]).toContain(start.answer);
    const passed = worldWith([stateLaw(state, "yes", "2026-07-01")]);
    expect(
      lawInForce(passed, state, STATE_FAIRNESS, makeIsoDate("2026-07-01"))
        ?.answer,
    ).toBe("yes");
    // The state's own law no longer bars its towns; whether a town may act
    // is left to its other powers.
    if (city)
      expect(
        questionAuthority(
          passed,
          city,
          CITY_FAIRNESS,
          makeIsoDate("2026-07-01"),
        ).reason,
      ).not.toMatch(/bars its localities from acting on this/);
  });
});
