/**
 * Every town whose records name a municipal government has a government row
 * for it, in its state or in an island area (gov-island-municipality-no-government):
 * the budgets engine looks the town's units up by the town's own record, not by
 * its Census code, which a territory place's key is not. An island municipality
 * has a government, a budget in force funded by its area's local aid, and the
 * council's and mayor's pay has a payer. Played worlds, places nobody chose,
 * with the seed named; a draw whose place holds no municipal unit is named and
 * passed over.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { gameStartDate } from "../../../src/core2/game-start";
import { placeLocalGovernmentUnits } from "../../../src/core2/gov-rules/local-governments";
import {
  corePlaceByKey,
  corePlaceStateIdentities,
} from "../../../src/core2/place-lookup";
import { placeLocalities } from "../../../src/core2/places";
import { coreAPI } from "../../../src/core2/state";
import { governments } from "../../../src/core2/modules/budgets";
import {
  budgetInForce,
  treasuryMonthsOf,
} from "../../../src/core2/budgets-treasury";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const hashOf = (label: string) =>
  createHash("sha256").update(`${seed}:${label}`).digest("hex");

/** The locality a hash picks from the given states' localities (sorted by key); never chosen by what it holds. */
function drawLocality(hash: string, states: readonly string[]) {
  const area = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const localities = [...placeLocalities(area)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  if (!localities.length) throw new Error(`no localities in ${area}`);
  return localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
}

/** Draws until the place's own record names a municipal government; each draw passed over is said. */
function drawTown(label: string, states: readonly string[]) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const hash = hashOf(`${label}:${attempt}`);
    const locality = drawLocality(hash, states);
    const unit = placeLocalGovernmentUnits(corePlaceByKey(locality.key))
      .municipal[0];
    if (unit) return { hash, locality, unit };
    console.log(
      `town-government-rows: passed over ${locality.displayName} (${locality.key}), seed ${hash}: no municipal government`,
    );
  }
  throw new Error(
    `no town with a municipal government in 24 draws of ${label}`,
  );
}

function checkTownGovernment(
  label: string,
  states: readonly string[],
  /** Run a year and a month and check the treasury met its public payroll. */
  runYear = false,
): void {
  const { hash, locality, unit } = drawTown(label, states);
  const where = `${locality.displayName} (${locality.key}), seed ${hash}`;
  const { core } = buildBenchWorld(hash, gameStartDate(), {
    twoLevel: true,
    placeKey: locality.key,
  });
  const api = coreAPI(core);
  const city = governments(api).find((g) => g.level === "city");
  expect(city, `${where}: a city government for ${unit.name}`).toBeDefined();
  expect(city!.name, `${where}: its name`).toBe(unit.name);
  const budget = budgetInForce(api, city!.id);
  expect(budget, `${where}: a budget in force`).toBeDefined();
  const sum = (lines: Readonly<Record<string, number>>) =>
    Object.values(lines).reduce((a, b) => a + b, 0);
  expect(sum(budget!.spendingMinor), `${where}: spending`).toBeGreaterThan(0);
  expect(sum(budget!.revenueMinor), `${where}: revenue`).toBeGreaterThan(0);
  if (runYear) {
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const months = treasuryMonthsOf(api, city!.id);
    const collected = months.reduce((n, m) => n + m.collectedMinor, 0);
    const short = months.reduce((n, m) => n + m.publicPayShortfallMinor, 0);
    expect(months.length, `${where}: treasury months`).toBeGreaterThan(0);
    // The municipality's revenue is sized for the residents it governs, so
    // its opening payroll fits it; a hole that drifts deeper each month fails.
    expect(short, `${where}: public-pay shortfall`).toBeLessThanOrEqual(
      collected * 0.05,
    );
  }
  console.log(
    `town-government-rows ${where}: ${city!.id} ${city!.name}, spending ${sum(budget!.spendingMinor)}, revenue ${sum(budget!.revenueMinor)}`,
  );
}

const ISLAND_MUNICIPALITIES = ["US-GU", "US-MP"];

it(`an island municipality has a government and a budget in a drawn island place, seed ${seed}`, () => {
  checkTownGovernment("island-municipality", ISLAND_MUNICIPALITIES, true);
}, 300_000);

it(`a town has a government and a budget in a drawn place of any of the 56, seed ${seed}`, () => {
  const states = corePlaceStateIdentities()
    .map((s) => s.jurisdictionKey)
    .sort();
  checkTownGovernment("any-town", states);
}, 300_000);
