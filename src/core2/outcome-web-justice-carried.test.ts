/**
 * Justice links the justice engine already carries (web-reach-crime-justice).
 * A web link that moves a place rate for something an engine already decides
 * from the same law would count the law twice, so the link names the engine
 * and function that carries it and the web does not run it. Where no engine
 * decides it, the link stays unwired and says so.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import crimeData from "./data/crime/victimization.json" with { type: "json" };
import { END_CASH_BAIL } from "./justice-pretrial";
import { VIOLENT } from "./modules/crime";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;

/** Every non-test source file of the new core, by path. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "data" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("justice links and the engine that decides them", () => {
  it("carries the bail link by the pretrial decision that reads the bail law", () => {
    const bail = link("end-cash-bail-to-pretrial-detention");
    expect(bail.carriedBy).toContain("decidePretrial");
    expect(bail.carriedBy).toContain("src/core2/justice-pretrial.ts");
    // The function the link names exists and reads the law the link starts from.
    const file = readFileSync("src/core2/justice-pretrial.ts", "utf8");
    expect(file).toMatch(/export function decidePretrial\(/);
    expect(file).toContain("lawInForce(api, END_CASH_BAIL)");
    expect(bail.from).toBe(`law:${END_CASH_BAIL}`);
    expect(readFileSync("src/core2/modules/justice.ts", "utf8")).toContain(
      "decidePretrial(api, JUSTICE_MODULE_ID",
    );
    // So the web does not also run it.
    const coverage = linkCoverage(bail);
    expect(coverage.wired).toBe(false);
    expect("carriedBy" in coverage && coverage.carriedBy).toBe(bail.carriedBy);
    expect((WIRED_INTO.get(bail.to) ?? []).map((row) => row.key)).not.toContain(
      bail.key,
    );
  });

  it("leaves the mandatory-minimum links unwired: no engine in the new core sentences from them", () => {
    for (const key of [
      "mandatory-minimums-to-incarceration",
      "mandatory-minimum-cut-to-federal-prisoners",
    ]) {
      const row = link(key);
      expect(row.carriedBy, key).toBeUndefined();
    }
    // The sentences the new core hands down are bribery's, from each place's own statute (justice-law.ts);
    // nothing reads a mandatory-minimum law. If one does, mark these links carriedBy it.
    const naming = sources("src/core2").filter((path) =>
      /mandatory-minimum/.test(readFileSync(path, "utf8")),
    );
    expect(naming).toEqual([]);
  });
});

describe("the town's crime level and the offenses it is made of", () => {
  it("scales the offenses outside the violent index by it, never robbery and assault, which make it up", () => {
    const INDEX = "crime.violent-victimization-index";
    const types = crimeData.types as Record<string, { webMeasures: string[] }>;
    // A link from the index into an offense it counts would count each move
    // twice and feed the next month's index one for one.
    for (const type of VIOLENT)
      for (const measure of types[type]!.webMeasures)
        for (const row of WIRED_INTO.get(measure) ?? [])
          expect(row.from, `${type}: ${row.key}`).not.toBe(INDEX);
    for (const key of ["crime-level-to-robbery", "crime-level-to-assault"]) {
      expect(link(key).from, key).toBe(INDEX);
      expect(link(key).carriedBy, key).toContain("violentIndex");
    }
    // Burglary and vandalism are not in the index, so the town's crime level reaches them.
    for (const key of ["crime-level-to-burglary", "crime-level-to-vandalism"])
      expect(
        (WIRED_INTO.get(link(key).to) ?? []).map((row) => row.key),
        key,
      ).toContain(key);
  });
});
