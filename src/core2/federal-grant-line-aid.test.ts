// @vitest-environment node
/**
 * A bill that raises a federal grant line reaches the state's and the town's
 * treasuries by that line's part of their federal aid (pool item
 * laws-spending-lines-grants-reach-no-government, federal transportation).
 * Two worlds from one drawn place and seed: one where Congress's budget bill
 * raises federal transportation a fifth, carried as a passed bill carries it,
 * and one left alone. Production budgets and treasury closes run in both.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { treasuryMonthsOf } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, lawReach } from "./law-reach/applied";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-grant-line-aid");
const LINE = "transportation";
const MEASURE = "H.R. 9001 (federal transportation, test)";

const world = () => {
  const w = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  });
  return { w, api: coreAPI(w.core) };
};

it(`a raise in federal transportation reaches the state's and the town's treasuries: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const raised = world();
    const alone = world();
    const federal = governments(raised.api).find((g) => g.level === "federal")!;
    const budget = [...budgetsOf(raised.api, federal.id)].sort(
      (a, b) => b.fiscalYear - a.fiscalYear,
    )[0]!;
    const base = budget.spendingMinor[LINE]!;
    expect(base).toBeGreaterThan(0);
    const delta = Math.round(base / 5);
    expect(
      amendBudget(raised.api, {
        governmentId: federal.id,
        line: LINE,
        deltaMinor: delta,
        measureId: MEASURE,
        carry: true,
      }),
    ).not.toBeNull();
    const until = addDays(makeIsoDate(raised.api.state.date), 70);
    advanceCore(raised.w.core, until);
    advanceCore(alone.w.core, until);
    // Every lower government of the town's chain that receives federal aid.
    const lower = governments(raised.api).filter(
      (g) =>
        g.level !== "federal" &&
        treasuryMonthsOf(alone.api, g.id).some((m) => m.aidReceivedMinor > 0),
    );
    const received = (api: typeof raised.api, id: string) =>
      treasuryMonthsOf(api, id).reduce((n, m) => n + m.aidReceivedMinor, 0);
    const rows = lower.map((g) => ({
      government: g.id,
      level: g.level,
      raised: received(raised.api, g.id),
      alone: received(alone.api, g.id),
    }));
    // The state always receives federal aid; the town or county where it does.
    expect(rows.some((r) => r.level === "state")).toBe(true);
    for (const r of rows) expect(r.raised).toBeGreaterThan(r.alone);
    // The bill's own reach names those governments, with the dollars paid.
    const town = lawChain(raised.api).townPlaceId;
    const reach = lawReach(raised.api, MEASURE, town);
    expect(reach.governments).toBe(rows.length);
    const paid = rows.reduce((n, r) => n + r.raised - r.alone, 0);
    // The aid is money the bill moved to those governments, not a commitment
    // on their own record: what the bill paid them is the whole of what they
    // received over the world left alone (the base aid is unchanged).
    expect(reach.governmentOwnMinor).toBe(0);
    const toGovernments = appliedOn(raised.api, `budget-line:${LINE}`)
      .filter((r) => r.lawId === MEASURE && r.target === "government")
      .reduce((n, r) => n + r.amountMinor, 0);
    expect(toGovernments).toBe(paid);
    // The federal close charges the bill's aid to the transportation line.
    const lineAid = (api: typeof raised.api) =>
      treasuryMonthsOf(api, federal.id).reduce(
        (n, m) => n + (m.lines[LINE]?.aidMinor ?? 0),
        0,
      );
    expect(lineAid(raised.api)).toBeGreaterThan(lineAid(alone.api));
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        through: raised.w.core.date,
        raisedMinor: delta,
        governments: rows,
        reach: {
          governments: reach.governments,
          amountMinor: reach.amountMinor,
          toGovernmentsMinor: paid,
          records: reach.records,
        },
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 300_000);
