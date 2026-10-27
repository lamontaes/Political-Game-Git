/**
 * The votes, approval and press links an engine already carries, and the ones
 * that wait (web-reach-civic). A web link that moved a place's vote for what
 * the voting engine already weighs voter by voter would count the cause
 * twice, so the link names the engine and function that carries it and the
 * web does not run it. Each link that stays unwired keeps its reason here, so
 * the day an engine reads its cause the test says to wire the link.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const read = (path: string) => readFileSync(path, "utf8");

/** The link is carried: it names the engine, and the web does not run it. */
function expectCarried(key: string, file: string, fn: string) {
  const row = link(key);
  expect(row.carriedBy, key).toContain(file);
  expect(row.carriedBy, key).toContain(fn);
  const coverage = linkCoverage(row);
  expect(coverage.wired, key).toBe(false);
  expect("carriedBy" in coverage && coverage.carriedBy, key).toBe(
    row.carriedBy,
  );
  expect((WIRED_INTO.get(row.to) ?? []).map((one) => one.key)).not.toContain(
    key,
  );
}

describe("votes, approval and press links and the engines that decide them", () => {
  it("carries exposed corruption by the voting engine's scandal term, voter by voter", () => {
    const row = link("exposed-corruption-to-reelection");
    expectCarried(row.key, "src/core2/modules/voting.ts", "scandalTerm");
    expect(row.carriedBy).toContain("scandalAppeal");
    const voting = read("src/core2/modules/voting.ts");
    // The cause the link starts from is what the term reads: a reported
    // bribe or a public conviction, only where the story reached the voter.
    expect(voting).toMatch(/export function scandalStoriesOf\(/);
    expect(voting).toMatch(/\.\.\.scandalsOf\(api, candidateId, date\)/);
    expect(voting).toMatch(/convictionsOf\(api, candidateId, date\)/);
    expect(voting).toMatch(/export function scandalTerm\(/);
    expect(voting).toMatch(
      /const scandal = scandalTerm\(api, voter\.id, entry\.id, lean\);/,
    );
    // It enters the appeal each vote is chosen from.
    expect(voting).toMatch(/parts\.ballot \+\s+scandal,/);
    // Counted voters take it at the share of named adults it reached.
    expect(voting).toMatch(/scandal: scandalAppeal\(api, f\.personId, named\)/);
    const parameters = JSON.parse(
      read("src/core2/data/electorate/parameters.json"),
    ) as { parameters: Record<string, { value: number; tag: string }> };
    expect(parameters.parameters.scandalShare!.tag).toBe("ESTIMATED");
    expect(parameters.parameters.scandalShare!.value).toBeGreaterThan(0);
  });

  it("carries the economy by the electorate's economy term in the president's party's standing", () => {
    const row = link("economy-to-approval");
    expect(row.size).toBeNull();
    expectCarried(
      row.key,
      "src/core2/electorate-inputs.ts",
      "candidateReasons",
    );
    expect(row.carriedBy).toContain("nationalEconomyChange");
    const inputs = read("src/core2/electorate-inputs.ts");
    expect(inputs).toMatch(/export function nationalEconomyChange\(/);
    expect(inputs).toMatch(/national: nationalEconomyChange\(api\)/);
    expect(inputs).toMatch(
      /const economy = candidate\.presidentsParty\s+\?\s+-\(/,
    );
    expect(inputs).toMatch(
      /p\("unemploymentShare"\) \* conditions\.national\.unemploymentChange/,
    );
    expect(inputs).toMatch(
      /p\("inflationShare"\) \* conditions\.national\.inflationChange/,
    );
  });

  it("leaves a newspaper closing unwired: no outlet closes, so there is no cause to read", () => {
    const row = link("newspaper-closure-to-engagement");
    expect(row.carriedBy).toBeUndefined();
    expect(linkCoverage(row).wired).toBe(false);
    expect(read("src/core2/turnout-web.ts")).toContain(
      "SG-WEB-voting-newspaper-closure",
    );
  });

  it("leaves relief spending and press attacks unwired: the research gives no size the game can apply", () => {
    for (const key of [
      "relief-spending-to-votes",
      "press-attacks-to-media-trust",
    ]) {
      const row = link(key);
      expect(row.size, key).toBeNull();
      expect(row.carriedBy, key).toBeUndefined();
      expect(linkCoverage(row).wired, key).toBe(false);
    }
  });

  it("leaves the three links the research finds about zero on the web's ledger", () => {
    for (const key of [
      "all-mail-voting-to-party-share",
      "voter-id-to-registration",
      "preparedness-spending-to-votes",
    ]) {
      const row = link(key);
      expect(row.size, key).toBe(0);
      expect(row.carriedBy, key).toBeUndefined();
    }
  });
});
