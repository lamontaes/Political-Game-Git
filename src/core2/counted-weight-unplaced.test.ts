/** One model, two tiers: the unplaced workers' pay and the groups' savings stand for as many households as the town's weight says. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { fundBalance } from "./counted-money";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;

function open(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  const rt = residentsRuntime(core)!;
  const unplaced = [...rt.flows.values()]
    .filter((flow) => flow.id.startsWith("residents:unplaced-wages:"))
    .reduce((n, flow) => n + flow.amountMinor, 0);
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const api = coreAPI(core);
  let fund = 0,
    people = 0;
  for (const group of rt.store.groups.keys())
    fund += fundBalance(api, rt, group);
  for (const h of rt.store.liveHouseholds())
    people += rt.store.weightedCount(h);
  return { unplaced, fund, people };
}

it("pays the unplaced workers for as many households as the town's weight says, and keeps the groups' savings with them", () => {
  // A town with unplaced workers pays them three times as much at three times
  // the size; some places open without any, so draw again until one has them.
  const tried: string[] = [];
  let draw = drawPlace(randomBytes(32).toString("hex"), "census-unplaced");
  let base = open(draw.seed, draw.key);
  while (base.unplaced <= 0 && tried.length < 8) {
    tried.push(`${draw.name} (${draw.key}, seed ${draw.seed})`);
    draw = drawPlace(randomBytes(32).toString("hex"), "census-unplaced");
    base = open(draw.seed, draw.key);
  }
  const where = `seed ${draw.seed}, ${draw.name} (${draw.key})`;
  expect(
    base.unplaced,
    `no unplaced workers in ${tried.join(", ")}`,
  ).toBeGreaterThan(0);
  const big = open(draw.seed, draw.key, SCALE);
  expect(big.unplaced / base.unplaced, where).toBeGreaterThan(SCALE * 0.9);
  expect(big.unplaced / base.unplaced, where).toBeLessThan(SCALE * 1.1);
  // Savings per person stay in the same range as the town grows: they are not
  // paid out to the bank as if they were one household's, nor left unfunded.
  const perPerson = (row: typeof base) => row.fund / row.people;
  expect(perPerson(big) / perPerson(base), where).toBeGreaterThan(0.5);
  expect(perPerson(big) / perPerson(base), where).toBeLessThan(2);
}, 900_000);
