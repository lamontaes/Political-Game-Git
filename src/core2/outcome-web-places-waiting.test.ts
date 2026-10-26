/**
 * The housing, transit, roads, parks and family links that wait, each with
 * the one reason it cannot reach a person's records yet
 * (web-reach-places-services). Each is on the unwired list under an open row
 * that names it, and the reason holds in the code: the web does not run it
 * because its cause is not recorded or it has no size, or it runs into an
 * outcome no engine reads. The day an engine names a cause or an outcome here, or a link
 * gets a size, this test fails and says to wire the link.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import { linkCoverage, WEB_LINKS } from "./outcome-web-model";

/** Each link, what the web waits on to run it, and whether its outcome is read for another reason. */
const WAITING: Readonly<
  Record<
    string,
    {
      /** The web runs it, and only the outcome's reader is missing. */
      readonly runs?: true;
      readonly waitingOn: readonly string[];
      readonly needsSize: boolean;
      /** Engine files that read the outcome; the link still moves nothing until it runs. */
      readonly outcomeReadBy?: readonly string[];
    }
  >
> = {
  /** No size, and no engine records air conditioning use. */
  "energy-price-to-ac-use": { waitingOn: [], needsSize: true },
  /** No engine records a severe disaster (research-disaster-severity-from-declarations). */
  "disaster-to-home-values": {
    waitingOn: ["disaster.severe", "housing.home-prices"],
    needsSize: false,
  },
  "disaster-to-out-migration": {
    waitingOn: ["disaster.severe"],
    needsSize: false,
    outcomeReadBy: [
      "src/core2/modules/counted-moves.ts",
      "src/core2/modules/moves.ts",
    ],
  },
  /** No size, the law is not recorded as a cause, and no engine records same-sex marriages. */
  "marriage-equality-to-marriages": {
    waitingOn: ["law.marriage-equality", "family.same-sex-marriages"],
    needsSize: true,
  },
  /** No engine records federal rail spending or intercity riders. */
  "federal-rail-expansion-to-riders": {
    waitingOn: ["federal.rail-expansion-pct"],
    needsSize: false,
  },
  /** The web runs it from the city's parks line (gov-measures.ts), but no engine records access to exercise. */
  "parks-spending-to-exercise-access": {
    runs: true,
    waitingOn: [],
    needsSize: false,
  },
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

/** The engine files that name a measure. */
function namedBy(
  measure: string,
  files: readonly { path: string; text: string }[] = SOURCES,
): string[] {
  return files
    .filter((file) => file.text.includes(`"${measure}"`))
    .map((file) => file.path)
    .sort();
}

describe("places and services links that wait, and why", () => {
  for (const [key, want] of Object.entries(WAITING))
    it(`${key} waits`, () => {
      const web = link(key);
      // On the unwired list, under an open row that names it.
      const listed = rows.find((row) => row.link === key);
      expect(listed, `${key} in unwired.json`).toBeDefined();
      const row = (
        stopgaps as { id: string; status?: string; whatItFakes?: string }[]
      ).find((one) => one.id === listed!.stopgapId)!;
      expect(row.status, row.id).toBe("open");
      expect(row.whatItFakes, row.id).toContain(key);
      // The web does not run it, for these reasons and no others (or runs
      // it into an outcome no engine reads).
      const coverage = linkCoverage(web);
      expect(coverage.wired, key).toBe(want.runs === true);
      expect(
        "waitingOn" in coverage ? [...coverage.waitingOn].sort() : [],
        `${key}: what it waits on`,
      ).toEqual([...want.waitingOn].sort());
      expect(
        "needsSize" in coverage && coverage.needsSize === true,
        `${key}: size ${web.size}`,
      ).toBe(want.needsSize);
      // No engine names what it waits on, nor its outcome but the readers
      // listed: the day one does, wire the link.
      for (const measure of want.waitingOn)
        expect(
          namedBy(measure),
          `${key}: an engine names ${measure}; wire it`,
        ).toEqual([]);
      expect(namedBy(web.to), `${key}: an engine reads ${web.to}`).toEqual(
        [...(want.outcomeReadBy ?? [])].sort(),
      );
    });

  // Break-it: the check trips the day an engine file names a cause.
  it("the cause check trips when an engine records disaster.severe", () => {
    const reading = [
      ...SOURCES,
      {
        path: "src/core2/modules/engine-that-records.ts",
        text: `export const SEVERE = "disaster.severe";`,
      },
    ];
    expect(namedBy("disaster.severe")).toEqual([]);
    expect(namedBy("disaster.severe", reading)).toEqual([
      "src/core2/modules/engine-that-records.ts",
    ]);
  });
});
