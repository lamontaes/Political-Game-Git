import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  lawInForce,
  lawInForceAtStart,
} from "../../src/simulation/governing/law-in-force";
import { stableHash } from "../../src/simulation/ids";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import {
  researchedLinkSize,
  OUTCOME_LINKS,
  OUTCOME_WEB_CALIBRATED_AT,
  outcomeLinkStatus,
} from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeRecords,
  placeOutcomesForMonth,
} from "../../src/simulation/outcome-web/place-outcomes";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * The civil and social questions (Claude CTO, September 29, 8:00 a.m.): each
 * one a state can answer either moves something the world keeps, or says with
 * a source why its effect on everything the world keeps is about zero.
 *
 * Legal cannabis sales move a state's overdose deaths. The state is drawn from
 * every one of the 56 places that keeps an overdose rate; the law passed is
 * the opposite of the one it started with, dated by the state's own
 * effective-date rule, and a later law puts the starting one back.
 */

const SEED = "civil-social-laws";
const POLICY = createProductionPolicyCatalog();
const OVERDOSES = "health.overdose-deaths";
const CANNABIS =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";

const CIVIL_AND_SOCIAL = [
  "us-policy-positions:civil-family-community.restrict-abortion",
  "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
  CANNABIS,
  "us-policy-positions:technology-privacy.consumer-data-privacy-law",
  "us-policy-positions:technology-privacy.restrict-government-facial-recognition",
  "us-policy-positions:technology-privacy.age-verification-for-social-media",
  "us-policy-positions:civil-family-community.local-control-of-library-materials",
  "us-policy-positions:civil-family-community.fund-public-libraries",
  "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work",
  "us-policy-positions:civil-family-community.city-nondiscrimination-ordinance",
];

const questionId = (stableKey: string) =>
  POLICY.propositionOrder.find(
    (id) => POLICY.propositions[id]!.stableKey === stableKey,
  )!;

const PLACES = lifePlaceStateIdentities().filter(
  (place) => PLACE_OUTCOME_BASES[OVERDOSES]!.places[place.jurisdictionKey],
);
const PLACE =
  PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;
const STATE = stateJurisdictionForKey(PLACE.jurisdictionKey)!.id;

function act(
  n: number,
  answer: "yes" | "no",
  resolvedAt: IsoDate,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const question = questionId(CANNABIS);
  const measure: LegislativeMeasureRecord = {
    id: `measure_cannabis_${n}` as EntityId,
    stableKey: `test:cannabis:${n}`,
    sequence: n,
    jurisdictionId: STATE,
    rulePackId: "test",
    designation: `HB ${n}`,
    shortTitle:
      answer === "yes" ? "Legalize cannabis sales" : "End cannabis sales",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: addDays(resolvedAt, -60),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_cannabis_${n}` as EntityId,
    stableKey: `test:cannabis:${n}:enactment`,
    sequence: 1000 + n,
    measureId: measure.id,
    resolvedAt,
    outcome: "enacted",
    actDesignation: null,
    // No date in the act: the state's own effective-date rule dates it.
    effectiveAt: null,
    outcomeEventId: `event_cannabis_${n}` as EntityId,
  };
  return { measure, enactment };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  return {
    seed: SEED,
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
}

/** Monthly place outcomes from January 2026 for `months` months. */
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
          {
            month,
            records: placeOutcomesForMonth(world, month, [OVERDOSES]),
          },
        ],
      },
    } as World;
    const next = new Date(`${month}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    month = makeIsoDate(next.toISOString().slice(0, 10));
  }
  return world;
}

describe("civil and social laws move the world", () => {
  it(`legal cannabis sales move overdose deaths in ${PLACE.name} (seed ${SEED}) after stores open, and a repeal puts them back`, () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.from === `law:${CANNABIS}` && row.to === OVERDOSES,
    );
    expect(
      link,
      "a sized link from legal cannabis sales to overdose deaths",
    ).toBeDefined();
    expect(outcomeLinkStatus(link!)).toBe("built");

    const started =
      lawInForceAtStart(
        worldWith([]),
        STATE,
        questionId(CANNABIS),
        OUTCOME_WEB_CALIBRATED_AT,
      ) === "yes"
        ? "yes"
        : "no";
    const flipped = started === "yes" ? "no" : "yes";
    const laws = [
      act(1, flipped, makeIsoDate("2026-03-01")),
      act(2, started, makeIsoDate("2029-03-01")),
    ];
    const world = run(worldWith(laws), 84);

    const passed = lawInForce(
      world,
      STATE,
      questionId(CANNABIS),
      makeIsoDate("2028-01-01"),
    )!;
    expect(passed.answer).toBe(flipped);
    expect(passed.origin).toBe("enacted");
    const repealed = lawInForce(
      world,
      STATE,
      questionId(CANNABIS),
      makeIsoDate("2032-01-01"),
    )!;
    expect(repealed.answer).toBe(started);

    const records = placeOutcomeRecords(world).filter(
      (record) =>
        record.measure === OVERDOSES &&
        record.placeKey === PLACE.jurisdictionKey,
    );
    const lagDays = Math.round(link!.lagMonths * 30.44);
    const causeIn = (month: string) =>
      records
        .find((record) => record.month === month)!
        .causes.find((cause) => cause.key === link!.key);
    const monthAfter = (date: IsoDate) =>
      records.find((record) => record.month > date)!.month;

    // Before the stores open: nothing.
    const opens = addDays(passed.operativeAt, lagDays);
    const lastBefore = records
      .filter((record) => record.month <= addDays(opens, -31))
      .at(-1)!;
    expect(causeIn(lastBefore.month)?.factor ?? 1).toBe(1);

    // Once they have been open a month: the drawn size, in the law's direction.
    const size = researchedLinkSize(world, link!, STATE);
    const direction = flipped === "yes" ? 1 : -1;
    expect(size).toBeGreaterThanOrEqual(-0.2);
    expect(size).toBeLessThanOrEqual(0.1);
    expect(causeIn(monthAfter(opens))!.factor).toBeCloseTo(
      1 + size * direction,
      10,
    );

    // It lasts until the repeal takes effect, and not a day longer: the
    // stores close when the law that let them open is gone.
    const lastMonthOfLaw = records
      .filter((record) => record.month <= repealed.operativeAt)
      .at(-1)!.month;
    expect(causeIn(lastMonthOfLaw)!.factor).toBeCloseTo(
      1 + size * direction,
      10,
    );
    expect(causeIn(monthAfter(repealed.operativeAt))).toBeUndefined();
  });

  it("every civil and social question a state answers has a sized path into something the world keeps, or a sourced about-zero", () => {
    for (const question of CIVIL_AND_SOCIAL) {
      const rows = OUTCOME_LINKS.filter(
        (row) => row.from === `law:${question}`,
      );
      const statuses = rows.map(outcomeLinkStatus);
      expect(
        statuses.some(
          (status) => status === "built" || status === "about-zero",
        ),
        question,
      ).toBe(true);
      for (const row of rows.filter(
        (row) => outcomeLinkStatus(row) === "about-zero",
      ))
        expect(row.source.length, row.key).toBeGreaterThan(0);
    }
  });
});
