import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGradedBatches } from "./apply-grades";
import { readMapPieces, spanGrades } from "./grade-map";
import { describe, expect, it } from "vitest";
import {
  placeSaid,
  ratingSaid,
  readBack,
  readVoiceNote,
  ruleSaid,
  type BatchMoment,
} from "./voice-note-reader";

// His batch 13 review, read aloud on Oct 15 (message 9 of the words orders):
// the lines he read and what he said about each.
const NOTES = readFileSync(
  "docs/coordination/voice-notes/2026-10-15-words-orders-part-1.md",
  "utf8",
);
const batch13 = NOTES.slice(
  NOTES.indexOf("## 9. Voice note: batch 13 review"),
  NOTES.indexOf("## 10."),
);

// Lines from batch 13 as he read them, laid out as a batch: the batch file
// itself was deleted once folded (Oct 28), so the lines are taken from his note.
const moments: BatchMoment[] = [
  {
    moment: 1,
    lines: [
      {
        id: "1.1",
        key: "press.quote-me",
        line: "I'm voting for it and you can quote me.",
      },
      {
        id: "1.2",
        key: "press.after-vote",
        line: "I'll have something to say after the vote.",
      },
      { id: "1.3", key: "press.who-source", line: "Who's your source?" },
    ],
  },
  {
    moment: 4,
    lines: [
      {
        id: "4.1",
        key: "rally.office",
        line: "Let's talk about it at the office.",
      },
      {
        id: "4.2",
        key: "rally.doors",
        line: "I'll be at the doors with you this weekend.",
      },
      { id: "4.3", key: "rally.keep-coming", line: "Keep them coming back." },
    ],
  },
  {
    moment: 7,
    lines: [
      {
        id: "7.1",
        key: "vote.friends",
        line: "You'll need friends after this vote. I won't be one.",
      },
      {
        id: "7.2",
        key: "vote.smaller",
        line: "Make it smaller and you'll have my vote.",
      },
      {
        id: "7.3",
        key: "vote.long-memory",
        line: "The party has a long memory.",
      },
    ],
  },
];

describe("a voice note becomes grades the way the owner grades", () => {
  const { grades, rules } = readVoiceNote(batch13, moments);
  const byId = new Map(grades.map((grade) => [grade.id, grade]));
  const net = (id: string) =>
    (byId.get(id)?.spans ?? []).reduce((sum, span) => sum + span.strength, 0);

  it("finds the lines he reads aloud and grades them by what he says next", () => {
    // "You'll need friends after this vote. I won't be one. I like that. I like that a lot."
    expect(net("7.1")).toBeGreaterThan(0);
    // "Let's talk about it at the office is the only one that makes sense to me there."
    expect(net("4.1")).toBeGreaterThan(0);
    // "I'll be at the doors with you this weekend. That doesn't make sense."
    expect(net("4.2")).toBeLessThan(0);
    // "Who's your source doesn't fit here, though that isn't necessarily a bad question to ask."
    // His verdict on it comes first; he says "Who's your source" again later
    // while explaining, before a line this small batch does not hold.
    expect(byId.get("1.3")?.spans[0]?.strength).toBeLessThan(0);
    // "The party has a long memory. That's a solid threat."
    expect(net("7.3")).toBeGreaterThan(0);
  });

  it("keeps his words with each grade", () => {
    expect(byId.get("7.1")?.note).toMatch(/I like that/);
  });

  it("keeps the rules he states in passing", () => {
    const said = rules.map((rule) => rule.rule).join(" ");
    expect(said).toMatch(/Don't say gaps, though/);
    expect(said).toMatch(/don't say that/i);
  });
});

describe("the ways he names a line, a rating and a rule", () => {
  it("reads line numbers said aloud", () => {
    expect(placeSaid("Okay, five point two.")).toEqual({ moment: 5, line: 2 });
    expect(placeSaid("5.2 is good")).toEqual({ moment: 5, line: 2 });
    expect(placeSaid("Now I'm on scene four, campaign stop.")).toEqual({
      moment: 4,
    });
    expect(placeSaid("Scene twelve, the second one.")).toEqual({
      moment: 12,
      line: 2,
    });
    expect(placeSaid("I'm on scene three now.")).toEqual({ moment: 3 });
  });

  it("reads a rating of one to five, where three is the right sentence in the wrong place", () => {
    expect(ratingSaid("I'm rating that one a three.")).toBe(3);
    expect(ratingSaid("That's a five.")).toBe(5);
    expect(ratingSaid("That's a lot better.")).toBeUndefined();
  });

  it("knows a line read back from a line paraphrased", () => {
    expect(readBack("Keep them coming back.", "Keep them coming back.")).toBe(
      1,
    );
    expect(
      readBack("Make it smaller and you'll have my vote.", "Make it smaller."),
    ).toBeLessThan(0.8);
  });

  it("knows a rule when he states one", () => {
    expect(ruleSaid("Don't say gaps, though.")).toBe(true);
    expect(
      ruleSaid("Just say, you know, we're going canvassing or door knocking."),
    ).toBe(true);
    expect(ruleSaid("That's good.")).toBe(false);
  });
});

describe("a note on batch 2 by number and part", () => {
  const batch2: BatchMoment[] = [
    {
      moment: 5,
      lines: [
        {
          id: "5.1",
          key: "a",
          line: "Will you help with the campaign? I'll keep the money out of it if you do.",
        },
        {
          id: "5.2",
          key: "b",
          line: "I need you with me on this. Can you take the school nights when I'm out?",
        },
        { id: "5.3", key: "c", line: "I can't do this alone." },
      ],
    },
  ];

  it("grades a line named by number, and a part he names", () => {
    const { grades } = readVoiceNote(
      "Five point two. I like the first part, kind of. The ending is weird. Moment five, the third one. That's a four.",
      batch2,
    );
    const two = grades.find((grade) => grade.id === "5.2")!;
    expect(two.spans[0]).toMatchObject({ start: 0, strength: 0.375 });
    expect(two.spans[0]!.end).toBeLessThan(30);
    expect(two.spans[1]!.strength).toBeLessThan(0);
    expect(two.spans[1]!.start).toBeGreaterThan(20);
    const three = grades.find((grade) => grade.id === "5.3")!;
    expect(three.rating).toBe(4);
    expect(three.spans[0]!.strength).toBe(0.5);
  });
});

describe("a voice note on the real batch 2 reaches the grade map", () => {
  const batch = JSON.parse(
    readFileSync("docs/coordination/batches/2026-11-09-batch-2.json", "utf8"),
  ) as { id: string; moments: BatchMoment[] };

  it("reads his note, writes a grade file the map reads and the ledger fold leaves alone", () => {
    const one = batch.moments[0]!.lines[0]!;
    const note = `Okay, moment one. ${one.line} I like that a lot. Moment two, the third one. That doesn't make sense.`;
    const { grades } = readVoiceNote(note, batch.moments);
    expect(
      grades.find((grade) => grade.id === one.id)?.spans[0]?.strength,
    ).toBe(1);
    expect(grades.find((grade) => grade.id === "2.3")?.spans[0]?.strength).toBe(
      -1,
    );
    const dir = mkdtempSync(join(tmpdir(), "voice-grades-"));
    writeFileSync(
      join(dir, "batch-2-voice.json"),
      JSON.stringify({ batch: batch.id, grades }),
    );
    expect(readGradedBatches(dir, dir)).toEqual([]);
    const read = spanGrades(readMapPieces({}), dir);
    expect(read.map((row) => row.key).sort()).toEqual(
      grades.map((grade) => grade.key).sort(),
    );
  });
});

describe("his batch 2 note of Nov 9, read as the CTO read it", () => {
  const file = readFileSync(
    "docs/coordination/voice-notes/2026-11-09-batch-2-part-1.md",
    "utf8",
  );
  const words = file.slice(
    file.indexOf("## His words (verbatim)"),
    file.indexOf("## The CTO's reading"),
  );
  const batch = JSON.parse(
    readFileSync("docs/coordination/batches/2026-11-09-batch-2.json", "utf8"),
  ) as { moments: BatchMoment[] };
  const { grades, rules } = readVoiceNote(words, batch.moments);
  const net = new Map(
    grades.map((grade) => [
      grade.id,
      grade.spans.reduce((sum, span) => sum + span.strength, 0),
    ]),
  );
  // The CTO's table: good lines and bad lines (fix, unclear and ungraded left out).
  const good = [
    "2.2",
    "3.1",
    "7.2",
    "7.3",
    "8.2",
    "8.3",
    "9.1",
    "9.2",
    "10.1",
    "10.3",
    "11.1",
    "11.2",
    "11.3",
    "12.1",
    "12.2",
    "12.3",
    "13.1",
    "13.3",
  ];
  const bad = [
    "1.2",
    "1.3",
    "2.1",
    "2.3",
    "3.2",
    "4.1",
    "4.2",
    "4.3",
    "5.1",
    "5.2",
    "6.2",
    "6.3",
    "7.1",
    "9.3",
    "10.2",
    "13.2",
  ];

  it("never grades a line the other way from his reading", () => {
    for (const id of good)
      expect(net.get(id) ?? 0, id).toBeGreaterThanOrEqual(0);
    for (const id of bad) expect(net.get(id) ?? 0, id).toBeLessThanOrEqual(0);
  });

  it("grades at least five in six of the lines he judged", () => {
    const reached = [...good, ...bad].filter((id) => (net.get(id) ?? 0) !== 0);
    expect(reached.length / (good.length + bad.length)).toBeGreaterThanOrEqual(
      5 / 6,
    );
  });

  it("keeps his own versions and the rules he stated", () => {
    expect(
      grades.find((grade) => grade.id === "4.2")?.rewrites?.join(" "),
    ).toMatch(/can we even afford this/i);
    const said = rules.map((rule) => rule.rule).join(" ");
    expect(said).toMatch(/I prefer ALRIGHT/);
    expect(said).toMatch(/shouldn't let you do it if you can't vote/);
    expect(said).toMatch(/real-life examples/);
  });
});
