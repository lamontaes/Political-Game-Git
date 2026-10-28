/**
 * The environment, farm and water links an engine already carries, and the
 * ones no engine owns (web-reach-environment). A web link that moves a place
 * rate for something an engine already decides from the same law would count
 * the law twice, so the link names the engine and function that carries it
 * at the row's size and the web does not run it. Where no engine decides the
 * outcome, the link stays unwired and this file holds the reason, so the day
 * an engine does read it the test says to wire the link.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "./game-start";
import { linkCoverage, WEB_LINKS } from "./outcome-web-model";
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };

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

describe("environment, farm and water links and the engines that decide them", () => {
  it("carries the groundwater limit in the business engine at the row's researched size, so the web does not run it", () => {
    const row = link("groundwater-limits-to-irrigation-pumping");
    expect(row.engineGap, row.key).toBeUndefined();
    expect(row.carriedBy, row.key).toContain("src/core2/modules/business.ts");
    expect(row.carriedBy, row.key).toContain("readGroundwaterLaw");
    expect("carriedBy" in linkCoverage(row), row.key).toBe(true);
    expect(unwired.links.find((one) => one.link === row.key)).toBeUndefined();
    const business = read("src/core2/modules/business.ts");
    // The function the link names reads the law the link starts from, sets the farm's limit at the row's size, and runs.
    expect(business).toMatch(/function readGroundwaterLaw\(/);
    expect(row.from).toBe(
      "law:us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal",
    );
    expect(business).toContain(row.from.replace(/^law:/, ""));
    expect(business).toMatch(/lawInForce\(api, question\)/);
    expect(business).toContain(`GROUNDWATER_LINK = "${row.key}"`);
    expect(business).toMatch(/carriedLink\(GROUNDWATER_LINK\)/);
    expect(business).toMatch(/share: 1 \+ pumping\.size!/);
    expect(business).toMatch(/\n\s+readGroundwaterLaw\(api\);/);
    expect(read("src/core2/business-operating-rules.ts")).toContain(
      "limitOutsideSales(",
    );
    // No second number for the same cut: the old withdrawal share is gone.
    expect(naming(/groundwaterWithdrawalShare/)).toEqual([]);
  });

  it("carries the farmland easements in the builders' starts decision at the row's researched size, so the web does not run it", () => {
    const row = link("farmland-easements-to-farmland-lost");
    expect(row.engineGap, row.key).toBeUndefined();
    expect(row.carriedBy, row.key).toContain(
      "src/core2/housing-construction.ts",
    );
    expect(row.carriedBy, row.key).toContain("buildMonth");
    expect("carriedBy" in linkCoverage(row), row.key).toBe(true);
    expect(unwired.links.find((one) => one.link === row.key)).toBeUndefined();
    const construction = read("src/core2/housing-construction.ts");
    expect(construction).toMatch(/export function buildMonth\(/);
    expect(row.from).toBe(
      "law:us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
    );
    // The law reaches the decision: the housing module reads it in force and the starts take the row's size out of the land built on farmland.
    expect(construction).toContain(row.from.replace(/^law:/, ""));
    expect(construction).toMatch(/z\.farmlandProtected/);
    expect(construction).toContain(`FARMLAND_LINK = "${row.key}"`);
    expect(construction).toMatch(
      /construction\.farmland\.developmentShare \*\s+carriedLink\(FARMLAND_LINK\)\.size!/,
    );
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
