import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import ideology from "../../../docs/codex/effect-batches/claude-new-questions/ideology.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { questionPowersRow } from "../governing/question-authority";
import { stateJurisdictionForKey } from "../life-places";
import { US_POLICY_POSITIONS_PACK } from "../policy-pack-us-policy-positions";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  OUTCOME_LINKS,
  OUTCOME_WEB_CALIBRATED_AT,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
  outcomeLinksFedByQuestion,
  outcomeMeasure,
} from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";

/*
 * Seven laws the outcome web already sized, which no policy question asked
 * about, so nobody could pass them and no effect could run. Each question
 * now exists, carries its bearings and its real 2026 starting law in every
 * state, D.C. and territory, and is the cause its links read.
 */

const P = "us-policy-positions:";
const NEW = [
  "justice-public-safety.stand-your-ground",
  "justice-public-safety.child-access-prevention",
  "justice-public-safety.raise-handgun-purchase-age",
  "government-operations.same-day-voter-registration",
  "government-operations.all-mail-voting",
  "justice-public-safety.partner-with-federal-immigration-enforcement",
  "environment-energy.clean-air-plan-for-polluted-counties",
] as const;

type Row = {
  answer: "yes" | "no";
  preempts?: boolean;
  source?: string;
  note?: string;
  estimated?: string;
  operativeAt?: string;
  before?: { answer: "yes" | "no"; preempts?: boolean };
};
const QUESTIONS = (
  startingLaw as unknown as {
    questions: Record<string, { answers: Record<string, Row> }>;
  }
).questions;
const answersOf = (key: string) => QUESTIONS[`${P}${key}`]!.answers;

const PLACES = [
  ...[
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO",
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY",
    "DC AS GU MP PR VI",
  ].flatMap((line) => line.split(" ").map((usps) => `US-${usps}`)),
];

describe("the seven new questions are in the pack", () => {
  const rows = US_POLICY_POSITIONS_PACK.propositions!.filter((row) =>
    (NEW as readonly string[]).includes(row.key),
  );

  it("adds each one, once, with a question mark, an issue and a powers row", () => {
    expect(rows.map((row) => row.key).sort()).toEqual([...NEW].sort());
    for (const row of rows) {
      expect(row.question.endsWith("?"), row.key).toBe(true);
      expect(row.issue.startsWith("us-state-and-local:"), row.key).toBe(true);
      const powers = questionPowersRow(`${P}${row.key}`);
      expect(powers, row.key).toBeDefined();
      expect(powers!.levels.length, row.key).toBeGreaterThan(0);
    }
  });

  it("puts them after every earlier question, so no saved id moves", () => {
    const keys = US_POLICY_POSITIONS_PACK.propositions!.map((row) => row.key);
    expect(keys.slice(-NEW.length)).toEqual([...NEW]);
  });

  it("names 2 to 6 principles on each, never the same one twice", () => {
    for (const row of rows) {
      const named = row.principles!.map((relation) => relation.principle);
      expect(named.length, row.key).toBeGreaterThanOrEqual(2);
      expect(named.length, row.key).toBeLessThanOrEqual(6);
      expect(new Set(named).size, row.key).toBe(named.length);
      for (const relation of row.principles!) {
        expect(
          relation.weight,
          `${row.key}:${relation.principle}`,
        ).toBeGreaterThan(0);
        expect(
          relation.weight,
          `${row.key}:${relation.principle}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps every bearing's weight and gives it a reason and a source", () => {
    const catalog = createProductionPolicyCatalog();
    const sources = ideology.sources as Record<string, unknown>;
    expect(ideology.laws.map((law) => law.questionKey).sort()).toEqual(
      NEW.map((key) => `${P}${key}`).sort(),
    );
    for (const law of ideology.laws) {
      const proposition = Object.values(catalog.propositions).find(
        (row) => row.stableKey === law.questionKey,
      )!;
      expect(proposition, law.questionKey).toBeDefined();
      expect(proposition.principles, law.questionKey).toHaveLength(
        law.principles.length,
      );
      for (const bearing of law.principles) {
        const principle = Object.values(catalog.principles).find(
          (row) => row.stableKey === bearing.principleKey,
        )!;
        expect(principle, bearing.principleKey).toBeDefined();
        expect(
          proposition.principles!.find(
            (row) =>
              row.principleId === principle.id &&
              row.bearing === bearing.bearing,
          ),
          `${law.questionKey}: ${bearing.principleKey}`,
        ).toMatchObject({ weight: bearing.strength });
        expect(bearing.reason.length, bearing.principleKey).toBeGreaterThan(40);
        expect(bearing.sourceIds.length, bearing.principleKey).toBeGreaterThan(
          0,
        );
        for (const id of bearing.sourceIds)
          expect(sources[id], id).toBeDefined();
      }
    }
  });

  it("asks the 287(g) question of states, counties and cities, and each other question of states only", () => {
    expect(
      questionPowersRow(
        `${P}justice-public-safety.partner-with-federal-immigration-enforcement`,
      )!.levels,
    ).toEqual(["state", "county", "city"]);
    for (const key of NEW.filter((key) => !key.includes("partner-with")))
      expect(questionPowersRow(`${P}${key}`)!.levels, key).toEqual(["state"]);
  });
});

describe("every state, D.C. and territory has a starting law on each", () => {
  it("has a row for all 56 places on all 7 questions, each with a source or a marked estimate", () => {
    expect(PLACES).toHaveLength(56);
    for (const key of NEW) {
      const answers = answersOf(key);
      expect(Object.keys(answers).sort(), key).toEqual([...PLACES].sort());
      for (const [place, row] of Object.entries(answers)) {
        const label = `${key} ${place}`;
        expect(["yes", "no"], label).toContain(row.answer);
        expect(row.note!.length, label).toBeGreaterThan(20);
        if (row.estimated) {
          expect(row.estimated, label).toMatch(/^ESTIMATED FROM AVERAGE/);
          expect(row.note, label).toMatch(/^Tried:/);
        } else expect(row.source, label).toMatch(/^https:\/\//);
      }
    }
  });

  it("counts the places the research and the trackers name", () => {
    const yes = (key: string) =>
      Object.entries(answersOf(key))
        .filter(([, row]) => row.answer === "yes")
        .map(([place]) => place.slice(3))
        .sort();
    // Giffords Law Center: 30 states with a stand-your-ground statute.
    expect(yes("justice-public-safety.stand-your-ground")).toHaveLength(30);
    // NCSL Table 18: 8 states and D.C. mail every voter a ballot.
    expect(yes("government-operations.all-mail-voting")).toEqual(
      ["CA", "CO", "DC", "HI", "NV", "OR", "UT", "VT", "WA"].sort(),
    );
    // Four states require local agencies to hold 287(g) agreements.
    expect(
      yes("justice-public-safety.partner-with-federal-immigration-enforcement"),
    ).toEqual(["FL", "GA", "TN", "TX"]);
    // The EPA Green Book (9/30/2026) lists particulate nonattainment counties
    // in nine states.
    expect(
      yes("environment-energy.clean-air-plan-for-polluted-counties"),
    ).toEqual(["AK", "AZ", "CA", "ID", "MT", "NM", "NY", "OR", "TX"]);
    // NCSL: 21 states with same-day registration, plus D.C. and North Dakota,
    // which has no registration.
    expect(yes("government-operations.same-day-voter-registration")).toEqual([
      "CA",
      "CO",
      "CT",
      "DC",
      "HI",
      "IA",
      "ID",
      "IL",
      "MD",
      "ME",
      "MI",
      "MN",
      "NC",
      "ND",
      "NH",
      "NM",
      "NV",
      "UT",
      "VA",
      "VT",
      "WA",
      "WI",
      "WY",
    ]);
    // Giffords: handgun buying age of 21 from any seller in 19 jurisdictions,
    // and 21 in the territories read.
    expect(
      yes("justice-public-safety.raise-handgun-purchase-age").filter(
        (place) =>
          place.length === 2 && !["AS", "GU", "MP", "PR", "VI"].includes(place),
      ),
    ).toHaveLength(19);
    // Giffords: 17 states and D.C. hold an owner liable when a child can
    // reach the gun, without waiting for it to be used.
    expect(yes("justice-public-safety.child-access-prevention")).toHaveLength(
      18,
    );
  });

  it("dates a mandate that took effect after the web's base data, so it counts as a change", () => {
    const rows = answersOf(
      "justice-public-safety.partner-with-federal-immigration-enforcement",
    );
    for (const place of ["US-FL", "US-TX", "US-TN"]) {
      expect(rows[place]!.operativeAt, place).toBeDefined();
      expect(rows[place]!.operativeAt! > OUTCOME_WEB_CALIBRATED_AT, place).toBe(
        true,
      );
    }
    expect(rows["US-TN"]!.before).toEqual({ answer: "no", preempts: false });
    // A state that bars its localities says so; one that leaves them free says so.
    expect(rows["US-CA"]).toMatchObject({ answer: "no", preempts: true });
    expect(rows["US-AL"]).toMatchObject({ answer: "no", preempts: false });
  });
});

describe("the outcome web's links now read these laws", () => {
  const WIRED: ReadonlyArray<readonly [string, string, string]> = [
    ["stand-your-ground-to-homicide", NEW[0], "built"],
    ["child-access-law-to-youth-gun-deaths", NEW[1], "outcome-not-produced"],
    ["min-age-to-youth-gun-suicide", NEW[2], "outcome-not-produced"],
    ["same-day-registration-to-youth-turnout", NEW[3], "outcome-not-produced"],
    ["all-mail-voting-to-turnout", NEW[4], "built"],
    ["all-mail-voting-to-party-share", NEW[4], "about-zero"],
    ["enforcement-to-hispanic-enrollment", NEW[5], "outcome-not-produced"],
    ["enforcement-to-undocumented-employment", NEW[5], "outcome-not-produced"],
    ["enforcement-to-us-born-employment", NEW[5], "outcome-not-produced"],
    ["emission-rules-to-particulates", NEW[6], "built"],
  ];

  it("reads each question as its cause, with a reader, and says what is left to build", () => {
    for (const [key, question, status] of WIRED) {
      const link = OUTCOME_LINKS.find((row) => row.key === key)!;
      expect(link.from, key).toBe(`law:${P}${question}`);
      expect(outcomeMeasure(link.from), key).not.toBeNull();
      expect(outcomeLinkStatus(link), key).toBe(status);
      expect(link.status, key).toBe(status);
      expect(link.unsupportedReason, key).toBe(
        status === "outcome-not-produced" ? status : null,
      );
      expect(outcomeLinksFedByQuestion(`${P}${question}`), key).toContain(link);
      // A link still waiting says which outcome nothing computes yet.
      if (status === "outcome-not-produced")
        expect(OUTCOMES_PRODUCED.has(link.to), key).toBe(false);
    }
  });

  it("leaves the reclassification link alone, because no question could carry it", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "release-lower-level-to-larceny",
    )!;
    expect(link.from).toBe("law.low-level-offense-reclassified");
    expect(outcomeLinkStatus(link)).toBe("cause-not-recorded");
  });
});

describe("a change from the starting law moves the outcome in every place, after the link's lag", () => {
  function law(
    jurisdictionId: EntityId,
    questionId: EntityId,
    answer: "yes" | "no",
  ): {
    measure: LegislativeMeasureRecord;
    enactment: LegislativeEnactmentRecord;
  } {
    const id = `measure_new_${jurisdictionId}` as EntityId;
    return {
      measure: {
        id,
        stableKey: `test:new:${jurisdictionId}`,
        sequence: 1,
        jurisdictionId,
        rulePackId: "test",
        designation: "Act 1",
        shortTitle: "Test Act",
        summary: "A test law.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: makeIsoDate("2026-01-10"),
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [questionId],
        propositionAnswers: [{ propositionId: questionId, answer }],
      },
      enactment: {
        id: `enactment_new_${jurisdictionId}` as EntityId,
        stableKey: `test:new:${jurisdictionId}:enactment`,
        sequence: 1001,
        measureId: id,
        resolvedAt: makeIsoDate("2026-02-16"),
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: makeIsoDate("2026-03-01"),
        outcomeEventId: `event_new_${jurisdictionId}` as EntityId,
      },
    };
  }

  const cases: ReadonlyArray<{
    readonly link: string;
    readonly question: string;
    readonly measure: string;
    readonly adopt: number;
    readonly repeal: number;
  }> = [
    {
      // Adoption raises firearm homicide 8%; the research establishes
      // nothing for repeal, so a repeal moves nothing.
      link: "stand-your-ground-to-homicide",
      question: NEW[0],
      measure: "crime.firearm-homicide",
      adopt: 1.08,
      repeal: 1,
    },
    {
      link: "all-mail-voting-to-turnout",
      question: NEW[4],
      measure: "voting.turnout-pct",
      adopt: 1.035,
      repeal: 0.965,
    },
    {
      link: "emission-rules-to-particulates",
      question: NEW[6],
      measure: "env.particulates",
      adopt: 0.977,
      repeal: 1.023,
    },
  ];

  for (const row of cases)
    it(`${row.link}: adopting moves ${row.measure} by its size and a repeal by ${row.repeal}`, () => {
      const link = OUTCOME_LINKS.find((entry) => entry.key === row.link)!;
      const questionId = "proposition_new" as EntityId;
      const key = `${P}${row.question}`;
      const places = Object.keys(PLACE_OUTCOME_BASES[row.measure]!.places);
      expect(places.length).toBe(51);
      const answers = answersOf(row.question);
      const afterLag = makeIsoDate(
        `${2027 + Math.ceil(link.lagMonths / 12)}-04-15`,
      );
      let adopters = 0;
      let repealers = 0;
      for (const place of places) {
        const startsAs = answers[place]!.answer;
        const id = stateJurisdictionForKey(place)!.id;
        const world = {
          currentDate: makeIsoDate("2026-01-05"),
          policyCatalog: {
            propositions: { [questionId]: { id: questionId, stableKey: key } },
          },
          history: {
            legislativeMeasures: [
              law(id, questionId, startsAs === "no" ? "yes" : "no").measure,
            ],
            legislativeEnactments: [
              law(id, questionId, startsAs === "no" ? "yes" : "no").enactment,
            ],
          },
        } as unknown as World;
        const factor = outcomeFactor(
          world,
          id,
          row.measure,
          afterLag,
        ).causes.find((cause) => cause.key === row.link)?.factor;
        const before = outcomeFactor(
          world,
          id,
          row.measure,
          makeIsoDate("2026-02-15"),
        ).causes.find((cause) => cause.key === row.link)?.factor;
        // Before the law, and before the lag has run, the place is as it began.
        expect(before ?? 1, place).toBe(1);
        expect(factor, place).toBeCloseTo(
          startsAs === "no" ? row.adopt : row.repeal,
          10,
        );
        if (startsAs === "no") adopters += 1;
        else repealers += 1;
      }
      // Every place of the measure is a place that adopts or one that repeals.
      expect(adopters).toBeGreaterThan(0);
      expect(repealers).toBeGreaterThan(0);
      expect(adopters + repealers).toBe(51);
    });
});
