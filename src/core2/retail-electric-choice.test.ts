// @vitest-environment node
/** A state allowing retail electric choice cuts households' electricity spending for the years after it opens, and the cut fades (Su 2015). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore } from "./life";
import { billCatalog } from "./bill-catalog";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const QUESTION =
  "us-policy-positions:environment-energy.allow-retail-electric-choice";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** A place in a state where the research finds no residential choice at the start. */
const place = drawPlace(replay, "retail-electric-choice", (key) => {
  try {
    return lawChainForPlace(key).stateKey !== undefined;
  } catch {
    return false;
  }
});

it(
  `a state allowing retail electric choice cuts electricity prices by Su's 7 percent, fading over five years: ${place.name}, replay ${replay}`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const start = lawInForce(api, QUESTION);
      expect(start.value, "the research answers the question").not.toBeNull();
      expect(
        billCatalog(api, "state", lawChain(api).stateKey)
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .some((p) => "question" in p && p.question === QUESTION),
        "on the state's bill paper",
      ).toBe(true);
      if (start.value === 1) {
        process.stdout.write(
          `RETAIL-CHOICE ${place.name} (${place.key}, seed ${place.seed}): ${lawChain(api).stateKey} already allows retail electric choice (opened years ago, so its cut has faded); nothing to enact\n`,
        );
        return;
      }
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const rules = () =>
        api.moduleState("place-prices").table("rules").rows() as unknown as {
          cause: string;
          good: string;
          value: number;
        }[];
      const start0 = addDays(makeIsoDate(api.state.date), 1);
      enactLaw(api, {
        jurisdiction: state.jurisdiction,
        level: "state",
        series: QUESTION,
        value: 1,
        effectiveDate: start0,
        measureId: "retail-choice-test",
        citation: "Test: the state allows retail electric choice",
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 40));
      const open = rules().find((r) => r.cause.startsWith(`law:${QUESTION}:`));
      expect(open, "an electricity price rule from the law").toBeDefined();
      expect(open!.good).toBe("electricity");
      expect(open!.value).toBeLessThan(0);
      expect(open!.value).toBeGreaterThan(-0.07 - 1e-9);
      // The cut has run 39 days of its five years.
      const days =
        (Date.parse(api.state.date) - Date.parse(start0)) / 86_400_000;
      expect(open!.value).toBeCloseTo(-0.07 * (1 - days / 365.25 / 5), 2);
      process.stdout.write(
        `RETAIL-CHOICE ${place.name} (${place.key}, seed ${place.seed}): ${state.jurisdiction} allows retail electric choice from ${start0}; electricity price share ${open!.value.toFixed(4)} on ${api.state.date}\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
