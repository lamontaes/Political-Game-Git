import { stateMinimumSettingAt } from "../minimum-wage";
import { constitutionalPolicyProvisions } from "../policy-provisions";
import { constitutionalPosition } from "../constitutional-process";
import { enactedRuleChangeAt, ruleValueInWorld } from "../enacted-rule-changes";
import { recordedSessionAdjournment } from "./session-adjournments";
import { describe, expect, it } from "vitest";

import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawInForce, statuteAnswer, judicialRulingKey } from "./law-in-force";

/**
 * The reader alone, over hand-written records: which enacted law governs a
 * question in a place. The measure and enactment records are complete typed
 * objects; only the World around them is partial, because the reader reads
 * nothing but the date and those two histories.
 */

const QUESTION = "proposition_question" as EntityId;
const OTHER = "proposition_other" as EntityId;
const ohio = stateJurisdictionForKey("US-OH")!.id;
const texas = stateJurisdictionForKey("US-TX")!.id;
const kansas = stateJurisdictionForKey("US-KS")!.id;
const illinois = stateJurisdictionForKey("US-IL")!.id;
const federal = NATIONAL_ELECTION_JURISDICTION.id;

let sequence = 0;
function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  resolvedAt: string,
  effectiveAt: string | null = null,
  propositionId: EntityId = QUESTION,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `HB ${sequence}`,
      shortTitle: "A test act",
      summary: "A test act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
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
      resolvedAt: makeIsoDate(resolvedAt),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: effectiveAt ? makeIsoDate(effectiveAt) : null,
      outcomeEventId: `event_${sequence}` as EntityId,
    },
  };
}

function worldWith(
  currentDate: string,
  laws: readonly ReturnType<typeof law>[],
): World {
  return {
    currentDate: makeIsoDate(currentDate),
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

describe("the law in force on a question", () => {
  it("is unknown where no law has answered it", () => {
    expect(lawInForce(worldWith("2027-01-01", []), ohio, QUESTION)).toBeNull();
    const other = law(ohio, "yes", "2026-02-01", null, OTHER);
    expect(
      lawInForce(worldWith("2027-01-01", [other]), ohio, QUESTION),
    ).toBeNull();
  });

  it("waits for the act's effective date, else its state's rule, else the blanket ninety days", () => {
    const dated = law(ohio, "yes", "2026-03-01", "2026-07-01");
    expect(
      lawInForce(worldWith("2026-06-30", [dated]), ohio, QUESTION),
    ).toBeNull();
    expect(
      lawInForce(worldWith("2026-07-01", [dated]), ohio, QUESTION),
    ).toMatchObject({ answer: "yes", operativeBasis: "enacted-date" });
    // Ohio's own rule: ninety days after the act.
    const undated = law(ohio, "no", "2026-03-01");
    expect(
      lawInForce(worldWith("2026-05-29", [undated]), ohio, QUESTION),
    ).toBeNull();
    expect(
      lawInForce(worldWith("2026-05-30", [undated]), ohio, QUESTION),
    ).toMatchObject({ answer: "no", operativeBasis: "state-rule" });
    // Illinois counts from final passage, which this record does not carry:
    // the blanket ninety days, said so.
    const illinoisan = law(illinois, "no", "2026-03-01");
    expect(
      lawInForce(worldWith("2026-05-29", [illinoisan]), illinois, QUESTION),
    ).toBeNull();
    expect(
      lawInForce(worldWith("2026-05-30", [illinoisan]), illinois, QUESTION),
    ).toMatchObject({ answer: "no", operativeBasis: "game-default" });
  });

  it("says when the state's rule is an estimate, not its own", () => {
    // Kansas dates acts from publication, which is not dated; it takes the
    // most common rule read, 91 days after the session's end (the 2026
    // session adjourned April 10).
    const kansan = law(kansas, "yes", "2026-03-01");
    expect(
      lawInForce(worldWith("2026-07-09", [kansan]), kansas, QUESTION),
    ).toBeNull();
    expect(
      lawInForce(worldWith("2026-07-10", [kansan]), kansas, QUESTION),
    ).toMatchObject({ answer: "yes", operativeBasis: "estimated-state-rule" });
  });

  it("lets the later law govern within a level", () => {
    const first = law(ohio, "yes", "2026-02-01");
    const repeal = law(ohio, "no", "2026-09-01");
    expect(
      lawInForce(worldWith("2027-06-01", [repeal, first]), ohio, QUESTION)
        ?.measureId,
    ).toBe(repeal.measure.id);
  });

  it("reaches only the state that enacted it", () => {
    const ohioLaw = law(ohio, "yes", "2026-02-01");
    expect(
      lawInForce(worldWith("2027-01-01", [ohioLaw]), texas, QUESTION),
    ).toBeNull();
  });

  it("puts an Act of Congress over a later state law, everywhere", () => {
    const act = law(federal, "no", "2026-02-01");
    const state = law(ohio, "yes", "2026-10-01");
    const world = worldWith("2027-06-01", [act, state]);
    expect(lawInForce(world, ohio, QUESTION)).toMatchObject({
      answer: "no",
      level: "federal-statute",
    });
    expect(lawInForce(world, texas, QUESTION)?.measureId).toBe(act.measure.id);
  });
});

describe("the law a place already had when the game began", () => {
  const MEDICAID = "proposition_medicaid" as EntityId;
  const WORK = "proposition_work" as EntityId;
  const UNCOVERED = "proposition_uncovered" as EntityId;
  const LEAVE = "proposition_leave" as EntityId;
  const dc = stateJurisdictionForKey("US-DC")!.id;
  const maryland = stateJurisdictionForKey("US-MD")!.id;

  function worldAt(
    currentDate: string,
    laws: readonly ReturnType<typeof law>[],
  ): World {
    return {
      currentDate: makeIsoDate(currentDate),
      policyCatalog: {
        propositions: {
          [MEDICAID]: {
            id: MEDICAID,
            stableKey:
              "us-policy-positions:health-human-services.expand-medicaid-eligibility",
          },
          [WORK]: {
            id: WORK,
            stableKey:
              "us-policy-positions:health-human-services.work-requirement-for-assistance",
          },
          [LEAVE]: {
            id: LEAVE,
            stableKey: "us-policy-positions:labor-workforce.paid-family-leave",
          },
          [UNCOVERED]: { id: UNCOVERED, stableKey: "us-policy-positions:none" },
        },
      },
      history: {
        legislativeMeasures: laws.map((entry) => entry.measure),
        legislativeEnactments: laws.map((entry) => entry.enactment),
      },
    } as unknown as World;
  }

  it("reads each state's researched answer: Texas has not expanded Medicaid, Ohio and D.C. have", () => {
    const world = worldAt("2027-01-01", []);
    expect(lawInForce(world, texas, MEDICAID)).toMatchObject({
      answer: "no",
      level: "state-statute",
      origin: "in-force-at-start",
    });
    expect(lawInForce(world, ohio, MEDICAID)?.answer).toBe("yes");
    expect(lawInForce(world, dc, MEDICAID)?.answer).toBe("yes");
  });

  it("a law enacted in play governs once it takes effect", () => {
    const expansion = law(texas, "yes", "2027-05-01", "2027-09-01", MEDICAID);
    expect(
      lawInForce(worldAt("2027-08-31", [expansion]), texas, MEDICAID)?.answer,
    ).toBe("no");
    expect(
      lawInForce(worldAt("2027-09-01", [expansion]), texas, MEDICAID),
    ).toMatchObject({ answer: "yes", origin: "enacted" });
  });

  it("the federal work requirement outranks a state law saying no, from its operative date", () => {
    const stateNo = law(ohio, "no", "2025-01-01", "2025-02-01", WORK);
    expect(
      lawInForce(worldAt("2025-10-31", [stateNo]), ohio, WORK)?.answer,
    ).toBe("no");
    expect(
      lawInForce(worldAt("2025-11-01", [stateNo]), ohio, WORK),
    ).toMatchObject({ answer: "yes", level: "federal-statute" });
  });

  it("a repeal enacted in play governs a starting law that takes effect later", () => {
    // Maryland's paid family leave, already law when the game begins, takes
    // effect January 1, 2028. A repeal in force from June 1, 2026 leaves
    // nothing of it to take effect.
    expect(lawInForce(worldAt("2028-02-01", []), maryland, LEAVE)?.answer).toBe(
      "yes",
    );
    const repeal = law(maryland, "no", "2026-03-01", "2026-06-01", LEAVE);
    expect(
      lawInForce(worldAt("2028-02-01", [repeal]), maryland, LEAVE),
    ).toMatchObject({ answer: "no", origin: "enacted" });
  });

  it("a question the file does not cover stays unknown", () => {
    expect(lawInForce(worldAt("2027-01-01", []), texas, UNCOVERED)).toBeNull();
  });
});

describe("every place reads its starting law on every researched question", () => {
  const file = startingLaw as unknown as {
    readonly defaultOperativeAt: string;
    readonly questions: Readonly<
      Record<
        string,
        {
          readonly source?: string;
          readonly answers: Readonly<
            Record<
              string,
              {
                readonly answer: string;
                readonly operativeAt?: string;
                readonly source?: string;
                readonly preempts?: unknown;
                readonly estimated?: string;
                readonly before?: { readonly answer: string };
              }
            >
          >;
        }
      >
    >;
  };
  const questionKeys = Object.keys(file.questions);
  const propositionId = (key: string) => `proposition:${key}` as EntityId;
  const places = Object.keys(STATES).map((usps) => `US-${usps}`);
  const onDate = "2026-01-01";

  const world = {
    currentDate: makeIsoDate(onDate),
    policyCatalog: {
      propositions: Object.fromEntries(
        questionKeys.map((key) => [
          propositionId(key),
          { id: propositionId(key), stableKey: key },
        ]),
      ),
    },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
  } as unknown as World;

  function inForce(
    row: { readonly operativeAt?: string } | undefined,
  ): row is { readonly answer: string; readonly operativeAt?: string } {
    return (
      row !== undefined &&
      (row.operativeAt ?? file.defaultOperativeAt) <= onDate
    );
  }

  /** A row's answer on the start date: its own, else what held before. */
  function answerAtStart(
    row:
      | {
          readonly answer: string;
          readonly operativeAt?: string;
          readonly before?: { readonly answer: string };
        }
      | undefined,
  ): string | null {
    if (row === undefined) return null;
    const before = row.before?.answer ?? null;
    return inForce(row) ? row.answer : before;
  }

  it("names only real places, answers only yes or no, and sources every row; preempts is true or false", () => {
    const known = new Set(["US", ...places]);
    for (const key of questionKeys) {
      const question = file.questions[key]!;
      for (const [place, row] of Object.entries(question.answers)) {
        expect(known.has(place), `${key} ${place}`).toBe(true);
        expect(["yes", "no"], `${key} ${place}`).toContain(row.answer);
        if (row.operativeAt)
          expect(row.operativeAt, `${key} ${place}`).toMatch(
            /^\d{4}-\d{2}-\d{2}$/,
          );
        expect(row.source ?? question.source, `${key} ${place}`).toBeTruthy();
        if (row.preempts !== undefined)
          expect(typeof row.preempts, `${key} ${place}`).toBe("boolean");
        if (row.estimated !== undefined)
          expect(row.estimated, `${key} ${place}`).toMatch(
            /^ESTIMATED FROM AVERAGE: /,
          );
        if (row.before) {
          expect(["yes", "no"], `${key} ${place}`).toContain(row.before.answer);
          expect(row.operativeAt, `${key} ${place}`).toBeTruthy();
        }
      }
    }
  });

  it.each(questionKeys)("%s, in every state, D.C. and territory", (key) => {
    const answers = file.questions[key]!.answers;
    const federal = answers.US;
    for (const place of places) {
      const jurisdiction = stateJurisdictionForKey(place);
      expect(jurisdiction, place).toBeTruthy();
      const own = answers[place];
      const expected = inForce(federal) ? federal.answer : answerAtStart(own);
      // No place starts the game with the law unknown.
      expect(expected, `${key} ${place}`).not.toBeNull();
      expect(
        lawInForce(world, jurisdiction!.id, propositionId(key))?.answer ?? null,
        `${key} ${place}`,
      ).toBe(expected);
    }
  });
});

describe("a starting answer a state's own constitution writes", () => {
  const GRADUATED = "proposition_graduated" as EntityId;
  const KEY = "us-policy-positions:fiscal.graduated-income-tax";
  const rows = (
    startingLaw as unknown as {
      readonly questions: Readonly<
        Record<
          string,
          {
            readonly answers: Readonly<
              Record<string, { answer: string; constitution?: unknown }>
            >;
          }
        >
      >;
    }
  ).questions[KEY]!.answers;
  const constitutional = Object.entries(rows).filter(
    ([, row]) => row.constitution,
  );

  function worldAt(
    currentDate: string,
    laws: readonly ReturnType<typeof law>[],
  ): World {
    return {
      currentDate: makeIsoDate(currentDate),
      policyCatalog: {
        propositions: { [GRADUATED]: { id: GRADUATED, stableKey: KEY } },
      },
      history: {
        legislativeMeasures: laws.map((entry) => entry.measure),
        legislativeEnactments: laws.map((entry) => entry.enactment),
      },
    } as unknown as World;
  }

  it("ranks as the constitution, and closes the question to a statute", () => {
    expect(constitutional.length).toBeGreaterThan(0);
    for (const [place, row] of constitutional) {
      const state = stateJurisdictionForKey(place)!.id;
      const law = lawInForce(worldAt("2027-01-01", []), state, GRADUATED);
      expect(law, place).toMatchObject({
        answer: row.answer,
        level: "state-constitution",
      });
      expect(statuteAnswer(law), place).toBe("closed");
    }
  });

  it("governs over a statute enacted against it, for every reader", () => {
    for (const [place, row] of constitutional) {
      const state = stateJurisdictionForKey(place)!.id;
      const against = law(
        state,
        row.answer === "yes" ? "no" : "yes",
        "2027-01-15",
        "2027-02-01",
        GRADUATED,
      );
      const world = worldAt("2027-06-01", [against]);
      expect(lawInForce(world, state, GRADUATED)?.answer, place).toBe(
        row.answer,
      );
      // A reader of enacted law finds nothing that governs.
      expect(
        lawInForce(world, state, GRADUATED, world.currentDate, "enacted-only"),
        place,
      ).toBeNull();
    }
  });

  it("leaves a state whose constitution is silent to its statutes", () => {
    const silent = Object.entries(rows).find(
      ([place, row]) =>
        !row.constitution && place !== "US" && stateJurisdictionForKey(place),
    )!;
    const state = stateJurisdictionForKey(silent[0])!.id;
    const change = law(
      state,
      silent[1].answer === "yes" ? "no" : "yes",
      "2027-01-15",
      "2027-02-01",
      GRADUATED,
    );
    expect(
      lawInForce(worldAt("2027-06-01", [change]), state, GRADUATED),
    ).toMatchObject({ origin: "enacted", level: "state-statute" });
  });
});

describe("earned legal history cutoff", () => {
  it("keeps later same-day enactments out in all 56 jurisdictions", () => {
    const keys = Object.keys(STATES).map((usps) => `US-${usps}`);
    expect(new Set(keys).size).toBe(56);
    for (const key of keys) {
      const place = stateJurisdictionForKey(key);
      expect(place, key).not.toBeNull();
      const prior = law(place!.id, "yes", "2026-01-02", "2026-01-02");
      const later = law(place!.id, "no", "2026-06-01", "2026-06-01");
      const world = worldWith("2026-06-01", [prior, later]);
      const cutoff = {
        asOfDate: world.currentDate,
        historySequenceExclusive: later.enactment.sequence,
      };
      expect(
        lawInForce(world, place!.id, QUESTION, world.currentDate, "all", cutoff)
          ?.measureId,
        key,
      ).toBe(prior.measure.id);
      expect(lawInForce(world, place!.id, QUESTION)?.measureId, key).toBe(
        later.measure.id,
      );
      expect(
        lawInForce(world, place!.id, QUESTION, world.currentDate, "all", {
          ...cutoff,
          historySequenceExclusive: later.enactment.sequence + 1,
        })?.measureId,
        key,
      ).toBe(later.measure.id);
    }
  });
  it("applies an available law on its operative day without inventing a time", () => {
    const entry = law(ohio, "yes", "2026-01-02", "2026-06-01");
    const world = worldWith("2026-06-01", [entry]);
    const cutoff = {
      asOfDate: world.currentDate,
      historySequenceExclusive: entry.enactment.sequence + 1,
    };
    expect(
      lawInForce(world, ohio, QUESTION, world.currentDate, "all", cutoff)
        ?.measureId,
    ).toBe(entry.measure.id);
    expect(
      lawInForce(
        world,
        ohio,
        QUESTION,
        makeIsoDate("2026-05-31"),
        "all",
        cutoff,
      ),
    ).toBeNull();
  });
  it("does not use a later court ruling to change the earned law", () => {
    const entry = law(ohio, "yes", "2026-01-02", "2026-01-02");
    const base = worldWith("2026-06-01", [entry]);
    const ruling = {
      id: "ruling" as EntityId,
      stableKey: judicialRulingKey(entry.enactment.id, QUESTION),
      sequence: entry.enactment.sequence + 10,
      occurredAt: base.currentDate,
      tags: ["outcome:struck"],
    };
    // A controlled reader fixture, not a claim of natural litigation.
    const world = {
      ...base,
      history: { ...base.history, events: [ruling] },
    } as unknown as World;
    expect(lawInForce(world, ohio, QUESTION)).toBeNull();
    expect(
      lawInForce(world, ohio, QUESTION, world.currentDate, "all", {
        asOfDate: world.currentDate,
        historySequenceExclusive: ruling.sequence,
      })?.measureId,
    ).toBe(entry.measure.id);
  });
});

it("hides later constitutional activation while preserving the current reader", () => {
  const measure = {
    id: "cutoff-amendment" as EntityId,
    sequence: 1,
    introducedAt: makeIsoDate("2026-01-01"),
    jurisdictionKey: "US-CA",
    processKind: "state-amendment",
    proposedBy: "legislature",
    ruleDelta: {
      kind: "policy-provision",
      propositionId: QUESTION,
      stance: "adopt",
    },
    designation: "Test amendment",
    delayedOperativeAt: null,
    deadlineAt: null,
  };
  const action = {
    id: "cutoff-ratification" as EntityId,
    measureId: measure.id,
    sequence: 10,
    occurredAt: makeIsoDate("2026-06-01"),
    detail: {
      kind: "statewide-vote",
      yes: 2,
      no: 1,
      statementFiledAt: makeIsoDate("2026-06-01"),
    },
  };
  // Explicit reader records; the vote counts are fixture controls.
  const world = {
    currentDate: makeIsoDate("2026-06-10"),
    history: {
      constitutionalMeasures: [measure],
      constitutionalActions: [action],
    },
  } as unknown as World;
  const cutoff = { asOfDate: world.currentDate, historySequenceExclusive: 10 };
  expect(constitutionalPosition(world, measure.id).operativeAt).not.toBeNull();
  expect(
    constitutionalPosition(world, measure.id, world.currentDate, cutoff)
      .operativeAt,
  ).toBeNull();
  expect(
    constitutionalPolicyProvisions(world, "CA", world.currentDate, cutoff),
  ).toEqual([]);
  expect(constitutionalPolicyProvisions(world, "CA")).toHaveLength(1);
});

it("hides a later saved hourly rule provision and its enactment", () => {
  const entry = law(ohio, "yes", "2026-06-01", "2026-06-01");
  const base = worldWith("2026-06-01", [entry]);
  const provision = {
    id: "cutoff-hourly-clause" as EntityId,
    sequence: entry.enactment.sequence - 1,
    measureId: entry.measure.id,
    stateUsps: "OH",
    officeKey: "us-oh-labor-law",
    field: "labor.minimumWage.hourlyCents" as const,
    value: 1800,
    filedAt: makeIsoDate("2026-01-01"),
  };
  const world = {
    ...base,
    history: { ...base.history, ruleChangeProvisions: [provision] },
  } as unknown as World;
  const query = {
    stateUsps: "OH",
    officeKey: "us-oh-labor-law",
    field: provision.field,
    onDate: world.currentDate,
  };
  expect(enactedRuleChangeAt(world, query)?.value).toBe(1800);
  const wageWorld = { ...world, policyCatalog: { propositions: {} } } as World;
  expect(
    stateMinimumSettingAt(wageWorld, "US-OH", world.currentDate)?.hourlyMinor,
  ).toBe(1800);
  expect(
    stateMinimumSettingAt(wageWorld, "US-OH", world.currentDate, {
      asOfDate: world.currentDate,
      historySequenceExclusive: entry.enactment.sequence,
    }),
  ).toBeNull();

  expect(
    ruleValueInWorld(
      world,
      {
        jurisdiction: "OH",
        officeKey: query.officeKey,
        field: query.field,
        onDate: query.onDate,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: entry.enactment.sequence,
        },
      },
      null,
    ),
  ).toEqual({ source: "compiled", value: null });

  expect(
    enactedRuleChangeAt(world, {
      ...query,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: entry.enactment.sequence,
      },
    }),
  ).toBeNull();
});

it("does not derive an earlier effective date from a later recorded adjournment", () => {
  const world = {
    history: {
      sessionAdjournments: [
        {
          sequence: 9,
          rulePackId: "test",
          sessionYear: 2026,
          adjournedOn: makeIsoDate("2026-05-01"),
        },
      ],
    },
  } as unknown as World;
  expect(recordedSessionAdjournment(world, "test", 2026)?.adjournedOn).toBe(
    "2026-05-01",
  );
  expect(
    recordedSessionAdjournment(world, "test", 2026, {
      asOfDate: makeIsoDate("2026-05-01"),
      historySequenceExclusive: 9,
    }),
  ).toBeNull();
});
