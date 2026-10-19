import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import directorData from "../../src/director/data/director.json" with { type: "json" };
import {
  checkBatch,
  lineProblem,
  linesOfBatchFile,
  loadThresholds,
  MEASURES,
  measureLines,
  openerOf,
  parameterKey,
  selectPassing,
  shapeOf,
  verbOf,
  type GuardLine,
  grammatical,
  closerOf,
} from "./repetition-guard";

const KINDS = [
  "journal",
  "legislation",
  "notices",
  "minutes",
  "hearing",
  "meeting",
  "campaign",
  "interview",
  "emotion",
  "conversation",
];
const line = (kind: string, text: string, rest: Partial<GuardLine> = {}) => ({
  kind,
  text,
  parts: [],
  ...rest,
});

describe("the repetition guard's measures", () => {
  it("reads the opener, the shape and the main verb", () => {
    expect(openerOf("When I was 7, my father died.")).toBe("when i");
    expect(openerOf("NOTICE OF PUBLIC HEARING\nPROJECT NAME: X")).toBe(
      "notice of",
    );
    expect(shapeOf('This Act may be cited as the "Right to work".')).toBe(
      shapeOf('This Act may be cited as the "Paid family leave".'),
    );
    expect(shapeOf("I ran for Mayor in 2026.", ["Mayor"])).toBe(
      shapeOf("I ran for Sheriff in 2028.", ["Sheriff"]),
    );
    expect(verbOf("I went to the hearing.")).toBe("go");
    expect(verbOf("The bill passed.")).toBe("pass");
    expect(verbOf("Thank you.")).toBe("thank");
    expect(verbOf("It is what it is.")).toBe("be");
  });

  it("measures distinct shares per kind", () => {
    const same = measureLines("journal", [
      line("journal", "I ran for office."),
      line("journal", "I ran for office."),
    ]);
    expect(same).toMatchObject({ openers: 0.5, shapes: 0.5, verbs: 0.5 });
  });
});

describe("the repetition guard's thresholds", () => {
  it("has an estimated row, with a source and a spread, for every kind and measure", () => {
    const parameters = (
      directorData as unknown as {
        parameters: Record<string, Record<string, unknown>>;
      }
    ).parameters;
    for (const kind of KINDS)
      for (const measure of MEASURES) {
        const row = parameters[parameterKey(kind, measure)]!;
        expect(row.tag).toBe("ESTIMATED");
        expect(row.estimatedFrom).toBeTruthy();
        expect(row.spread).toBeTruthy();
        expect(row.value as number).toBeGreaterThan(0);
        expect(row.value as number).toBeLessThanOrEqual(1);
      }
    expect(Object.keys(loadThresholds(KINDS))).toEqual(KINDS);
  });
});

describe("the repetition guard's line rules", () => {
  it("fails a line whose event is a school, a workplace or a filing office", () => {
    expect(
      lineProblem(
        line("journal", "I went to Hanson Elementary School.", {
          parts: ["journal.school-line-started.i-went-to-school"],
        }),
      ),
    ).toBe("institution-part");
    expect(
      lineProblem(
        line("journal", "I went to Lund High School.", {
          parts: ["journal.office-line-filing.i-went-to-filing-office"],
        }),
      ),
    ).toBe("institution-part");
    expect(
      lineProblem(
        line("journal", "I went to work at Farmer's General Store.", {
          parts: ["journal.work-line-started.i-went-to-work-at-employer"],
        }),
      ),
    ).toBe("institution-part");
    expect(
      lineProblem(
        line("journal", "I attended Aline Bingham Elementary School.", {
          institutions: ["Aline Bingham Elementary School"],
        }),
      ),
    ).toBe("institution-event");
    expect(
      lineProblem(
        line("journal", "When I was 7, my father died.", {
          institutions: ["Aline Bingham Elementary School"],
        }),
      ),
    ).toBeNull();
    // Anyone's named school, in a tribute too, but not in talk.
    expect(
      lineProblem(
        line(
          "emotion",
          "Gabriel Day graduated from Nicholas S. Lacorte School No. 3. I thank Gabriel Day.",
        ),
      ),
    ).toBe("institution-event");
    expect(
      lineProblem(line("conversation", "I go to Sycamore Middle School.")),
    ).toBeNull();
    // The revision names a school only as where someone was known.
    expect(
      lineProblem(
        line(
          "journal",
          "Except for Dawn Chang. I knew Dawn Chang from Chestnut Hill Elementary School. Dawn Chang became mayor.",
          {
            institutions: ["Chestnut Hill Elementary School"],
            sourceRecordIds: ["person-1:school:fact"],
          },
        ),
      ),
    ).toBeNull();
  });

  it("fails a bill title carried as a bare command, and passes a quoted short title", () => {
    const titles = ["Shift highway funds to transit", "Paid family leave"];
    expect(
      lineProblem(
        line(
          "notices",
          "Council Resolutions and Ordinances: 2026-010, Shift highway funds to transit",
          { titles },
        ),
      ),
    ).toBe("bare-command-title");
    expect(
      lineProblem(
        line(
          "legislation",
          'This Act may be cited as the "Shift highway funds to transit".',
          { titles },
        ),
      ),
    ).toBeNull();
    expect(
      lineProblem(
        line(
          "notices",
          "Council Resolutions and Ordinances: 2026-011, Paid family leave",
          { titles },
        ),
      ),
    ).toBeNull();
  });
});

describe("the repetition guard's selection", () => {
  const thresholds = loadThresholds(["conversation"]);
  it("replaces a repeated opener with another candidate and counts what it tried", () => {
    const candidates = [
      ...Array.from({ length: 30 }, (_unused, at) =>
        line("conversation", `Well, thing number ${at} happened here.`),
      ),
      ...[
        "I know what you mean.",
        "Thanks for asking about it.",
        "You should come by sometime.",
        "Right, that makes sense now.",
        "Can we talk tomorrow instead?",
        "My sister said the same thing.",
        "Nobody told me about that.",
        "Let me think about it overnight.",
        "Then we agree on the price.",
        "Sorry, I was late again.",
        "Everyone seems tired lately, honestly.",
        "We could walk there together.",
      ].map((text) => line("conversation", text)),
    ];
    const picked = selectPassing("conversation", candidates, 12, thresholds);
    expect(picked.short).toBe(false);
    expect(picked.chosen).toHaveLength(12);
    expect(picked.rejections.some((r) => r.rule === "repeated-opener")).toBe(
      true,
    );
    expect(picked.tried).toBeGreaterThan(12);
    const result = checkBatch(picked.chosen, thresholds);
    expect(result.failures).toEqual([]);
  });

  it("fails a batch of one repeated line", () => {
    const lines = Array.from({ length: 12 }, () =>
      line("conversation", "Thank you."),
    );
    expect(checkBatch(lines, thresholds).failures.length).toBeGreaterThan(0);
  });

  const withdrawn = "data/english/batches/batch-7.json";
  it.skipIf(!existsSync(withdrawn))(
    "fails the withdrawn batch 7 on its school, job and filing-office journal lines",
    () => {
      const lines = linesOfBatchFile(withdrawn);
      const rules = checkBatch(lines, loadThresholds(KINDS)).rejections.map(
        (row) => row.rule,
      );
      expect(rules).toContain("institution-part");
    },
  );
});

describe("an alternative must be whole English", () => {
  it("refuses an empty slot, an age with no number and a doubled word", () => {
    expect(grammatical("My daughter was born years old.")).toBe(false);
    expect(grammatical("My father was  years old.")).toBe(false);
    expect(grammatical("I went to to the store.")).toBe(false);
    expect(grammatical("Hello {name}.")).toBe(false);
    expect(grammatical("My father was 84 years old.")).toBe(true);
    expect(grammatical("My mother got elected. I never knew.")).toBe(true);
    expect(grammatical("Voting against this action: Daniel McKinney.")).toBe(
      true,
    );
  });
});

describe("closers are counted as openers are", () => {
  it("reads the last two words, so the same look-back is one closer", () => {
    expect(closerOf("My mother won. I didn't know at the time.")).toBe(
      "the time",
    );
    expect(
      closerOf("My father was elected. I didn't know that at the time."),
    ).toBe("the time");
    expect(closerOf("Cynthia lost.")).toBe("cynthia lost");
  });
});

describe("a policy's catalog name is never said aloud", () => {
  it("fails it in an interview, keeps it in bill text", () => {
    const titles = ["Bottle deposit"];
    expect(
      lineProblem(
        line("interview", 'I\'m committed to "Bottle deposit".', { titles }),
      ),
    ).toBe("policy-name-said");
    expect(
      lineProblem(
        line("legislation", 'This Act may be cited as the "Bottle deposit".', {
          titles,
        }),
      ),
    ).toBeNull();
  });
});
