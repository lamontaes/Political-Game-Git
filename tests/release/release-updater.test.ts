/**
 * What the release actually does, proved against real trees.
 *
 * Each test names one of the guarantees the convention makes to the agents that
 * rely on it: that a number is never allocated twice, that a replayed event
 * changes nothing, that accepted notes are never rewritten, and that source-only
 * work neither moves the version nor invents a note.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_NOTES, declarationText, makeFixture } from "./fixtures";
import type { Fixture } from "./fixtures";
import { releaseTree } from "../../scripts/release/apply";
import { loadDeclarations } from "../../scripts/release/declarations";
import { loadLedger, consumedIds } from "../../scripts/release/ledger";
import { parseNotes } from "../../scripts/release/notes";
import { check, main } from "../../scripts/release/cli";

const REVISION = "0123456789abcdef0123456789abcdef01234567";
const DATE = "2026-09-08";

/** Notes with no candidate heading, for the cases that test a plain minor bump. */
const NOTES_WITHOUT_CANDIDATE = FIXTURE_NOTES.split("\n")
  .filter((line, index, lines) => {
    const candidateStart = lines.findIndex((entry) =>
      entry.startsWith("## PRE-ALPHA 0.3.0"),
    );
    const nextStart = lines.findIndex(
      (entry, position) =>
        position > candidateStart && entry.startsWith("## PRE-ALPHA 0.2.0"),
    );
    return index < candidateStart || index >= nextStart;
  })
  .join("\n");

function version(fixture: Fixture): string {
  return JSON.parse(readFileSync(join(fixture.root, "package.json"), "utf8"))
    .version as string;
}

function lockVersions(fixture: Fixture): string[] {
  const text = readFileSync(join(fixture.root, "package-lock.json"), "utf8");
  return [...text.matchAll(/"version": "([^"]+)"/g)].map(
    (match) => match[1] as string,
  );
}

function notes(fixture: Fixture): string {
  return readFileSync(join(fixture.root, "PATCH_NOTES.md"), "utf8");
}

const bugfix = (id: string, title: string) =>
  declarationText({
    id,
    impact: "patch",
    section: "Fixed",
    title,
    body: "The thing that used to go wrong no longer goes wrong.",
  });

const feature = (id: string, title: string) =>
  declarationText({
    id,
    impact: "minor",
    section: "Added",
    title,
    body: "Something you can now do that you could not do before.",
  });

const sourceOnly = (id: string) =>
  declarationText({
    id,
    impact: "none",
    body: "Tooling only; nothing a player sees.",
  });

describe("two independent incoming changes", () => {
  it("releases both in one batch, in deterministic order", () => {
    const fixture = makeFixture({
      notes: NOTES_WITHOUT_CANDIDATE,
      declarations: {
        "zebra-change": bugfix("zebra-change", "The second branch's fix."),
        "alpha-change": bugfix("alpha-change", "The first branch's fix."),
      },
    });
    try {
      const plan = releaseTree(fixture.root, DATE, REVISION);
      expect(plan.outcome).toBe("release");
      expect(plan.consumed.map((entry) => entry.id)).toEqual([
        "alpha-change",
        "zebra-change",
      ]);
      const text = notes(fixture);
      expect(text.indexOf("The first branch's fix.")).toBeLessThan(
        text.indexOf("The second branch's fix."),
      );
      expect(loadDeclarations(fixture.root)).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });
});

describe("version arithmetic", () => {
  it("a bugfix-only batch is a patch release", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      expect(releaseTree(fixture.root, DATE, REVISION).nextVersion).toBe(
        "0.2.1",
      );
      expect(version(fixture)).toBe("0.2.1");
    } finally {
      fixture.dispose();
    }
  });

  it("a batch containing a feature is a minor release", () => {
    const fixture = makeFixture({
      notes: NOTES_WITHOUT_CANDIDATE,
      declarations: {
        "a-fix": bugfix("a-fix", "A fix."),
        "b-feature": feature("b-feature", "A feature."),
      },
    });
    try {
      expect(releaseTree(fixture.root, DATE, REVISION).nextVersion).toBe(
        "0.3.0",
      );
    } finally {
      fixture.dispose();
    }
  });

  it("moves the lockfile's root package with it, and nothing else", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      releaseTree(fixture.root, DATE, REVISION);
      // Top level, packages[""], then a dependency that merely shared the number.
      expect(lockVersions(fixture)).toEqual(["0.2.1", "0.2.1", "0.2.0"]);
    } finally {
      fixture.dispose();
    }
  });

  it("never reaches 1.0 by addition", () => {
    const fixture = makeFixture({
      version: "0.9.0",
      notes: NOTES_WITHOUT_CANDIDATE.replace("0.2.0", "0.9.0"),
      declarations: { "b-feature": feature("b-feature", "A feature.") },
    });
    try {
      expect(releaseTree(fixture.root, DATE, REVISION).nextVersion).toBe(
        "0.10.0",
      );
    } finally {
      fixture.dispose();
    }
  });
});

describe("source-only work", () => {
  it("moves nothing and invents no note", () => {
    const fixture = makeFixture({
      declarations: { "tooling-only": sourceOnly("tooling-only") },
    });
    try {
      const before = notes(fixture);
      const plan = releaseTree(fixture.root, DATE, REVISION);
      expect(plan.outcome).toBe("no-op");
      expect(version(fixture)).toBe("0.2.0");
      expect(notes(fixture)).toBe(before);
      expect(loadDeclarations(fixture.root)).toHaveLength(1);
    } finally {
      fixture.dispose();
    }
  });

  it("is recorded, without a note, when the next player-facing release consumes it", () => {
    const fixture = makeFixture({
      declarations: {
        "tooling-only": sourceOnly("tooling-only"),
        "a-fix": bugfix("a-fix", "A fix."),
      },
    });
    try {
      releaseTree(fixture.root, DATE, REVISION);
      expect([...consumedIds(loadLedger(fixture.root))].sort()).toEqual([
        "a-fix",
        "tooling-only",
      ]);
      expect(notes(fixture)).not.toContain("Tooling only");
      expect(notes(fixture)).toContain("A fix.");
    } finally {
      fixture.dispose();
    }
  });
});

describe("candidate and unreleased sections", () => {
  it("refuses to allocate a version a candidate heading reserves", () => {
    const fixture = makeFixture({
      declarations: { "b-feature": feature("b-feature", "A feature.") },
    });
    try {
      const before = notes(fixture);
      const plan = releaseTree(fixture.root, DATE, REVISION);
      expect(plan.outcome).toBe("blocked");
      expect(plan.reason).toContain("reserved by a candidate section");
      expect(version(fixture)).toBe("0.2.0");
      expect(notes(fixture)).toBe(before);
      // Nothing is consumed, so the next attempt after the owner resolves the
      // candidate still has the change.
      expect(loadDeclarations(fixture.root)).toHaveLength(1);
    } finally {
      fixture.dispose();
    }
  });

  it("leaves hand-written UNRELEASED and candidate sections byte-identical", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      const before = parseNotes(notes(fixture));
      releaseTree(fixture.root, DATE, REVISION);
      const after = parseNotes(notes(fixture));
      for (const section of before.sections) {
        expect(after.sections.map((entry) => entry.text.trimEnd())).toContain(
          section.text.trimEnd(),
        );
      }
      expect(after.sections).toHaveLength(before.sections.length + 1);
    } finally {
      fixture.dispose();
    }
  });

  it("inserts the new release above older ones and below the candidate", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      releaseTree(fixture.root, DATE, REVISION);
      const text = notes(fixture);
      expect(text.indexOf("## PRE-ALPHA 0.3.0")).toBeLessThan(
        text.indexOf("## PRE-ALPHA 0.2.1"),
      );
      expect(text.indexOf("## PRE-ALPHA 0.2.1")).toBeLessThan(
        text.indexOf("## PRE-ALPHA 0.2.0"),
      );
      expect(text).toContain("_Released 8 September 2026._");
    } finally {
      fixture.dispose();
    }
  });
});

describe("duplicate events and races", () => {
  it("replaying the same event releases nothing a second time", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      releaseTree(fixture.root, DATE, REVISION);
      const after = notes(fixture);
      const replay = releaseTree(fixture.root, DATE, REVISION);
      expect(replay.outcome).toBe("no-op");
      expect(version(fixture)).toBe("0.2.1");
      expect(notes(fixture)).toBe(after);
      expect(loadLedger(fixture.root).entries).toHaveLength(1);
    } finally {
      fixture.dispose();
    }
  });

  it("a reused change id is refused rather than released twice", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
      ledger:
        '{"entries":[{"version":"0.2.0","releasedOn":"2026-09-01","revision":"' +
        REVISION +
        '","changeIds":["a-fix"]}]}',
    });
    try {
      const plan = releaseTree(fixture.root, DATE, REVISION);
      expect(plan.outcome).toBe("blocked");
      expect(plan.reason).toContain(
        "already appear in the traceability ledger",
      );
      expect(check(fixture.root).join("\n")).toContain("already recorded");
    } finally {
      fixture.dispose();
    }
  });

  it("a later event recovers a change an earlier one never saw", () => {
    // The first release happens; a branch that merged after it was planned
    // leaves its declaration behind. The next event picks it up and continues
    // from the version the first release actually left on the tree.
    const fixture = makeFixture({
      declarations: { "first-fix": bugfix("first-fix", "The first fix.") },
    });
    try {
      expect(releaseTree(fixture.root, DATE, REVISION).nextVersion).toBe(
        "0.2.1",
      );
      writeFileSync(
        join(fixture.root, "docs", "release", "changes", "late-fix.md"),
        bugfix("late-fix", "The fix that arrived late."),
      );
      const second = releaseTree(fixture.root, DATE, REVISION);
      expect(second.outcome).toBe("release");
      expect(second.nextVersion).toBe("0.2.2");
      expect(notes(fixture)).toContain("The first fix.");
      expect(notes(fixture)).toContain("The fix that arrived late.");
      expect([...consumedIds(loadLedger(fixture.root))].sort()).toEqual([
        "first-fix",
        "late-fix",
      ]);
    } finally {
      fixture.dispose();
    }
  });

  it("does not double-write an accepted version's section", () => {
    const fixture = makeFixture({
      version: "0.2.0",
      notes: FIXTURE_NOTES.replace(
        "## PRE-ALPHA 0.2.0",
        "## PRE-ALPHA 0.2.1\n\nAlready accepted.\n\n## PRE-ALPHA 0.2.0",
      ),
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      const plan = releaseTree(fixture.root, DATE, REVISION);
      expect(plan.outcome).toBe("blocked");
      expect(plan.reason).toContain(
        "already records an accepted 0.2.1 section",
      );
    } finally {
      fixture.dispose();
    }
  });
});

describe("nothing half-written", () => {
  it("a tree whose lockfile does not agree is left untouched", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      writeFileSync(
        join(fixture.root, "package-lock.json"),
        '{\n  "name": "our-civic-duty",\n  "version": "0.2.0"\n}\n',
      );
      const before = notes(fixture);
      expect(() => releaseTree(fixture.root, DATE, REVISION)).toThrow(
        /carry version "0\.2\.0" for the root package twice/,
      );
      expect(version(fixture)).toBe("0.2.0");
      expect(notes(fixture)).toBe(before);
      expect(loadDeclarations(fixture.root)).toHaveLength(1);
      expect(loadLedger(fixture.root).entries).toHaveLength(0);
    } finally {
      fixture.dispose();
    }
  });
});

describe("branches cut before this convention", () => {
  it("validate passes with no declarations directory at all", () => {
    const fixture = makeFixture({ withoutChangesDir: true });
    try {
      expect(existsSync(join(fixture.root, "docs", "release", "changes"))).toBe(
        false,
      );
      expect(loadDeclarations(fixture.root)).toEqual([]);
      expect(releaseTree(fixture.root, DATE, REVISION).outcome).toBe("no-op");
    } finally {
      fixture.dispose();
    }
  });
});

describe("reverts", () => {
  it("are described by a new note rather than by erasing the old one", () => {
    const fixture = makeFixture({
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      releaseTree(fixture.root, DATE, REVISION);
      writeFileSync(
        join(fixture.root, "docs", "release", "changes", "undo-a-fix.md"),
        declarationText({
          id: "undo-a-fix",
          impact: "patch",
          section: "Changed",
          title: "The earlier fix has been taken back out.",
          body: "It caused a worse problem than the one it solved.",
        }),
      );
      releaseTree(fixture.root, DATE, REVISION);
      const text = notes(fixture);
      expect(text).toContain("A fix.");
      expect(text).toContain("taken back out");
      expect(text.indexOf("taken back out")).toBeLessThan(
        text.indexOf("A fix."),
      );
    } finally {
      fixture.dispose();
    }
  });
});

describe("the command the release event actually runs", () => {
  it("dates the release from the revision, applies once, and is a no-op on replay", () => {
    const fixture = makeFixture({
      asRepository: true,
      declarations: { "a-fix": bugfix("a-fix", "A fix.") },
    });
    try {
      expect(main(["apply", "--dry-run"], fixture.root)).toBe(0);
      expect(version(fixture)).toBe("0.2.0");

      expect(main(["apply"], fixture.root)).toBe(0);
      expect(version(fixture)).toBe("0.2.1");
      // The date came from the fixture's own commit, not from today.
      expect(notes(fixture)).toContain("_Released 8 September 2026._");

      const after = notes(fixture);
      expect(main(["apply"], fixture.root)).toBe(0);
      expect(notes(fixture)).toBe(after);
      expect(version(fixture)).toBe("0.2.1");
      expect(check(fixture.root)).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  it("refuses to apply a blocked release and leaves the tree alone", () => {
    const fixture = makeFixture({
      asRepository: true,
      declarations: { "b-feature": feature("b-feature", "A feature.") },
    });
    try {
      const before = notes(fixture);
      expect(main(["apply"], fixture.root)).toBe(1);
      expect(notes(fixture)).toBe(before);
      expect(version(fixture)).toBe("0.2.0");
    } finally {
      fixture.dispose();
    }
  });

  it("writes a declaration template that its own parser accepts", () => {
    const fixture = makeFixture({ asRepository: true });
    try {
      expect(main(["declare", "a-new-change"], fixture.root)).toBe(0);
      const declarations = loadDeclarations(fixture.root);
      expect(declarations).toHaveLength(1);
      expect(declarations[0]?.id).toBe("a-new-change");
      expect(declarations[0]?.impact).toBe("none");
      expect(main(["declare", "a-new-change"], fixture.root)).toBe(1);
    } finally {
      fixture.dispose();
    }
  });
});
