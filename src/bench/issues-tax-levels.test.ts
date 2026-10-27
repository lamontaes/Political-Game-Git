/**
 * Politics → Issues labels each tax by who sets it
 * (pool item play-stop-06-texas-shows-local-income-tax). A card's figure is
 * the law in force across every level (an income tax's federal and state top
 * rates added), so its name says no level; each level's row names the
 * government whose seats set it, and a stand-in from another series (a
 * state's average local sales tax) says what it is. In a Texas town no state
 * or local income tax is shown above zero. Played in the world the player
 * gets (`buildBenchWorld`, two-level) in places drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { governmentView } from "./government";
import { buildBenchWorld } from "./world";
import { policyNames } from "./words";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function issuesIn(stateKey?: string) {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 400; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "issues-tax-levels");
    if (stateKey && place.state !== stateKey) {
      passed.push(place.state);
      continue;
    }
    const { core, playerId } = buildBenchWorld(place.seed, "2025-01-20", {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    return { view: governmentView(core, playerId!), where, passed };
  }
  throw new Error(`no ${stateKey} place drawn from seed ${seed}`);
}

it(`each tax on Issues names who sets it, seed ${seed}`, () => {
  const { view, where } = issuesIn();
  const names = policyNames();
  for (const law of view.law) {
    // An amount is every level's law together: its name claims no level. A
    // policy question's name may be about local power ("Local minimum wage
    // authority"), a state's law.
    if (!law.yesNo)
      expect(
        names[law.series] ?? law.series,
        `${where}: ${law.series}`,
      ).not.toMatch(/^Local\b/);
    for (const level of law.levels.filter((l) => l.row)) {
      const standIn = level.row!.series !== law.series;
      // A level's own law names its government; a stand-in names its series.
      if (!standIn)
        expect(
          level.government,
          `${where}: ${law.series} ${level.level}`,
        ).toBeTruthy();
    }
  }
  const income = view.law.find((l) => l.series === "income-tax")!;
  process.stdout.write(
    `issues tax levels: ${where}: ${names["income-tax"]} ${income.value}; ${income.levels
      .filter((l) => l.row)
      .map((l) => `${l.level} ${l.government ?? l.row!.series} ${l.row!.value}`)
      .join(", ")}\n`,
  );
}, 600_000);

it(`a Texas town shows no state or local income tax, seed ${seed}`, () => {
  const { view, where } = issuesIn("US-TX");
  const income = view.law.find((l) => l.series === "income-tax")!;
  const above = income.levels.filter(
    (l) => l.level !== "federal" && l.row && (l.row.value ?? 0) > 0,
  );
  expect(above, where).toEqual([]);
  const federal = income.levels.find((l) => l.level === "federal")!;
  // The figure is the federal top rate alone, and says it is the nation's.
  expect(income.value, where).toBe(federal.row!.value);
  expect(federal.government, where).toBeTruthy();
  const state = income.levels.find((l) => l.level === "state");
  if (state?.row) expect(state.government, where).toBe("Texas");
  process.stdout.write(
    `issues tax levels: ${where}: income tax ${income.value} = ${income.levels
      .filter((l) => l.row)
      .map((l) => `${l.government} ${l.row!.value}`)
      .join(" + ")}\n`,
  );
}, 600_000);
