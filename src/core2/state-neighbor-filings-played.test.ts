// @vitest-environment node
/** A state legislature sits one session with and without the neighbor-law pull: it files more of the changes its neighbors already have. */
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
  neighborPull,
  sessionsOf,
  type SessionRecord,
} from "./modules/world-legislating";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TRIES = 6;
const weights = (
  parameters as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters;

function firstSession(place: ReturnType<typeof drawPlace>, weight: number) {
  const row = weights.neighborLawWeight!;
  const saved = row.value;
  row.value = weight;
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const state = lawChain(api).stateKey;
    for (let day = 0; day < 420; day += 30) {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 30));
      const sessions = sessionsOf(api).filter(
        (s: SessionRecord) => s.stateKey === state && s.bills.length > 0,
      );
      if (sessions.length) return { api, state, sessions };
    }
    return { api, state, sessions: [] as SessionRecord[] };
  } finally {
    row.value = saved;
  }
}

it(
  `a state legislature files more of what its neighbors have when the pull is on (replay ${replay})`,
  { timeout: 3_600_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    const passed: string[] = [];
    try {
      for (let attempt = 0; attempt < TRIES; attempt += 1) {
        const place = drawPlace(replay, `neighbor-filings:${attempt}`);
        const where = `${place.name} (${place.key}, seed ${place.seed})`;
        const off = firstSession(place, 0);
        const on = firstSession(place, weights.neighborLawWeight!.value);
        if (!off.sessions.length || !on.sessions.length) {
          passed.push(`${where}: no state session with bills in 14 months`);
          continue;
        }
        const aligned = (r: typeof on) => {
          const bills = r.sessions.flatMap((s) => s.bills);
          const agree = bills.filter(
            (b) =>
              neighborPull(
                r.api,
                b.question,
                b.change === "enact" ? 1 : -1,
                r.state,
              ) > 0,
          ).length;
          return { bills: bills.length, agree };
        };
        const a = aligned(off),
          b = aligned(on);
        if (!a.bills || !b.bills) {
          passed.push(`${where}: no bills filed`);
          continue;
        }
        process.stdout.write(
          `NEIGHBOR-FILINGS ${where}: pull off ${a.agree} of ${a.bills} filed bills match the neighbors (${((100 * a.agree) / a.bills).toFixed(0)}%); pull on ${b.agree} of ${b.bills} (${((100 * b.agree) / b.bills).toFixed(0)}%). Passed over: ${passed.join("; ") || "none"}\n`,
        );
        expect(b.agree / b.bills).toBeGreaterThanOrEqual(a.agree / a.bills);
        return;
      }
      throw new Error(`No place showed a session: ${passed.join("; ")}`);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
