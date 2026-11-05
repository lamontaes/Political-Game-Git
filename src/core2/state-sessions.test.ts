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
    // A law passed in play starts from a bill of that state's own chamber that
    // the governor signed or the legislature overrode; its law row is the
    // state's own, under the state's key and the bill's number.
    const enactedBills = bills.filter((bill) =>
      ["enacted", "overridden"].includes(bill.status),
    );
    const byState = new Map<string, { bill: BillRow; law: LawRowInput }[]>();
    for (const bill of enactedBills) {
      const state = /^office:(US-[A-Z]{2}):/.exec(bill.bodyOfficeId)?.[1];
      if (!state) continue;
      const law = laws.find(
        (row) =>
          row.jurisdiction === state && row.id.endsWith(`:${bill.number}`),
      );
      expect(
        law,
        `${bill.bodyOfficeId} ${bill.number}: no law row under ${state}`,
      ).toBeDefined();
      byState.set(state, [...(byState.get(state) ?? []), { bill, law: law! }]);
    }
    expect(
      byState.size,
      `${drawn.name}, replay ${replay}: states that enacted a law`,
    ).toBeGreaterThanOrEqual(40);
    for (const [state, passed] of byState) {
      if (state === chain.stateKey) continue;
      for (const { law } of passed) {
        // Elsewhere: that state's row moved, and none of the town's chain did.
        expect(
          answerIn(api, state, law.series, true),
          `${law.id}: ${state}'s own answer`,
        ).not.toBeNull();
        for (const level of chain.levels)
          expect(
            laws.filter(
              (row) =>
                row.jurisdiction === level.jurisdiction && row.id === law.id,
            ),
            `${law.id} landed in ${level.jurisdiction}`,
          ).toEqual([]);
      }
    }
  } finally {
    setBookkeeping(true);
  }
}, 2_400_000);
