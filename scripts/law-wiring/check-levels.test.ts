/**
 * The law checker changes a law at the level it is asked to (pool item
 * laws-checker-tests-every-level): a law the town, the state and Congress can
 * all pass is graded at each, not only as a town law. Pinned to Eveleth,
 * Minnesota (checker seed take-effect-2), where the state's minimum wage
 * ($11.13) is above the federal one ($7.25) and the town keeps a budget.
 * Measured Nov 14 on the Train at 8b6c8903: the two controls about 105 s, each
 * case about 38 s; the limits are about twice that.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { allLaws } from "./catalog";
import {
  checkLaw,
  drawLawPlace,
  runControl,
  startTraces,
  type Control,
} from "./check";

const drawn = drawLawPlace("take-effect-2");
const law = (key: string) => allLaws().find((l) => l.key === key)!;
const RENT = "us-policy-positions:housing-land-use.rent-stabilization";

let laws: Control;
let lines: Control;

describe(`the law checker changes a law at the level asked (${drawn.name}, ${drawn.seed})`, () => {
  beforeAll(() => {
    setBookkeeping(false);
    startTraces();
    laws = runControl(drawn, allLaws(), true);
    lines = runControl(drawn, allLaws(), false);
  }, 210_000);

  it("is drawn where the case was measured", () => {
    expect(drawn.name).toBe("Eveleth, Minnesota");
  });

  it("lists every level of the chain that may pass a law", () => {
    expect(laws.levels.get("minimum-wage")).toEqual([
      "city",
      "county",
      "state",
      "federal",
    ]);
    // The catalog lets a town or a state pass rent rules, not a county.
    expect(laws.levels.get(RENT)).toEqual(["city", "state"]);
    expect(laws.levels.get("budget-line:police")).toEqual([
      "city",
      "county",
      "state",
    ]);
  });

  it("raises the state's minimum wage as the state's own row, and it reaches workers", () => {
    const r = checkLaw(drawn, law("minimum-wage"), laws, "state");
    expect(r.level).toBe("state");
    expect(r.change).toMatch(
      /^minimum-wage 1113 -> 1224 at state \(law:US-MN:state:/,
    );
    expect(r.change).not.toMatch(/governs/);
    expect(r.reach.open).toBeGreaterThan(0);
  }, 75_000);

  it("raises the federal minimum wage as Congress's own row, and says the state's floor still governs", () => {
    const r = checkLaw(drawn, law("minimum-wage"), laws, "federal");
    expect(r.change).toMatch(
      /^minimum-wage 725 -> 798 at federal \(law:US:federal:/,
    );
    expect(r.change).toMatch(/; law:US-MN:state:minimum-wage:\S+ governs$/);
  }, 75_000);

  it("enacts a yes-or-no law at the state only, and it reaches renters", () => {
    const r = checkLaw(drawn, law(RENT), laws, "state");
    expect(r.change).toMatch(/^enacted at state \(law:US-MN:state:/);
    expect(r.reach.open).toBeGreaterThan(0);
  }, 75_000);

  it("changes the state government's own budget line, not the town's", () => {
    const r = checkLaw(drawn, law("budget-line:police"), lines, "state");
    expect(r.change).toMatch(/^US-MN police /);
  }, 75_000);
});
