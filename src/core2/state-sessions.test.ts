// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { LawRowInput } from "./laws-starting";
import { advanceCore } from "./life";
import { lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { answerIn } from "./modules/world-legislating";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "state-sessions");

interface BillRow {
  readonly number: string;
  readonly bodyOfficeId: string;
  readonly status: string;
}

it(`every state sits for a year and its laws are its own, not the town's: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const start = world.core.date;
    advanceCore(world.core, addDays(makeIsoDate(start), 365));
    const api = coreAPI(world.core);
    const chain = lawChain(api);
    const laws = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[];
    const bills = api
      .moduleState("core2-legislature-v1")
      .table("bills")
      .rows() as unknown as BillRow[];
    // A law passed in play: a state's own row, dated on or after the opening.
    const passed = laws.filter(
      (row) =>
        row.jurisdiction.startsWith("US-") &&
        row.id.includes(":general:") &&
        row.id.split(":general:")[1]!.slice(0, 10) >= start,
    );
    const byState = new Map<string, LawRowInput[]>();
    for (const row of passed)
      byState.set(row.jurisdiction, [
        ...(byState.get(row.jurisdiction) ?? []),
        row,
      ]);
    expect(
      byState.size,
      `${drawn.name}, replay ${replay}: states that enacted a law`,
    ).toBeGreaterThanOrEqual(40);
    for (const [state, rows] of byState)
      for (const row of rows) {
        // Its own chamber's bill, decided by the governor: enacted or
        // overridden, never a bill from another government's body.
        const number = row.id.slice(row.id.lastIndexOf(":") + 1);
        const bill = bills.find(
          (b) =>
            b.number === number &&
            b.bodyOfficeId.startsWith(`office:${state}:`) &&
            ["enacted", "overridden"].includes(b.status),
        );
        expect(bill, `${row.id}: no enacted bill of ${state}`).toBeDefined();
        if (state === chain.stateKey) continue;
        // Elsewhere: that state's row moved, and none of the town's chain did.
        const question = row.series;
        expect(
          answerIn(api, state, question, true),
          `${row.id}: ${state}'s own answer`,
        ).not.toBeNull();
        for (const level of chain.levels) {
          const own = laws.filter(
            (r) => r.jurisdiction === level.jurisdiction && r.id === row.id,
          );
          expect(own, `${row.id} landed in ${level.jurisdiction}`).toEqual([]);
        }
      }
  } finally {
    setBookkeeping(true);
  }
}, 2_400_000);
