/**
 * A household that moves changes a count, not the number of records. A drawn
 * place is played 24 months; every month the money journal balances, the
 * records of households that moved in stay in two kinds per template (waiting
 * for a home, housed), and the place's household records never pass three
 * times the opening count plus the households the player has met. Compared
 * against the same world before records took weights (people and adults by
 * place within one household, households within one) in the Fable report of
 * Nov 10: this test holds the invariants on the branch alone.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import {
  growCountedHousehold,
  moveArrivedHouseholds,
  residentsRuntime,
  shrinkCountedHousehold,
} from "./modules/residents";
import { fundBalance, peopleInGroup } from "./counted-money";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const MONTHS = 24;

it(`households that move change weights, not the number of records (seed ${seed})`, () => {
  const place = drawPlace(seed, "moves-change-weights");
  const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const state = core as CoreState;
  const rt = residentsRuntime(state)!;
  const cash = () => {
    let total = 0;
    for (const row of state.people.values()) total += row.liquidMinor;
    for (const row of state.organizations.values()) total += row.liquidMinor;
    return total;
  };
  const outside = () => {
    let net = 0;
    for (const row of state.cashJournal.externalFlowsByOwner.values())
      net += row.netMinor;
    return net;
  };
  const openingCash = cash(),
    openingOutside = outside();
  const opening = [...rt.store.liveHouseholds()].length;
  const [year, month] = state.date.split("-").map(Number) as [number, number];
  const counts: number[] = [opening];
  const housing = coreAPI(state).moduleState("housing");
  const stockOf = () =>
    housing.table("stock").rows() as unknown as {
      rentalUnits: number;
      vacantRental: number;
    }[];
  const heldUnits = () => {
    let n = 0;
    for (const row of housing.table("occupancy").rows() as unknown as {
      householdId: string;
    }[]) {
      const h = rt.arrived.root.has(row.householdId)
        ? rt.store.liveHousehold(row.householdId)
        : undefined;
      n += h ? Math.ceil(rt.store.weightOf(h)) : 1;
    }
    return n;
  };
  const occupiedAt = () =>
    stockOf().reduce((n, r) => n + r.rentalUnits - r.vacantRental, 0);
  const openOccupied = occupiedAt(),
    openHeld = heldUnits();
  const moves = coreAPI(state).moduleState(COUNTED_MOVES_MODULE_ID);
  const yearLines: string[] = [];
  for (let i = 1; i <= MONTHS; i++) {
    const t = Math.floor((month - 1 + i) / 12),
      mo = ((month - 1 + i) % 12) + 1;
    advanceCore(
      state,
      makeIsoDate(`${year + t}-${String(mo).padStart(2, "0")}-01`),
    );
    const records = [...rt.store.liveHouseholds()].length;
    counts.push(records);
    const at = `month ${i} (${state.date}) in ${where}`;
    expect(
      openingCash - (outside() - openingOutside) - cash(),
      `the money journal is off, ${at}`,
    ).toBe(0);
    const allowed = 3 * opening + rt.filledIn.size;
    expect(
      records,
      `${records} household records pass ${allowed} (3 x ${opening} opening + ${rt.filledIn.size} met), ${at}`,
    ).toBeLessThanOrEqual(allowed);
    // Households that moved in are kept as at most a waiting and a housed
    // record per template, each a count of at least one household.
    const kept = new Map<string, number>();
    for (const [id, root] of rt.arrived.root) {
      // A record the player met or that left another way is forgotten at the
      // next month's arrivals.
      const h = rt.store.liveHousehold(id);
      if (!h) continue;
      expect(
        rt.store.weightOf(h),
        `arrived record ${id}, ${at}`,
      ).toBeGreaterThan(0);
      kept.set(root, (kept.get(root) ?? 0) + 1);
    }
    for (const [root, n] of kept)
      expect(
        n,
        `template ${root} keeps ${n} arrived records, ${at}`,
      ).toBeLessThanOrEqual(2);
    if (i % 12 === 0) {
      let waiting = 0,
        housedNow = 0;
      for (const id of rt.arrived.root.keys()) {
        const h = rt.store.liveHousehold(id);
        if (h && h.tenure === "other") waiting += rt.store.weightOf(h);
        else if (h) housedNow += rt.store.weightOf(h);
      }
      const rows = moves.table("moves").rows() as unknown as {
        direction: string;
      }[];
      const inRows = rows.filter((r) => r.direction === "in").length,
        outRows = rows.filter((r) => r.direction === "out").length;
      // Rental units: what the stock says is occupied has moved by what the
      // occupancy rows now hold (a unit per household of an arrived record,
      // one for any other row): no unit is taken twice or lost.
      const gap = occupiedAt() - openOccupied - (heldUnits() - openHeld);
      yearLines.push(
        `year ${i / 12}: ${Math.round(waiting)} households wait for a home and ${Math.round(housedNow)} are housed, in arrived records; moves rows so far ${inRows} in, ${outRows} out; rental units off by ${gap}`,
      );
      expect(
        Math.abs(gap),
        `rental units off by ${gap}, ${at}`,
      ).toBeLessThanOrEqual(
        Math.max(2, Math.ceil(0.02 * Math.abs(occupiedAt() - openOccupied))),
      );
    }
  }
  // Money follows weight: a change of weight makes or loses no money for the
  // households that stay. The group's money per household before and after.
  const perHousehold = (group: number) =>
    peopleInGroup(rt, group) > 0
      ? fundBalance(rt.api!, rt, group) / peopleInGroup(rt, group)
      : 0;
  const heavy = [...rt.arrived.root.keys()]
    .map((id) => rt.store.liveHousehold(id))
    .find((h) => h && rt.store.weightOf(h) >= 3 && h.tenure === "other");
  expect(
    heavy,
    `no waiting record of three households (${where})`,
  ).toBeDefined();
  const group = heavy!.group;
  const before = perHousehold(group);
  growCountedHousehold(state, heavy!.id, 2);
  shrinkCountedHousehold(state, heavy!.id, 1);
  const after = perHousehold(group);
  expect(
    Math.abs(after - before),
    `money per person moved from ${before} to ${after} (${where})`,
  ).toBeLessThanOrEqual(1 + before * 1e-6);
  const w = rt.store.weightOf(heavy!);
  moveArrivedHouseholds(state, heavy!.id, 1, "landlord-check");
  expect(rt.store.weightOf(heavy!)).toBe(w - 1);
  expect(
    openingCash - (outside() - openingOutside) - cash(),
    `the money journal is off after weight changes (${where})`,
  ).toBe(0);
  process.stdout.write(`${yearLines.join("\n")}\n`);
  process.stdout.write(
    `MOVES CHANGE WEIGHTS ${where}: household records by month from the opening: ${counts.join(" ")}; arrived records kept at the end ${rt.arrived.root.size}\n`,
  );
  expect(
    rt.arrived.root.size,
    `no household moved in (${where})`,
  ).toBeGreaterThan(0);
}, 3_600_000);
