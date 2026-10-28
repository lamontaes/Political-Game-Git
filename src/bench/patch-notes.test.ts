import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { patchNoteReleases } from "./patch-notes";

const SAMPLE = `# Our Civic Duty — Patch Notes

Newest release first.

## UNRELEASED — Something not out yet

Text nobody plays yet.

## PRE-ALPHA 0.61.2

_Released October 28, 2026._

### Changed

- **Each new world opens with its own business climate** Each new game opens
  with its own closure rate, drawn around the published figures.
- A second point with \`code\` in it.

## PRE-ALPHA 0.61.1

_Released October 28, 2026._

### Fixed

- **Winners take office on the record.** The seat changes hands.
`;

describe("patch notes for the title", () => {
  it("reads only the released sections, newest first, with their groups", () => {
    const releases = patchNoteReleases(SAMPLE);
    expect(releases.map((r) => r.version)).toEqual(["0.61.2", "0.61.1"]);
    expect(releases[0]).toEqual({
      version: "0.61.2",
      title: "Pre-alpha 0.61.2",
      released: "Released October 28, 2026.",
      groups: [
        {
          heading: "Changed",
          lines: [
            "Each new world opens with its own business climate Each new game opens with its own closure rate, drawn around the published figures.",
            "A second point with code in it.",
          ],
        },
      ],
    });
    expect(releases[1]?.groups[0]?.lines).toEqual([
      "Winners take office on the record. The seat changes hands.",
    ]);
  });

  it("reads the repository's own notes file", () => {
    const text = readFileSync(
      new URL("../../PATCH_NOTES.md", import.meta.url),
      "utf8",
    );
    const releases = patchNoteReleases(text);
    expect(releases.length).toBeGreaterThan(10);
    for (const release of releases) {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(release.title).not.toMatch(/UNRELEASED|CANDIDATE/);
      for (const group of release.groups)
        for (const line of group.lines) {
          expect(line).not.toMatch(/\*\*/);
          expect(line).not.toMatch(/^[-*] /);
        }
    }
  });
});
