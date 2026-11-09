/**
 * The President acts by order through the one executive engine (Nation,
 * Nov 9; Coordinator's ruling: each series opens at the law in force on the
 * start date, and after that the sitting President decides by cause, the
 * weighing kept). Part one is natural: in a played world the sitting
 * President's weighing of each federal order is kept with their lean, their
 * view, the law now and what they did. Part two exercises the path that issues:
 * a left-leaning resident of the same world is the executive (a fixture for the
 * path only), the order becomes the federal law in force from the next day, and a sitting
 * President who opposes it revokes it at their next monthly weighing.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  federalOrderable,
  issueFederalOrder,
  orderDecisionOf,
  sittingPresidentId,
} from "./modules/executive";
import { leanOf } from "./modules/legislature";
import { lawInForce } from "./modules/laws";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const SERIES =
  "us-federal-positions:energy-environment.limit-power-plant-carbon";
const ORDER = "limit-power-plant-carbon";

describe(`the President's federal orders (seed ${seed})`, () => {
  it("keeps the sitting President's weighing of each order, from their own view and the law now", () => {
    const place = drawPlace(`${seed}:orders`, "core2-president-orders");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      settings: { population: 300 },
    });
    // The first of the next month: the President's monthly weighing.
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const term = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", ["seat:US:president", "serving"]) as unknown as {
        personId: string;
      }[]
    )[0]!;
    const decision = orderDecisionOf(api, term.personId, ORDER);
    expect(decision, "the President's weighing of the order").not.toBeNull();
    expect(federalOrderable()).toContain(ORDER);
    // The weighing is their own: their lean, their view, the law in force, and the scores for and against.
    expect(decision!.lean).toBe(leanOf(api, term.personId));
    expect(decision!.lawNow).toBe(lawInForce(api, SERIES).value === 1 ? 1 : 0);
    expect(decision!.scoreFor).toBe(Math.max(0, decision!.view));
    expect(decision!.scoreAgainst).toBe(Math.max(0, -decision!.view));
    // What they did follows the weighing: they act only where they want the law changed.
    expect(decision!.act).toBe(
      decision!.view > 0 && decision!.lawNow !== 1
        ? "issue"
        : decision!.view < 0 && decision!.lawNow === 1
          ? "revoke"
          : "keep",
    );
    process.stdout.write(
      `president orders (natural): ${place.name}, ${place.state} (seed ${seed}:orders); ${decision!.id}: lean ${decision!.lean.toFixed(3)}, view ${decision!.view.toFixed(3)} of ${decision!.analog}, law now ${decision!.lawNow}, for ${decision!.scoreFor.toFixed(3)} against ${decision!.scoreAgainst.toFixed(3)} -> ${decision!.act}\n`,
    );
  }, 600_000);

  it("is issued only by the person who holds the president's seat: a left-leaning President issues the order and the next, who opposes it, revokes it", () => {
    const place = drawPlace(`${seed}:orders-issue`, "core2-president-orders");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      settings: { population: 300 },
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const seat = () =>
      (
        terms.query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as {
          id: string;
          personId: string;
        }[]
      )[0]!;
    const original = seat();
    // Nobody else may issue it, whatever their views.
    const left = [...core.people.values()]
      .filter((p) => p.alive && p.id !== original.personId)
      .map((p) => ({ id: p.id, lean: leanOf(api, p.id) }))
      .sort((a, b) => a.lean - b.lean || a.id.localeCompare(b.id))[0]!;
    expect(() =>
      issueFederalOrder(api, { executiveId: left.id, order: ORDER }),
    ).toThrow("Only the sitting President issues a federal order.");
    expect(sittingPresidentId(api)).toBe(original.personId);
    // A world whose President leans left (the seat is held by the most left-leaning resident:
    // a fixture for the path, since every opening President leans right): the monthly weighing
    // issues the order on the first of the month, with the weighing kept.
    terms.put({ ...original, personId: left.id } as never);
    expect(sittingPresidentId(api)).toBe(left.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const orders = () =>
      api
        .moduleState("core2-executive-v1")
        .table("orders")
        .rows() as unknown as {
        id: string;
        executiveId: string;
        order: string;
        revoke: boolean;
        date: string;
        lawId: string;
      }[];
    const issued = orders().find(
      (o) => o.executiveId === left.id && o.order === ORDER && !o.revoke,
    );
    expect(issued, "the left-leaning President issued the order").toBeDefined();
    const weighing = orderDecisionOf(api, left.id, ORDER)!;
    expect(weighing.view).toBeGreaterThan(0);
    const law = lawInForce(api, SERIES);
    expect(law.value).toBe(1);
    expect(law.governing?.id).toBe(issued!.lawId);
    // The next President (the original, who opposes it) revokes it at their first monthly weighing.
    terms.put({ ...seat(), personId: original.personId } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 35));
    const revoked = orders().find(
      (o) =>
        o.executiveId === original.personId && o.order === ORDER && o.revoke,
    );
    const theirs = orderDecisionOf(api, original.personId, ORDER)!;
    expect(revoked, "the next President revoked it").toBeDefined();
    expect(lawInForce(api, SERIES).value).toBe(0);
    process.stdout.write(
      `president orders (issue): ${place.name}, ${place.state} (seed ${seed}:orders-issue); President ${left.id} lean ${left.lean.toFixed(3)} view ${weighing.view.toFixed(3)} issued ${issued!.id} -> ${issued!.lawId}; the next President ${original.personId} (decision ${theirs.id}: lean ${theirs.lean.toFixed(3)}, view ${theirs.view.toFixed(3)}) revoked it with ${revoked!.id}; law now ${lawInForce(api, SERIES).value}\n`,
    );
  }, 900_000);
});
