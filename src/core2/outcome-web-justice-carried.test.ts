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
import { END_CASH_BAIL } from "./justice-pretrial";
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
