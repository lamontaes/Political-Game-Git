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
import { STOPGAPS as stopgaps } from "./stopgaps";
import { WEB_LINKS } from "./outcome-web-model";

const WAITING = {
  // No named health reader for the outcome.
  "gas-hookup-ban-to-child-asthma": "SG-WEB-unread-health-child-asthma-pct",
  "water-violations-to-infant-health": "SG-WEB-unread-health-low-birthweight",
  // No researched size the game can apply.
  "congestion-to-premature-births": "SG-WEB-unread-health-premature-births",
  "heat-to-deaths": "SG-WEB-unread-health-heat-deaths",
  "eviction-to-hospital-visits": "SG-WEB-unread-health-hospital-visits",
  // The cause needs a person's own history.
  "coverage-to-catastrophic-bills":
    "SG-WEB-unread-health-catastrophic-medical-bills",
  "coverage-to-depression": "SG-WEB-unread-health-depression",
  "child-food-stamps-to-adult-health":
    "SG-WEB-unread-health-adult-metabolic-syndrome",
  "eitc-to-low-birthweight": "SG-WEB-unread-health-low-birthweight",
} as const;

const UNSIZED = new Set<string>([
  "congestion-to-premature-births",
  "heat-to-deaths",
  "eviction-to-hospital-visits",
]);

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const rows = (unwired as { links: { link: string; stopgapId: string }[] })
  .links;

/** Engine code and data: every source file under src/core2 but tests and the web's own generated files. */
function sources(dir = "src/core2"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return path === "src/core2/data/outcome-web" ||
        path === "src/core2/data/stopgaps"
        ? []
        : sources(path);
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
  for (const [key, stopgapId] of Object.entries(WAITING))
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
      expect(row.whatItFakes?.split(/[^a-z0-9-]+/i), stopgapId).toContain(key);
      const web = link(key);
      if (UNSIZED.has(key))
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

  // The medical-debt link no longer waits (health-medical-debt-record): the
  // coverage engine's bills read its outcome where the share sent to
  // collections is decided, it is off the unwired list, and the stopgap it
  // waited on is resolved.
  it("medicaid-expansion-to-medical-debt is read by the medical bills", () => {
    const outcome = link("medicaid-expansion-to-medical-debt").to;
    expect(readersOf(outcome)).toContain("src/core2/medical-bills.ts");
    expect(
      rows.find((row) => row.link === "medicaid-expansion-to-medical-debt"),
    ).toBeUndefined();
    const row = (stopgaps as { id: string; status?: string }[]).find(
      (one) => one.id === "SG-EW-HEALTH-medical-debt-reader",
    )!;
    expect(row.status).toBe("resolved");
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
