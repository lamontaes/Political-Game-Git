// @vitest-environment node
/** A state legislator's reason to carry a change rises with the bordering states that already have it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import stateReach from "./data/places/state-reach.json";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignParameter, PLATFORM_QUESTIONS } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import {
  filerOf,
  filingReason,
  neighborPull,
} from "./modules/world-legislating";
import { members, FEDERAL_HOUSE } from "./modules/legislature";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "state-neighbor-law-pull");

it(
  `the states next door pull a state's legislators toward the same law: ${place.name}, replay ${replay}`,
  { timeout: 600_000 },
  () => {
    setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const state = lawChain(api).stateKey;
      const borders = (
        stateReach as unknown as {
          states: Record<string, { borders: string[] }>;
        }
      ).states[state.replace(/^US-/, "")]!.borders;
      const pulls = PLATFORM_QUESTIONS.map((q) => ({
        q,
        enact: neighborPull(api, q, 1, state),
        repeal: neighborPull(api, q, -1, state),
      }));
      // A change and its undoing pull opposite ways, each within -1 to 1.
      for (const p of pulls) {
        expect(p.enact).toBeCloseTo(-p.repeal, 12);
        expect(Math.abs(p.enact)).toBeLessThanOrEqual(1);
      }
      // A state with neighbors has some question they answer.
      if (borders.length) expect(pulls.some((p) => p.enact !== 0)).toBe(true);
      else expect(pulls.every((p) => p.enact === 0)).toBe(true);
      // The pull enters a member's reason at the researched weight.
      const moved = pulls.find((p) => p.enact !== 0);
      if (moved) {
        const member = members(api, FEDERAL_HOUSE)[0]!;
        const f = filerOf(api, member);
        const law = { settled: 0, reluctance: 0 };
        const base = filingReason(api, f, moved.q, 1, law);
        const pulled = filingReason(api, f, moved.q, 1, {
          ...law,
          neighbors: moved.enact,
        });
        expect(pulled - base).toBeCloseTo(
          campaignParameter("neighborLawWeight") * moved.enact,
          12,
        );
        process.stdout.write(
          `NEIGHBORS ${place.name} (${place.key}, seed ${place.seed}), state ${state} borders ${borders.join(" ")}: ${pulls.filter((p) => p.enact !== 0).length} of ${pulls.length} platform questions answered by neighbors; e.g. ${moved.q} pull ${moved.enact.toFixed(2)}\n`,
        );
      }
    } finally {
      setBookkeeping(true);
    }
  },
);
