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
    // The bill's own reach: the government rows it wrote, with the dollars paid.
    const applied = appliedOn(raised.api, `budget-line:${LINE}`).filter(
      (r) => r.lawId === MEASURE && r.target === "government",
    );
    // Every lower government of the town's chain that receives federal aid
    // directly from the bill. A county that is paid only by its state (Lluveras,
    // Puerto Rico: the county's 708,014 cents are the same in both worlds) is
    // not a recipient of the federal line and has no row.
    const lower = governments(raised.api).filter(
      (g) =>
        g.level !== "federal" &&
        treasuryMonthsOf(alone.api, g.id).some((m) => m.aidReceivedMinor > 0) &&
        applied.some((r) => r.targetId === g.id),
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
    // The aid is money the bill moved to those governments, not a commitment
    // on their own record. The state is paid by the federal treasury alone, so
    // what the bill paid it is exactly what it received over the world left
    // alone. A county or town is paid by the federal treasury and by the state,
    // and the state, with more federal money, has more cash to pass on to it
    // (its payments follow its cash), so it receives the bill's dollars in full
    // and the state's own change besides.
    expect(reach.governmentOwnMinor).toBe(0);
    const appliedTo = (id: string) =>
      applied
        .filter((r) => r.targetId === id)
        .reduce((n, r) => n + r.amountMinor, 0);
    for (const r of rows) {
      const gain = r.raised - r.alone;
      if (r.level === "state") expect(gain).toBe(appliedTo(r.government));
      else expect(gain).toBeGreaterThanOrEqual(appliedTo(r.government));
    }
    const toGovernments = applied.reduce((n, r) => n + r.amountMinor, 0);
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
          toGovernmentsMinor: toGovernments,
          records: reach.records,
        },
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 300_000);

it(`a cut in federal transportation takes aid away, and putting it back restores it: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const cut = world();
    const alone = world();
    const federal = governments(cut.api).find((g) => g.level === "federal")!;
    const budget = [...budgetsOf(cut.api, federal.id)].sort(
      (a, b) => b.fiscalYear - a.fiscalYear,
    )[0]!;
    const delta = Math.round(budget.spendingMinor[LINE]! / 5);
    const CUT = "H.R. 9003 (federal transportation cut, test)";
    const BACK = "H.R. 9004 (federal transportation restored, test)";
    expect(
      amendBudget(cut.api, {
        governmentId: federal.id,
        line: LINE,
        deltaMinor: -delta,
        measureId: CUT,
        carry: true,
      }),
    ).not.toBeNull();
    const cutUntil = addDays(makeIsoDate(cut.api.state.date), 40);
    advanceCore(cut.w.core, cutUntil);
    advanceCore(alone.w.core, cutUntil);
    // The cut's own reach names each government, with the aid it no longer sends.
    const cutRows = appliedOn(cut.api, `budget-line:${LINE}`).filter(
      (r) => r.lawId === CUT && r.target === "government",
    );
    // Lower governments the federal line pays directly: a county paid only by
    // its state has no row and receives the same in both worlds.
    const lower = governments(cut.api).filter(
      (g) =>
        g.level !== "federal" &&
        treasuryMonthsOf(alone.api, g.id).some((m) => m.aidReceivedMinor > 0) &&
        cutRows.some((r) => r.targetId === g.id),
    );
    const received = (api: typeof cut.api, id: string, from = ""): number =>
      treasuryMonthsOf(api, id)
        .filter((m) => m.date > from)
        .reduce((n, m) => n + m.aidReceivedMinor, 0);
    expect(lower.some((g) => g.level === "state")).toBe(true);
    for (const g of lower)
      expect(received(cut.api, g.id)).toBeLessThan(received(alone.api, g.id));
    expect([...new Set(cutRows.map((r) => r.targetId))].sort()).toEqual(
      lower.map((g) => g.id).sort(),
    );
    for (const r of cutRows) expect(r.amountMinor).toBeLessThan(0);
    // Putting the line back: from the next close on, each government
    // receives what the world left alone does, and the cut's reach ends.
    expect(
      amendBudget(cut.api, {
        governmentId: federal.id,
        line: LINE,
        deltaMinor: delta,
        measureId: BACK,
        carry: true,
      }),
    ).not.toBeNull();
    const backOn = cut.w.core.date;
    const backUntil = addDays(makeIsoDate(backOn), 40);
    advanceCore(cut.w.core, backUntil);
    advanceCore(alone.w.core, backUntil);
    // The state is paid by the federal treasury alone, so from the next close
    // on it receives exactly what the world left alone does. A county or town
    // also follows the state's cash, which is still catching up, so for it the
    // gap to the world left alone is smaller than it was while the line was cut.
    for (const g of lower) {
      const after =
        received(cut.api, g.id, backOn) - received(alone.api, g.id, backOn);
      if (g.level === "state") expect(after).toBe(0);
      else {
        const during =
          received(alone.api, g.id) -
          received(alone.api, g.id, cutUntil) -
          (received(cut.api, g.id) - received(cut.api, g.id, cutUntil));
        expect(Math.abs(after)).toBeLessThan(during);
      }
    }
    for (const r of appliedOn(cut.api, `budget-line:${LINE}`).filter(
      (row) => row.lawId === CUT && row.target === "government",
    ))
      expect(r.endedOn).not.toBeNull();
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        cutMinor: -delta,
        governments: lower.map((g) => ({
          government: g.id,
          cutPeriodAid:
            received(cut.api, g.id) - received(cut.api, g.id, cutUntil),
          alonePeriodAid:
            received(alone.api, g.id) - received(alone.api, g.id, cutUntil),
        })),
        cutRows: cutRows.map((r) => [r.targetId, r.amountMinor]),
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 300_000);
