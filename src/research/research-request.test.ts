import { describe, expect, it } from "vitest";

import {
  RESEARCH_REQUEST_VERSION,
  answeredRequests,
  openRequests,
  renderOpenQuestions,
  sortForReading,
  summarizeOpenQuestions,
  validateResearchRequests,
  type ResearchRequestRecord,
} from "./research-request";

/**
 * The queue's only job is that a researcher can pick up a record and work it
 * without coming back to ask the author what they meant. Every rule proved
 * here is one of those; nothing here judges whether a question is worth
 * asking.
 */

function record(
  over: Partial<ResearchRequestRecord> = {},
): ResearchRequestRecord {
  return {
    requestVersion: RESEARCH_REQUEST_VERSION,
    questionId: "county-treasurer-selection",
    title: "How a county treasurer takes office",
    question:
      "Is a county treasurer elected, appointed by the governing body, or abolished, and which instrument establishes that?",
    whyItMatters:
      "County offices are seated from the unit corpus, which records the office but not how the seat is filled, so the county layer is unreachable in play.",
    impact: "blocks-work",
    lane: "nationwide government",
    usableAnswer:
      "A row per state with the selection mechanism and the citation that establishes it.",
    sourcesChecked: [
      {
        source: "Census Government Units Survey 2025",
        whatItDidNotSettle:
          "Records that the office exists, nothing about how it is filled.",
      },
    ],
    requestedBy: "audit thread",
    filedAt: "2026-09-22T00:00:00.000Z",
    priority: "P1",
    ...over,
  };
}

function codes(records: readonly ResearchRequestRecord[]) {
  return validateResearchRequests(records).findings.map(
    (finding) => finding.code,
  );
}

describe("a complete question is accepted", () => {
  it("passes with the five things the asker knows", () => {
    const validation = validateResearchRequests([record()]);
    expect(validation.valid).toBe(true);
    expect(validation.findings).toEqual([]);
  });

  it("accepts an empty sourcesChecked, and says the researcher starts from zero", () => {
    const validation = validateResearchRequests([
      record({ sourcesChecked: [] }),
    ]);
    expect(validation.valid).toBe(true);
    expect(validation.findings.map((finding) => finding.code)).toEqual([
      "no-sources-checked",
    ]);
  });
});

describe("a record that would send the researcher back is refused", () => {
  it("refuses a missing sourcesChecked, which is not the same as an empty one", () => {
    const without: Record<string, unknown> = { ...record() };
    delete without.sourcesChecked;
    expect(codes([without as unknown as ResearchRequestRecord])).toContain(
      "missing-sources-checked",
    );
  });

  it("refuses a checked source with no statement of what it left open", () => {
    expect(
      codes([
        record({
          sourcesChecked: [
            { source: "The Kentucky constitution", whatItDidNotSettle: "  " },
          ],
        }),
      ]),
    ).toContain("source-without-gap");
  });

  it("refuses an acceptance criterion that names a topic instead of an answer", () => {
    for (const vague of [
      "Information about county treasurers",
      "details on how states do this",
      "Research about the office",
    ]) {
      expect(codes([record({ usableAnswer: vague })])).toContain(
        "vague-usable-answer",
      );
    }
  });

  it("refuses a why that only repeats the question", () => {
    const same = record();
    expect(codes([record({ whyItMatters: same.question })])).toContain(
      "why-restates-question",
    );
  });

  it("refuses an id that is a seed, a digest or one word", () => {
    expect(codes([record({ questionId: "20260922" })])).toContain(
      "seed-shaped-question-id",
    );
    expect(codes([record({ questionId: "a3f19c77b0d24e81" })])).toContain(
      "seed-shaped-question-id",
    );
    expect(codes([record({ questionId: "treasurer" })])).toContain(
      "non-semantic-question-id",
    );
  });

  it("refuses two records under one id", () => {
    expect(codes([record(), record()])).toContain("duplicate-question-id");
  });

  it("refuses an unreadable filing instant, an unknown impact and an unknown priority", () => {
    const found = codes([
      record({
        filedAt: "22 September",
        impact: "urgent" as never,
        priority: "P7" as never,
      }),
    ]);
    expect(found).toContain("invalid-filed-at");
    expect(found).toContain("unknown-impact");
    expect(found).toContain("unknown-priority");
  });

  it("refuses an answer with no sources, because that is a guess", () => {
    expect(
      codes([
        record({
          answer: {
            summary: "Most states elect them.",
            sources: [],
            answeredBy: "somebody",
            answeredAt: "2026-09-22T01:00:00.000Z",
          },
        }),
      ]),
    ).toContain("answer-without-sources");
  });

  it("warns about a related question nobody has filed", () => {
    expect(
      codes([record({ relatedQuestionIds: ["not-filed-yet"] })]),
    ).toContain("unknown-related-question");
  });
});

describe("reading the queue", () => {
  const blocking = record({
    questionId: "one-blocking",
    impact: "blocks-work",
    priority: "P1",
  });
  const urgentShaping = record({
    questionId: "two-shaping",
    impact: "shapes-design",
    priority: "P0",
  });
  const background = record({
    questionId: "three-background",
    impact: "background",
    priority: "P0",
  });
  const answered = record({
    questionId: "four-answered",
    impact: "blocks-work",
    priority: "P0",
    answer: {
      summary: "Elected in 41 states.",
      sources: ["A statute survey"],
      answeredBy: "research",
      answeredAt: "2026-09-22T02:00:00.000Z",
    },
  });
  const all = [background, answered, urgentShaping, blocking];

  it("puts what is blocking somebody first, whatever its priority", () => {
    expect(sortForReading(all).map((entry) => entry.questionId)).toEqual([
      "four-answered",
      "one-blocking",
      "two-shaping",
      "three-background",
    ]);
  });

  it("drops an answered question from the open queue but keeps it as history", () => {
    expect(openRequests(all).map((entry) => entry.questionId)).toEqual([
      "one-blocking",
      "two-shaping",
      "three-background",
    ]);
    expect(answeredRequests(all).map((entry) => entry.questionId)).toEqual([
      "four-answered",
    ]);
  });

  it("summarizes one open question per line", () => {
    expect(summarizeOpenQuestions(all)).toHaveLength(3);
    expect(summarizeOpenQuestions(all)[0]).toContain("one-blocking");
  });
});

describe("the handed-over document", () => {
  it("carries each question's why, acceptance and ruled-out sources", () => {
    const document = renderOpenQuestions(
      [record()],
      "2026-09-22T00:00:00.000Z",
    );
    expect(document).toContain("# Open research questions");
    expect(document).toContain("## Blocking work now");
    expect(document).toContain("How a county treasurer takes office");
    expect(document).toContain("**Why it matters.**");
    expect(document).toContain("**A usable answer.**");
    expect(document).toContain("Census Government Units Survey 2025");
    expect(document).toContain("1 open · 0 answered");
  });

  it("carries the commit it was rendered from, for the copy that leaves the repo", () => {
    const document = renderOpenQuestions(
      [record()],
      "2026-09-22T00:00:00.000Z",
      "a9b99fc0",
    );
    expect(document).toContain("rendered from a9b99fc0");
  });

  it("says nothing about a commit when there is none to name", () => {
    expect(
      renderOpenQuestions([record()], "2026-09-22T00:00:00.000Z"),
    ).not.toContain("rendered from");
  });

  it("says so plainly when nothing is open", () => {
    expect(renderOpenQuestions([], "2026-09-22T00:00:00.000Z")).toContain(
      "Nothing is open",
    );
  });

  it("says nothing has been checked rather than leaving a blank heading", () => {
    const document = renderOpenQuestions(
      [record({ sourcesChecked: [] })],
      "2026-09-22T00:00:00.000Z",
    );
    expect(document).toContain("**Already checked.** Nothing yet.");
  });

  it("refuses a malformed answer source instead of throwing on it", () => {
    // A source written as an object rather than a string used to crash the
    // validator on source.trim, so the filer got a stack trace instead of the
    // one sentence this queue exists to give them.
    const malformed = {
      ...record(),
      answer: {
        answeredAt: "2026-09-22T03:05:00.000Z",
        answeredBy: "somebody",
        summary: "An answer.",
        sources: [{ source: "a page", establishes: "a fact" }],
      },
    } as unknown as ResearchRequestRecord;
    expect(codes([malformed])).toContain("answer-without-sources");
  });
});

describe("candidate answers", () => {
  const two = [
    {
      label: "Treat both as genuinely unknown",
      position:
        "Neither jurisdiction is generated; both are declared unsupported until read.",
      recommended: false,
      argumentFor:
        "The endpoints were measured from states and neither is one.",
      argumentAgainst: "It leaves two startable jurisdictions unplayable.",
    },
    {
      label: "Each gets its own instrument",
      position:
        "The two are decided separately, neither inheriting the state range.",
      recommended: false,
    },
  ] as const;

  it("accepts a brief where nothing is recommended, because the choice is the reader's", () => {
    const validation = validateResearchRequests([
      record({ candidateAnswers: two }),
    ]);
    expect(validation.valid).toBe(true);
    expect(validation.findings).toEqual([]);
  });

  it("refuses two recommendations, because recommending everything recommends nothing", () => {
    expect(
      codes([
        record({
          candidateAnswers: two.map((candidate) => ({
            ...candidate,
            recommended: true,
          })),
        }),
      ]),
    ).toEqual(["several-recommended-candidates"]);
  });

  it("refuses a candidate that is a name with no position behind it", () => {
    expect(
      codes([
        record({
          candidateAnswers: [
            {
              label: "Range it nationally",
              position: "  ",
              recommended: false,
            },
          ],
        }),
      ]),
    ).toEqual(["candidate-without-position"]);
  });

  it("renders every candidate, and says plainly that none is recommended", () => {
    const rendered = renderOpenQuestions([record({ candidateAnswers: two })], {
      generatedAt: "2026-09-22T07:00:00.000Z",
      head: "05dc90a0",
    });
    expect(rendered).toContain("None is recommended");
    expect(rendered).toContain("Treat both as genuinely unknown");
    expect(rendered).toContain("Each gets its own instrument");
    expect(rendered).toContain(
      "For: The endpoints were measured from states and neither is one.",
    );
  });
});
