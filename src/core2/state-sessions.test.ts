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
import { answerIn, rollCallOf } from "./modules/world-legislating";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "state-sessions");

it(`other states change the law in force, with a count, and nothing lands in the town: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
    const api = coreAPI(world.core);
    const chain = lawChain(api);
    const laws = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[];
    // A law another government passed in the played year: one row with its
    // counts, under its own state's key.
    const passed = laws.filter(
      (row) =>
        typeof row.terms?.session === "string" && row.jurisdiction !== "US",
    );
    const byState = new Map<string, LawRowInput[]>();
    for (const row of passed)
      byState.set(row.jurisdiction, [
        ...(byState.get(row.jurisdiction) ?? []),
        row,
      ]);
    expect(
      byState.size,
      `${drawn.name}, replay ${replay}: states that changed a law`,
    ).toBeGreaterThanOrEqual(40);
    for (const [state, rows] of byState)
      for (const row of rows) {
        expect(row.id, row.id).toContain(`law:${state}:state:`);
        expect(String(row.terms?.chambers), row.id).toMatch(
          /^\d+-\d+(\/\d+-\d+)*$/,
        );
        expect(["signed", "overridden"], row.id).toContain(row.terms?.decision);
        expect(answerIn(api, state, row.series, true), row.id).not.toBeNull();
        // It is that state's row, never one of the town's.
        for (const level of chain.levels)
          expect(
            laws.filter(
              (r) => r.jurisdiction === level.jurisdiction && r.id === row.id,
            ),
            `${row.id} landed in ${level.jurisdiction}`,
          ).toEqual([]);
      }
    // Nothing was kept per bill, member or event for another government.
    const bills = api
      .moduleState("core2-legislature-v1")
      .table("bills")
      .rows() as unknown as { bodyOfficeId: string }[];
    for (const state of byState.keys())
      if (state !== chain.stateKey)
        expect(
          bills.filter((b) => b.bodyOfficeId.startsWith(`office:${state}:`)),
          `${state} kept bill rows`,
        ).toEqual([]);
    // The roll call is built on demand: the same twice, and it adds up to the count.
    const outside = [...byState].find(([state]) => state !== chain.stateKey)!;
    const law = outside[1][0]!;
    const counts = String(law.terms!.chambers).split("/");
    for (const [index, count] of counts.entries()) {
      const [yes, no] = count.split("-").map(Number) as [number, number];
      const first = rollCallOf(api, law.id, index)!;
      const again = rollCallOf(api, law.id, index)!;
      expect(again, `${law.id} chamber ${index}`).toEqual(first);
      expect(first.yes.length, `${law.id} yes`).toBe(yes);
      expect(first.no.length, `${law.id} no`).toBe(no);
      expect(first.yes.filter((k) => first.no.includes(k))).toEqual([]);
      expect(first.sponsor, `${law.id} sponsor`).toBe(first.yes[0] ?? null);
    }
  } finally {
    setBookkeeping(true);
  }
}, 2_400_000);
