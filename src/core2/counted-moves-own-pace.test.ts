/**
 * Counted places leave at their own pace (Pins family 29; owner: "Everything
 * comes from the simulation. Stop pegging things to real numbers."). Two
 * counted places in one state whose households are held differently (a
 * home owned, children at home) leave at different rates once their ages
 * are allowed for: nothing scales a place back to its state's average. And
 * how many leavers stay in their own state comes from the destination
 * weighing (the rest of the state is one more destination), so it differs
 * between a big state and a small one; it was the CPS share, 0.57, for
 * every state.
 *
 * Places are drawn from all 56 until one's state holds two counted places
 * whose holds differ; every place passed over is named. Set
 * GOLDEN_PATH_SEED to replay a draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { ageOn } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countryFlowsIn } from "./modules/macro";
import { stateOfCountedPlace } from "./modules/counted-moves";
import { residentsRuntime, townPlaceOf } from "./modules/residents";
import moveRows from "./data/moves/parameters.json" with { type: "json" };
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;
const MOVES = moveRows as unknown as Record<string, { value: number }>;

interface PlaceRead {
  placeId: string;
  people: number;
  /** People times their adults' yearly rate of leaving the state, by age alone. */
  ageRate: number;
  /** The same, each household times exp(-its holds): what its own causes give. */
  heldRate: number;
}

/** The day before a month's first, from a date. */
function dayBeforeNextFirst(date: string): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const next =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return addDays(makeIsoDate(next), -1);
}

/** Each counted place's people, age-only and held rates, as the month's weighing will read them on `date`. */
function placesOf(core: CoreState, date: string): Map<string, PlaceRead> {
  const api = coreAPI(core);
  const store = residentsRuntime(core)!.store;
  const adultAge = api.parameter("votingAge");
  const { states, flows } = countryFlowsIn(api);
  const out = new Map<string, PlaceRead>();
  for (const h of store.liveHouseholds()) {
    if (h.tenure === "group") continue;
    const people = store.weightedCount(h);
    if (!people) continue;
    const usps =
      stateOfCountedPlace(h.placeId) ??
      stateOfCountedPlace(townPlaceOf(core)!)!;
    const flow = flows[states.findIndex((st) => st.usps === usps)];
    if (!flow) continue;
    const ages = store
      .countedMembers(h)
      .map((m) => ageOn(store.born[m]!, date));
    const adults = ages.filter((a) => a >= adultAge);
    if (!adults.length) continue;
    const band = (a: number) => (a < 30 ? 0 : a < 45 ? 1 : a < 65 ? 2 : 3);
    const rate =
      adults.reduce((n, a) => n + flow.leavingByBand[band(a)]! * 12, 0) /
      adults.length;
    const hold =
      (h.tenure === "mortgage" || h.tenure === "other"
        ? MOVES.movesOwnerHold!.value
        : 0) +
      (ages.some((a) => a < adultAge) ? MOVES.movesChildrenHold!.value : 0);
    const row = out.get(h.placeId) ?? {
      placeId: h.placeId,
      people: 0,
      ageRate: 0,
      heldRate: 0,
    };
    row.people += people;
    row.ageRate += people * rate;
    row.heldRate += people * rate * Math.exp(-hold);
    out.set(h.placeId, row);
  }
  return out;
}

interface PullRow {
  id: string;
  people: number;
  moversPerMonth: number;
  inStatePerMonth?: number;
  place?: number;
}

/** The month's weighing by place: movers out of the state, all movers, in-state movers, and the place's conditions. */
function pullsByPlace(core: CoreState) {
  const api = coreAPI(core);
  const store = residentsRuntime(core)!.store;
  const placeOfGroup = new Map<string, string>();
  for (const group of store.groups) {
    const first = [...group.households][0];
    if (first !== undefined)
      placeOfGroup.set(group.id, store.households[first]!.placeId);
  }
  const out = new Map<
    string,
    { out: number; all: number; inState: number; place: number }
  >();
  for (const row of api
    .moduleState("core2-counted-moves-v1")
    .table("pulls")
    .rows() as unknown as PullRow[]) {
    const placeId = placeOfGroup.get(row.id);
    if (!placeId) continue;
    const held = out.get(placeId) ?? {
      out: 0,
      all: 0,
      inState: 0,
      place: row.place ?? 1,
    };
    // A weighing that does not say who stays in the state (main before
    // Pins family 29: a fixed share for every place) is read on all its movers.
    const inState = row.inStatePerMonth ?? Number.NaN;
    held.all += row.moversPerMonth;
    held.inState += inState;
    held.out += row.moversPerMonth - (row.inStatePerMonth ?? 0);
    out.set(placeId, held);
  }
  return out;
}

it("two counted places in one state leave at their own pace, and the share staying in their state differs by state", () => {
  const previous = setBookkeeping(false);
  try {
    const passed: string[] = [];
    const inStateByState: { usps: string; share: number; where: string }[] = [];
    let paced: string | undefined;
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "counted-moves-own-pace");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      // Read the households the day before the month's weighing, then let it run.
      advanceCore(core, dayBeforeNextFirst(core.date));
      const first = addDays(makeIsoDate(core.date), 1);
      const before = placesOf(core, first);
      advanceCore(core, first);
      const pulls = pullsByPlace(core);
      const usps = stateOfCountedPlace(townPlaceOf(core)!)!;
      // The share of the month's leavers who stay in the state, over every counted place.
      let all = 0,
        inState = 0;
      for (const row of pulls.values()) {
        all += row.all;
        inState += row.inState;
      }
      if (all > 0 && !inStateByState.some((row) => row.usps === usps))
        inStateByState.push({ usps, share: inState / all, where });
      if (paced) {
        if (inStateByState.length >= 2) break;
        continue;
      }
      // Two counted places in the state, each with people enough, whose holds differ.
      const rows = [...before.values()]
        .filter((row) => row.people >= 200 && pulls.has(row.placeId))
        .map((row) => ({ ...row, held: row.heldRate / row.ageRate }))
        .sort((a, b) => a.held - b.held);
      const a = rows[0],
        b = rows.at(-1);
      if (!a || !b || a === b || b.held / a.held < 1.08) {
        passed.push(
          `${where}: ${rows.length} counted places of 200 people or more${a && b && a !== b ? `, holds ${a.held.toFixed(3)} to ${b.held.toFixed(3)}` : ""}`,
        );
        continue;
      }
      // A is held more (owners, children): per person, after its ages, it
      // sends fewer out of the state, by its own holds and its conditions.
      const pa = pulls.get(a.placeId)!,
        pb = pulls.get(b.placeId)!;
      const paceA = pa.out / pa.place / a.ageRate,
        paceB = pb.out / pb.place / b.ageRate;
      const line = `${where}: ${a.placeId} holds ${a.held.toFixed(3)}, out-of-state pace ${paceA.toFixed(5)}; ${b.placeId} holds ${b.held.toFixed(3)}, pace ${paceB.toFixed(5)}; conditions ${pa.place.toFixed(3)} and ${pb.place.toFixed(3)}`;
      process.stdout.write(
        `own pace: ${line}; passed over ${passed.join("; ") || "none"}\n`,
      );
      expect(paceA, line).toBeLessThan(paceB);
      // The gap is the households' own holds, not a published rate: the
      // paces stand in the ratio their holds give.
      expect(paceA / paceB / (a.held / b.held), line).toBeCloseTo(1, 1);
      paced = line;
    }
    if (!paced)
      throw new Error(
        `no drawn place in ${DRAWS} had two counted places in its state whose holds differ: ${passed.join("; ")}`,
      );
    const shares = inStateByState
      .map((row) => `${row.usps} ${row.share.toFixed(3)} (${row.where})`)
      .join("; ");
    process.stdout.write(`in-state share by state: ${shares}\n`);
    expect(inStateByState.length, shares).toBeGreaterThanOrEqual(2);
    const [s1, s2] = inStateByState;
    expect(
      Number.isFinite(s1!.share) && Number.isFinite(s2!.share),
      shares,
    ).toBe(true);
    expect(Math.abs(s1!.share - s2!.share), shares).toBeGreaterThan(0.02);
  } finally {
    setBookkeeping(previous);
  }
}, 3_600_000);
