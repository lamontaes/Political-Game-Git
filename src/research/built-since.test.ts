import { describe, expect, it } from "vitest";

import {
  describeMerge,
  questionsTouched,
  renderBuiltSince,
  type MergedChange,
} from "./built-since";

const change = (overrides: Partial<MergedChange>): MergedChange => ({
  sha: "7e011a42a4917a03451c299d725a0e06e58dc5df",
  mergedAt: "2026-09-22T20:27:00Z",
  subject: "Merge pull request #404 — research queue answers",
  body: "",
  messages: "",
  files: [],
  ...overrides,
});

describe("describeMerge", () => {
  it("takes the title after the dash", () => {
    expect(describeMerge(change({}))).toEqual({
      pr: "#404",
      title: "research queue answers",
    });
  });

  it("takes the PR title from the body when the subject names only the branch", () => {
    expect(
      describeMerge(
        change({
          subject:
            "Merge pull request #419 from lamontaes/claude/hub-quit-timeout",
          body: "\nThe hub quits after a timeout\n",
        }),
      ),
    ).toEqual({ pr: "#419", title: "The hub quits after a timeout" });
  });

  it("falls back to the newest commit's subject when the body is empty", () => {
    expect(
      describeMerge(
        change({
          subject:
            "Merge pull request #419 from lamontaes/claude/hub-quit-timeout",
          lastCommitSubject: "Quit the hub after a timeout",
        }),
      ),
    ).toEqual({ pr: "#419", title: "Quit the hub after a timeout" });
  });

  it("reads the colon form", () => {
    expect(
      describeMerge(change({ subject: "Merge #295: the owner record" })),
    ).toEqual({
      pr: "#295",
      title: "the owner record",
    });
  });
});

describe("questionsTouched", () => {
  const known = [
    "what-moves-a-relationship",
    "relationship-fading-with-absence",
  ];

  it("finds a changed record and a named id, and no partial match", () => {
    expect(
      questionsTouched(
        change({
          files: [
            {
              path: "docs/research/requests/relationship-fading-with-absence.json",
              linesChanged: 4,
            },
          ],
          messages:
            "Implements what-moves-a-relationship; not what-moves-a-relationship-x",
        }),
        known,
      ),
    ).toEqual([
      "relationship-fading-with-absence",
      "what-moves-a-relationship",
    ]);
  });

  it("does not match an id that only appears as a prefix of a longer word", () => {
    expect(
      questionsTouched(
        change({ messages: "what-moves-a-relationship-graph" }),
        known,
      ),
    ).toEqual([]);
  });
});

describe("renderBuiltSince", () => {
  it("lists readable files largest first and leaves out records and generated files", () => {
    const text = renderBuiltSince(
      [
        change({
          files: [
            { path: "docs/research/OPEN-QUESTIONS.md", linesChanged: 900 },
            { path: "src/simulation/small.ts", linesChanged: 3 },
            { path: "src/simulation/big.ts", linesChanged: 300 },
            {
              path: "src/simulation/constitutional-sources.generated.ts",
              linesChanged: 500,
            },
          ],
        }),
      ],
      { sinceLabel: "today", knownQuestionIds: [] },
    );
    expect(text).toContain("### #404 — research queue answers");
    expect(text).toContain(
      "Files to read: `src/simulation/big.ts`, `src/simulation/small.ts`.",
    );
    expect(text).not.toContain("OPEN-QUESTIONS");
    expect(text).not.toContain("generated.ts");
    expect(text).toContain("Questions it bears on: none recorded.");
  });

  it("counts rather than lists when a merge carries the queue itself", () => {
    const ids = Array.from({ length: 13 }, (_, i) => `question-${i}`);
    const text = renderBuiltSince(
      [
        change({
          files: ids.map((id) => ({
            path: `docs/research/requests/${id}.json`,
            linesChanged: 1,
          })),
        }),
      ],
      { sinceLabel: "today", knownQuestionIds: ids },
    );
    expect(text).toContain("Questions it bears on: 13 research records");
    expect(text).not.toContain("`question-0`");
  });

  it("says so when nothing merged, rather than printing an empty section", () => {
    expect(
      renderBuiltSince([], { sinceLabel: "today", knownQuestionIds: [] }),
    ).toContain("Nothing has merged to main in this period.");
  });
});
