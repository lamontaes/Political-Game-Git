import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  verifyCommittedCivicCalendar,
  writeCivicCalendar,
} from "./compile-civic-calendar";
import type { compileCivicCalendar } from "./compile-civic-calendar";

const root = process.cwd();
const corpusText = readFileSync(
  `${root}/data/source/civic-calendar/corpus.json`,
  "utf8",
);
const corpus = JSON.parse(corpusText) as ReturnType<
  typeof compileCivicCalendar
>["corpus"];
const lock = JSON.parse(
  readFileSync(`${root}/data/source/civic-calendar/artifact-lock.json`, "utf8"),
) as ReturnType<typeof compileCivicCalendar>["lock"];
const manifest = JSON.parse(
  readFileSync(
    `${root}/data/source/civic-calendar/corpus-manifest.json`,
    "utf8",
  ),
) as ReturnType<typeof compileCivicCalendar>["manifest"];
const byUsps = new Map(
  corpus.jurisdictions.map((jurisdiction) => [jurisdiction.usps, jurisdiction]),
);

describe("locked 2026 civic calendar", () => {
  it("covers exactly the fifty states, DC and five inhabited territories", () => {
    expect(corpus.jurisdictions).toHaveLength(56);
    expect(
      new Set(corpus.jurisdictions.map((jurisdiction) => jurisdiction.usps))
        .size,
    ).toBe(56);
    expect(
      corpus.jurisdictions.filter(
        (jurisdiction) => jurisdiction.kind === "state",
      ),
    ).toHaveLength(50);
    expect(
      corpus.jurisdictions.filter(
        (jurisdiction) => jurisdiction.kind === "territory",
      ),
    ).toHaveLength(5);
    expect(
      corpus.jurisdictions.every(
        (jurisdiction) => jurisdiction.legislature.chambers.length > 0,
      ),
    ).toBe(true);
    expect(manifest.coverage.stateLegislativeSeatsUp2026).toBe(6139);
    expect(manifest.coverage.governorElections2026).toBe(39);
  });

  it("keeps the source's office and district exceptions instead of flattening them", () => {
    expect(byUsps.get("AL")?.primary2026.exceptions).toEqual([
      expect.objectContaining({
        office: "U.S. House districts 1, 2, 6 and 7",
        date: "2026-08-11",
      }),
    ]);
    expect(byUsps.get("LA")?.primary2026).toEqual(
      expect.objectContaining({
        nominationSystem: "all-comers",
        stateOfficeDate: null,
        congressionalDate: "2026-05-16",
        exceptions: [
          expect.objectContaining({ office: "U.S. House", date: "2026-11-03" }),
        ],
      }),
    );
    expect(byUsps.get("NE")?.legislature.chambers).toEqual([
      expect.objectContaining({
        chamberKey: "unicameral",
        seatsUpIn2026: 24,
        districtsUpIn2026: "even-numbered",
      }),
    ]);
  });

  it("distinguishes a source-backed zero from an unknown", () => {
    expect(
      byUsps
        .get("PR")
        ?.legislature.chambers.map((chamber) => chamber.seatsUpIn2026),
    ).toEqual([0, 0]);
    expect(byUsps.get("PR")?.primary2026.stateOfficeDate).toBeNull();
    expect(
      byUsps.get("PR")?.legislature.chambers[0]?.districtsUpIn2026,
    ).toBeNull();
    expect(byUsps.get("DC")?.primary2026).toEqual(
      expect.objectContaining({
        nominationSystem: "partisan",
        voterAccess: "closed",
        stateOfficeDate: "2026-06-16",
      }),
    );
  });

  it("binds the committed corpus to its cache-only source receipts", () => {
    expect(lock.artifacts).toHaveLength(9);
    for (const artifact of lock.artifacts) {
      expect(artifact.localPath).toBeNull();
      expect(artifact.storage).toBe("cached-not-committed");
      if (existsSync(artifact.cachePath)) {
        const bytes = readFileSync(artifact.cachePath);
        expect(bytes.length).toBe(artifact.bytes.length);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(
          artifact.bytes.sha256,
        );
      }
    }
    expect(createHash("sha256").update(corpusText).digest("hex")).toBe(
      manifest.canonicalSha256,
    );
    expect(() => writeCivicCalendar(undefined, true)).not.toThrow();
    expect(() => verifyCommittedCivicCalendar()).not.toThrow();
  });

  it("checks the portable research packet without distributing source pages", () => {
    const portableRoot = mkdtempSync(
      join(tmpdir(), "civic-calendar-portable-"),
    );
    try {
      const outputDir = join(portableRoot, "data/source/civic-calendar");
      mkdirSync(outputDir, { recursive: true });
      for (const filename of [
        "corpus.json",
        "artifact-lock.json",
        "corpus-manifest.json",
      ]) {
        copyFileSync(
          join(root, "data/source/civic-calendar", filename),
          join(outputDir, filename),
        );
      }
      expect(() => writeCivicCalendar(portableRoot, true)).not.toThrow();
    } finally {
      rmSync(portableRoot, { recursive: true });
    }
  });
});
