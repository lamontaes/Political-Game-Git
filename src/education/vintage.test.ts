import { describe, expect, it } from "vitest";

import { institutionDateReason } from "./catalog";
import { expandInstitution } from "./compact";
import type { CompactInstitution, EducationDictionary } from "./compact";
import type { EducationInstitution } from "./types";
import {
  ACADEMIC_YEARS,
  academicYearCovers,
  academicYearWindow,
  preferredAcademicYear,
  releaseLabel,
} from "./vintage";

/**
 * The directory vintage is data, not two literals spelled out in three files.
 *
 * These are the acceptance proofs for that: the coverage window and the
 * preferred vintage are computed from whatever labels the shipped catalog
 * carries, a vintage nobody has release wording for is refused rather than
 * described with another vintage's words, and the two vintages that ship
 * today keep exactly the dates and wording they had.
 */

describe("academic-year windows are arithmetic, not a table", () => {
  it("spans July through June for any label", () => {
    expect(academicYearWindow("2024-25")).toEqual({
      start: "2024-07-01",
      endInclusive: "2025-06-30",
    });
    expect(academicYearWindow("2025-26")).toEqual({
      start: "2025-07-01",
      endInclusive: "2026-06-30",
    });
    expect(academicYearWindow("2031-32")).toEqual({
      start: "2031-07-01",
      endInclusive: "2032-06-30",
    });
    expect(academicYearWindow("2099-00")).toEqual({
      start: "2099-07-01",
      endInclusive: "2100-06-30",
    });
  });

  it("refuses a label that is not one academic year", () => {
    expect(() => academicYearWindow("2025")).toThrow(/academic-year label/i);
    expect(() => academicYearWindow("2025-27")).toThrow(/span one year/i);
  });

  it("answers coverage on the window's edges", () => {
    expect(academicYearCovers("2025-26", "2025-06-30")).toBe(false);
    expect(academicYearCovers("2025-26", "2025-07-01")).toBe(true);
    expect(academicYearCovers("2025-26", "2026-06-30")).toBe(true);
    expect(academicYearCovers("2025-26", "2026-07-01")).toBe(false);
  });
});

describe("the preferred vintage follows the data, not a hardcoded rollover", () => {
  const shipped = ["2024-25", "2025-26"];

  it("keeps the behavior the hardcoded rollover had", () => {
    expect(preferredAcademicYear(shipped, "2025-06-30")).toBe("2024-25");
    expect(preferredAcademicYear(shipped, "2025-07-01")).toBe("2025-26");
  });

  it("picks a later vintage the moment one is shipped", () => {
    const withNext = [...shipped, "2026-27"];
    expect(preferredAcademicYear(withNext, "2026-06-30")).toBe("2025-26");
    expect(preferredAcademicYear(withNext, "2026-07-01")).toBe("2026-27");
  });

  it("does not run off the end of a save played far in the future", () => {
    expect(preferredAcademicYear(shipped, "2044-01-01")).toBe("2025-26");
  });

  it("falls back to the oldest vintage before any of them began", () => {
    expect(preferredAcademicYear(shipped, "1998-01-01")).toBe("2024-25");
    expect(preferredAcademicYear([], "2025-07-01")).toBeNull();
  });
});

describe("release wording stays per-vintage and refuses to be guessed", () => {
  it("keeps the wording each shipped directory had", () => {
    expect(releaseLabel("2024-25", "postsecondary")).toBe(
      "HD2024; IC2024 revised September 2026",
    );
    expect(releaseLabel("2024-25", "school")).toBe("CCD preliminary v0a");
    expect(releaseLabel("2024-25", "district")).toBe("CCD preliminary v0a");
    expect(releaseLabel("2025-26", "postsecondary")).toBe(
      "HD2025/IC2025 provisional",
    );
  });

  it("refuses a vintage nobody has written wording for", () => {
    expect(() => releaseLabel("2026-27", "postsecondary")).toThrow(
      /No release wording/,
    );
  });

  it("never gives a CCD directory an IPEDS designation", () => {
    // HD/IC are IPEDS file families and cover postsecondary institutions only.
    // Schools and districts come from CCD. Borrowing one collection's release
    // identifier for the other states a provenance the data does not have, and
    // it happens silently, because the borrowed string is a perfectly ordinary
    // label. So the rule is checked on every vintage, not just today's.
    for (const year of ACADEMIC_YEARS) {
      for (const kind of ["school", "district"] as const) {
        let label: string | null = null;
        try {
          label = releaseLabel(year, kind);
        } catch {
          continue; // Refusing is the correct answer for an unwritten vintage.
        }
        expect(label).not.toMatch(/\bHD\d{4}\b|\bIC\d{4}\b|IPEDS/);
      }
    }
  });

  it("refuses the 2025-26 school and district directories outright", () => {
    // The 2025-26 CCD release was observed but its version suffix was never
    // established, and the preceding year's "v0a" is not evidence for it. An
    // unknown is refused rather than guessed, so an import that lands before
    // the suffix is read fails loudly instead of publishing a wrong one.
    expect(() => releaseLabel("2025-26", "school")).toThrow(
      /No release wording/,
    );
    expect(() => releaseLabel("2025-26", "district")).toThrow(
      /No release wording/,
    );
  });
});

const DICTIONARY: EducationDictionary = {
  capabilities: { "2025:LEVEL1": { label: "Certificate", kind: "award" } },
  hashes: { artifact: "a".repeat(64) },
};

function compactRow(sourceYear: string): CompactInstitution {
  return [
    "ipeds-unit:100001",
    "postsecondary",
    "Example College",
    "Example City",
    "EX",
    "01",
    "01001",
    null,
    "A",
    "Active",
    null,
    "unknown",
    [["LEVEL1", "1"]],
    [["artifact", "member", 1]],
    sourceYear,
  ];
}

describe("an expanded row carries its own vintage through", () => {
  it("reads the release wording from the row's vintage", () => {
    expect(expandInstitution(compactRow("2025-26"), DICTIONARY).release).toBe(
      "HD2025/IC2025 provisional",
    );
  });

  it("dates the row from its own label rather than the newest one", () => {
    const row: EducationInstitution = expandInstitution(
      compactRow("2025-26"),
      DICTIONARY,
    );
    expect(institutionDateReason(row, "2025-12-01")).toBeNull();
    expect(institutionDateReason(row, "2024-12-01")).toContain("2025-26");
  });
});
