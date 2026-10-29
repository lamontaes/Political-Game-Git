/**
 * The labor links that wait, each with the one reason it cannot reach a
 * person's records yet (web-reach-labor). Each cites the labor engine's own
 * stopgap in the unwired list, that stopgap names it, and the reason holds in
 * the code: the cause is a person's own exposure history no record keeps, the link has no size (or about
 * zero), or no engine records formal-sector employment. The day an engine
 * file names one of these outcomes, or an unsized link gets a size, this test
 * fails and says to wire the link.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import { WEB_LINKS } from "./outcome-web-model";

const WAITING = {
  /** The cause is the person's own exposure history, which no record keeps. */
  "SG-LABOR-person-exposure": [
    "birth-year-pollution-to-adult-earnings",
    "teacher-quality-to-earnings",
    "neighborhood-years-to-adult-outcomes",
  ],
  /** No researched size the game can apply (a link about zero is graded not applicable and is not listed). */
  "SG-LABOR-unsized-links": [
    "graduation-to-earnings",
    "transit-loss-to-unemployment",
    "broadband-to-employment",
    "incentive-deal-to-industry-jobs",
    "more-immigration-to-workforce",
  ],
  /** No engine records formal-sector employment. */
  "SG-LABOR-pretrial-employment": ["pretrial-detention-to-employment"],
} as const;

/**
 * Files that name an outcome for another use, not to read the web's factor
 * on it: the voting engine reads the unemployment rate as a cause, and the
 * news keeps it as a topic.
 */
const OTHER_USES: Readonly<Record<string, readonly string[]>> = {
  "labor.unemployment-pct": [
    "src/core2/electorate-inputs.ts",
    "src/core2/data/news/outcome-news.json",
  ],
};

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const rows = (unwired as { links: { link: string; stopgapId: string }[] })
  .links;

/** Engine code and data: every source file under src/core2 but tests and the web's own generated files. */
function sources(dir = "src/core2"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return path === "src/core2/data/outcome-web" ? [] : sources(path);
    if (path === "src/core2/data/stopgaps.json") return [];
    return /\.(ts|json)$/.test(path) && !path.endsWith(".test.ts")
      ? [path]
      : [];
  });
}
const SOURCES = sources().map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

/** The engine files that name an outcome, other than those listed for another use: the day one does, it reads it. */
function readersOf(
  outcome: string,
  files: readonly { path: string; text: string }[] = SOURCES,
): string[] {
  return files
    .filter(
      (file) =>
        file.text.includes(`"${outcome}"`) &&
        !(OTHER_USES[outcome] ?? []).includes(file.path),
    )
    .map((file) => file.path);
}

describe("labor links that wait, and why", () => {
  for (const [stopgapId, keys] of Object.entries(WAITING))
    for (const key of keys)
      it(`${key} waits on ${stopgapId}`, () => {
        // The unwired list files it under the labor engine's own stopgap, and
        // that open row names it.
        expect(
          rows.find((row) => row.link === key)?.stopgapId,
          `${key} in unwired.json`,
        ).toBe(stopgapId);
        const row = (
          stopgaps as { id: string; status?: string; whatItFakes?: string }[]
        ).find((one) => one.id === stopgapId)!;
        expect(row.status, stopgapId).toBe("open");
        expect(row.whatItFakes, stopgapId).toContain(`(${key})`);
        const web = link(key);
        if (stopgapId === "SG-LABOR-unsized-links")
          // No size, or one the research finds about zero.
          expect(
            web.size === null || Math.abs(web.size ?? 0) < 1e-9,
            `${key}: size ${web.size}; wire it`,
          ).toBe(true);
        // For every waiting link: no engine code or data names the outcome
        // but the files listed for another use. The day one reads it, wire
        // the link.
        expect(
          readersOf(web.to),
          `${key}: an engine reads ${web.to}; wire it`,
        ).toEqual([]);
      });

  // Each file listed for another use still names its outcome, so the list
  // cannot hide a reader by going stale.
  for (const [outcome, paths] of Object.entries(OTHER_USES))
    for (const path of paths)
      it(`${path} names ${outcome} for another use`, () => {
        expect(
          SOURCES.find((file) => file.path === path)?.text,
          path,
        ).toContain(`"${outcome}"`);
      });

  // Break-it: the reader check trips the day an engine file names the
  // outcome, for an unsized link as for one with no record.
  for (const key of [
    "transit-loss-to-unemployment",
    "pretrial-detention-to-employment",
  ])
    it(`the reader check trips when an engine reads ${key}'s outcome`, () => {
      const outcome = link(key).to;
      const reading = [
        ...SOURCES,
        {
          path: "src/core2/modules/engine-that-reads.ts",
          text: `const factor = webFactorFor(api, placeId, "${outcome}", subject);`,
        },
      ];
      expect(readersOf(outcome)).toEqual([]);
      expect(readersOf(outcome, reading)).toEqual([
        "src/core2/modules/engine-that-reads.ts",
      ]);
    });
});
