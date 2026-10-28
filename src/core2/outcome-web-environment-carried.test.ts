/**
 * The environment, farm and water links an engine already carries, and the
 * ones no engine owns (web-reach-environment). A web link that moves a place
 * rate for something an engine already decides from the same law would count
 * the law twice, so the link names the engine and function that carries it
 * and the web does not run it. Where an engine reads the same law by its own
 * mechanic, not the row's size and lag, the link is not carried: it stays
 * unwired, naming that engine (engineGap). Where no engine decides the
 * outcome, the link stays unwired and this file holds the reason, so the day
 * an engine does read it the test says to wire the link.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "./game-start";
import { linkCoverage, WEB_LINKS } from "./outcome-web-model";
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import stopgaps from "./data/stopgaps.json" with { type: "json" };

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const read = (path: string) => readFileSync(path, "utf8");

/** Every non-test source file of the new core, by path. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "data" ? [] : sources(path);
    return /\.tsx?$/.test(name) &&
      !/\.test\.tsx?$/.test(name) &&
      !/\.generated\.ts$/.test(name)
      ? [path]
      : [];
  });
}
const CORE = sources("src/core2");
const naming = (pattern: RegExp) =>
  CORE.filter((path) => pattern.test(read(path)));

/**
 * An engine reads the link's law its own way: the link names that engine and
 * function as its gap, is not carried, stays on the unwired list under an open
 * stopgap whose reason names the gap, and no engine reads its outcome.
 */
function expectEngineGap(key: string, file: string, fn: string) {
  const row = link(key);
  expect(row.carriedBy, key).toBeUndefined();
  expect(row.engineGap, key).toContain(file);
  expect(row.engineGap, key).toContain(fn);
  expect("carriedBy" in linkCoverage(row), key).toBe(false);
  const listed = unwired.links.find((one) => one.link === key);
  expect(listed, `${key} on the unwired list`).toBeDefined();
  const gap = stopgaps.find((one) => one.id === listed!.stopgapId);
  expect(gap?.status, listed!.stopgapId).toBe("open");
  expect(gap?.why, listed!.stopgapId).toContain(row.engineGap!);
  expect(naming(new RegExp(row.to.replace(/[.-]/g, "\\$&")))).toEqual([]);
}

describe("environment, farm and water links and the engines that decide them", () => {
  it("leaves the groundwater limit unwired: the business engine's farm groundwater limit reads the law with its own cut, at once", () => {
    const row = link("groundwater-limits-to-irrigation-pumping");
    expectEngineGap(
      row.key,
      "src/core2/modules/business.ts",
      "readGroundwaterLaw",
    );
    const business = read("src/core2/modules/business.ts");
    // The function the link names reads the law the link starts from, sets the farm's limit, and runs.
    expect(business).toMatch(/function readGroundwaterLaw\(/);
    expect(row.from).toBe(
      "law:us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal",
    );
    expect(business).toContain(row.from.replace(/^law:/, ""));
    expect(business).toMatch(/lawInForce\(api, question\)/);
    expect(business).toMatch(/setOperatingLimit\(api, table, \{/);
    expect(business).toMatch(/\n\s+readGroundwaterLaw\(api\);/);
    expect(read("src/core2/business-operating-rules.ts")).toContain(
      "limitOutsideSales(",
    );
  });

  it("leaves the farmland easements unwired: the builders' starts decision reads the law with its own land elasticity", () => {
    const row = link("farmland-easements-to-farmland-lost");
    expectEngineGap(row.key, "src/core2/housing-construction.ts", "buildMonth");
    const construction = read("src/core2/housing-construction.ts");
    expect(construction).toMatch(/export function buildMonth\(/);
    expect(row.from).toBe(
      "law:us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
    );
    // The law reaches the decision: the housing module reads it in force and the starts take its land share.
    expect(construction).toContain(row.from.replace(/^law:/, ""));
    expect(construction).toMatch(/z\.farmlandProtected/);
    const housing = read("src/core2/modules/housing.ts");
    expect(housing).toContain(row.from.replace(/^law:/, ""));
    expect(housing).toMatch(/farmlandProtected: farmland\.value === 1/);
    expect(housing).toMatch(/buildMonth\(/);
  });

  it("leaves litter on the web's ledger only: no engine keeps it and no link reads it", () => {
    const row = link("container-deposit-to-litter");
    expect(row.carriedBy).toBeUndefined();
    expect(linkCoverage(row).wired).toBe(true);
    // Nothing in the new core records litter, pays to clear it or sets a price from it.
    expect(naming(/litter/i)).toEqual([]);
    expect(
      WEB_LINKS.filter((one) => one.from.replace(/:.*/, "") === row.to).map(
        (one) => one.key,
      ),
    ).toEqual([]);
  });

  it("leaves farm payments and land values unwired: no record of the payments and no engine prices farmland", () => {
    const row = link("farm-payments-cut-to-land-values");
    expect(row.carriedBy).toBeUndefined();
    expect(linkCoverage(row).wired).toBe(false);
    expect(naming(/farm[- ]payments?|valuePerAcre|value-per-acre/i)).toEqual(
      [],
    );
  });

  it("leaves preparedness unwired: the link has no size and nothing records preparedness spending", () => {
    const row = link("preparedness-to-disaster-damage");
    expect(row.size).toBeNull();
    expect(row.carriedBy).toBeUndefined();
    expect(linkCoverage(row).wired).toBe(false);
    expect(naming(/disaster-preparedness/)).toEqual([]);
  });

  it("leaves the flood-zone limit unwired: the disasters engine replays recorded damage and no law passed in play reaches it", () => {
    const row = link("flood-zone-limits-to-damage");
    expect(row.carriedBy).toBeUndefined();
    expect(linkCoverage(row).wired).toBe(false);
    // No engine reads the flood-zone law.
    expect(naming(/restrict-building-in-flood-zones/)).toEqual([]);
    // The disasters engine pays the damage FEMA recorded and rolls no new disaster...
    const disasters = read("src/core2/modules/disasters.ts");
    expect(disasters).toMatch(/Nothing is rolled/);
    expect(disasters).toMatch(/declarations\.byCounty/);
    // ...and the records end before the earliest day a law passed from the start can act (start date plus the link's lag).
    const declarations = JSON.parse(
      read("src/core2/data/disasters/declarations.json"),
    ) as {
      byCounty: Record<string, [string, string, number, number, number][]>;
    };
    const lastIncident = Object.values(declarations.byCounty)
      .flat()
      .reduce((latest, rowOf) => (rowOf[0] > latest ? rowOf[0] : latest), "");
    const start = gameStartDate();
    const earliest = new Date(
      Date.UTC(
        Number(start.slice(0, 4)),
        Number(start.slice(5, 7)) - 1 + row.lagMonths,
        Number(start.slice(8, 10)),
      ),
    )
      .toISOString()
      .slice(0, 10);
    expect(lastIncident < earliest).toBe(true);
  });
});
