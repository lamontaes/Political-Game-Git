/**
 * A Puerto Rico municipio has a budget (Nation, Nov 9): the island's 78
 * municipios' approved General Fund for fiscal 2024-25 (OGP, $2,353,243,623)
 * over its residents, by revenue line, with spending equal to it. Before, the
 * territory had only a state row, so a municipio's budget was $0 in and out
 * (Toa Alta, found by the Screens ten-place sweep). Played at Toa Alta.
 */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { buildPopulation } from "./population";
import { searchCorePlaces } from "./place-lookup";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { budgetsOf, governments, openBudgets } from "./modules/budgets";
import bases from "../../data/research/money/public-budget-bases.json" with { type: "json" };

const START = "2026-01-05";
const OGP_TOTAL = 2_353_243_623;

describe("a Puerto Rico municipio's budget", () => {
  it("has revenue and spending lines in the town's own government at Toa Alta", () => {
    const place = [
      ...searchCorePlaces("Toa Alta", 20, { stateJurisdictionKey: "US-PR" }),
    ].find((row) => row.displayName.startsWith("Toa Alta"));
    expect(place, "Toa Alta in the place list").toBeDefined();
    const core = createLifeCore(
      buildPopulation({
        seed: "toa-alta-municipio",
        placeKey: place!.key,
        startedAt: START,
        minimumPeople: 30,
      }),
    );
    openLaws(core);
    openBudgets(core);
    const api = coreAPI(core);
    advanceCore(core, "2027-07-02");
    const town = governments(api).find((g) => g.base === "county-whole");
    expect(town, "the municipio's government").toBeDefined();
    const budgets = budgetsOf(api, town!.id);
    expect(budgets.length).toBeGreaterThan(0);
    const sum = (lines: Readonly<Record<string, number>>) =>
      Object.values(lines).reduce((n, v) => n + v, 0);
    const latest = [...budgets].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]!;
    expect(sum(latest.revenueMinor), `${latest.id} revenue`).toBeGreaterThan(0);
    expect(sum(latest.spendingMinor), `${latest.id} spending`).toBeGreaterThan(
      0,
    );
    expect(Object.keys(latest.spendingMinor).length).toBeGreaterThan(5);
    // The row is the island's General Fund per resident (the calibration carries it to the opening year).
    const island = (
      bases as unknown as {
        places: Record<string, { puertoRicoPopulation2025: number }>;
      }
    ).places["US-PR"]!.puertoRicoPopulation2025;
    const published = OGP_TOTAL / island;
    const perResident = sum(latest.revenueMinor) / 100 / town!.residents;
    expect(perResident / published).toBeGreaterThan(0.95);
    expect(perResident / published).toBeLessThan(1.25);
    const dollars = (minor: number) =>
      (minor / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
    process.stdout.write(
      `PR municipio budget: ${place!.displayName} (key ${place!.key}); ${latest.id}: revenue USD ${dollars(sum(latest.revenueMinor))}, spending USD ${dollars(sum(latest.spendingMinor))} for ${town!.residents} residents (USD ${perResident.toFixed(0)} each; the island's General Fund is USD ${published.toFixed(0)} a resident); source: ${latest.source.slice(0, 90)}\n`,
    );
  }, 300_000);
});
