/**
 * The health links that wait, each with the one reason it cannot reach a
 * person's records yet (web-health-waiting-links-named). Each cites the
 * health engine's own stopgap in the unwired list, that stopgap names it, and
 * the reason holds in the code: no engine records the outcome, the link has
 * no size (or about zero), or its cause is not recorded on the person. The
 * day an engine reads any of these outcomes, or an unsized link gets a size,
 * this test fails and says to wire the link.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import { WEB_LINKS } from "./outcome-web-model";

const WAITING = {
  /** The outcome is no engine's record: a child's asthma, Part D spending, a birth weight. */
  "SG-EW-HEALTH-condition-record": [
    "gas-hookup-ban-to-child-asthma",
    "drug-negotiation-to-out-of-pocket",
    "water-violations-to-infant-health",
  ],
  /** No researched size the game can apply (a link about zero is graded not applicable and is not listed). */
  "SG-EW-HEALTH-unsized-links": [
    "congestion-to-premature-births",
    "heat-to-deaths",
    "eviction-to-hospital-visits",
  ],
  /** The cause is the person's own history, which no record keeps. */
  "SG-EW-HEALTH-person-level": [
    "coverage-to-catastrophic-bills",
    "coverage-to-depression",
    "child-food-stamps-to-adult-health",
    "eitc-to-low-birthweight",
  ],
} as const;

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

/** The engine files that name an outcome: the day one does, it reads it. */
function readersOf(
  outcome: string,
  files: readonly { path: string; text: string }[] = SOURCES,
): string[] {
  return files
    .filter((file) => file.text.includes(`"${outcome}"`))
    .map((file) => file.path);
}

describe("health links that wait, and why", () => {
  for (const [stopgapId, keys] of Object.entries(WAITING))
    for (const key of keys)
      it(`${key} waits on ${stopgapId}`, () => {
        // The unwired list files it under the health engine's own stopgap,
        // and that open row names it.
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
        if (stopgapId === "SG-EW-HEALTH-unsized-links")
          // No size, or one the research finds about zero.
          expect(
            web.size === null || Math.abs(web.size ?? 0) < 1e-9,
            `${key}: size ${web.size}; wire it`,
          ).toBe(true);
        // For every waiting link: no engine code or data names the outcome.
        // The day one reads it, wire the link.
        expect(
          readersOf(web.to),
          `${key}: an engine reads ${web.to}; wire it`,
        ).toEqual([]);
      });

  // Break-it: the reader check trips the day an engine file names the
  // outcome, for an unsized link as for a condition-record one.
  for (const key of ["heat-to-deaths", "gas-hookup-ban-to-child-asthma"])
    it(`the reader check trips when an engine reads ${key}'s outcome`, () => {
      const outcome = link(key).to;
      const reading = [
        ...SOURCES,
        {
          path: "src/core2/modules/engine-that-reads.ts",
          text: `const measure = webReach(api, placeId, "${outcome}", subject);`,
        },
      ];
      expect(readersOf(outcome)).toEqual([]);
      expect(readersOf(outcome, reading)).toEqual([
        "src/core2/modules/engine-that-reads.ts",
      ]);
    });
});
