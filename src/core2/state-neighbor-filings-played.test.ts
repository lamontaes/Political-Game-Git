// @vitest-environment node
/** The town's state legislature sits a session with and without the neighbor-law pull: with it, more of what members file is what the neighbors already have. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import parameters from "./data/campaigns/parameters.json";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import {
  legislativeSessionsOf,
  neighborPull,
} from "./modules/world-legislating";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TRIES = 8;
const weight = (
  parameters as unknown as { parameters: Record<string, { value: number }> }
).parameters.neighborLawWeight!;

function firstSessionFilings(
  place: ReturnType<typeof drawPlace>,
  value: number,
) {
  const saved = weight.value;
  weight.value = value;
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const state = lawChain(api).stateKey;
    for (let day = 0; day < 420; day += 30) {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 30));
      const filings = legislativeSessionsOf(api)
        .filter((s) => s.jurisdiction === state)
        .flatMap((s) => s.filings);
      if (filings.length)
        return {
          filings: filings.map((f) => ({
            question: f.question,
            direction: f.direction,
            pull: neighborPull(api, f.question, f.direction, state),
          })),
        };
    }
    return { filings: [] };
  } finally {
    weight.value = saved;
  }
}

it(
  `the state legislature files more of what its neighbors have when the pull is on (replay ${replay})`,
  { timeout: 3_600_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    const passed: string[] = [];
    try {
      for (let attempt = 0; attempt < TRIES; attempt += 1) {
        const place = drawPlace(replay, `neighbor-filings:${attempt}`);
        const where = `${place.name} (${place.key}, seed ${place.seed})`;
        const off = firstSessionFilings(place, 0);
        const on = firstSessionFilings(place, weight.value);
        if (!off.filings.length || !on.filings.length) {
          passed.push(`${where}: no filings in 14 months`);
          continue;
        }
        const share = (r: typeof on) =>
          r.filings.filter((f) => f.pull > 0).length / r.filings.length;
        process.stdout.write(
          `NEIGHBOR-FILINGS ${where}: filings that match the neighbors: pull off ${(100 * share(off)).toFixed(0)}% of ${off.filings.length}; pull on ${(100 * share(on)).toFixed(0)}% of ${on.filings.length}. Passed over: ${passed.join("; ") || "none"}\n`,
        );
        expect(share(on)).toBeGreaterThanOrEqual(share(off));
        return;
      }
      throw new Error(`No place showed a session: ${passed.join("; ")}`);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
