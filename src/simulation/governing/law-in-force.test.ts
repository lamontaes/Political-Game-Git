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
import { lawInForce } from "./law-in-force";

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
  const dc = stateJurisdictionForKey("US-DC")!.id;

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
      const expected = inForce(federal)
        ? federal.answer
        : inForce(own)
          ? own.answer
          : null;
      expect(
        lawInForce(world, jurisdiction!.id, propositionId(key))?.answer ?? null,
        `${key} ${place}`,
      ).toBe(expected);
    }
  });
});
