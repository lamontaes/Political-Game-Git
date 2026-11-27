/**
 * A question the research answers for the nation (and not for the state)
 * supplies a federal fallback in today's-law mode. In the simulated century,
 * the state legislature supplies this state policy question instead.
 * Both modes still answer every question in two places drawn from all 56.
 * Pool item laws-national-answer-to-state-question-unloaded.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawInForce } from "./modules/laws";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";

for (const draw of [0, 1]) {
  it(`every policy question has a law in force in both opening modes (seed ${seed}:${draw})`, () => {
    setBookkeeping(false);
    try {
      const place = drawPlace(`${seed}:${draw}`, "national-answer");
      for (const history of ["century", "today"] as const) {
        const where = `${place.name} (${place.key}), seed ${place.seed}, history ${history}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
          settings: { history },
        });
        const api = coreAPI(core);
        const questions = Object.keys(POLICY_QUESTIONS);
        const without = questions.filter(
          (q) => lawInForce(api, q).governing === null,
        );
        expect(without, `${where}: questions with no law in force`).toEqual([]);
        const work = lawInForce(api, WORK);
        const federal = work.levels.find((l) => l.level === "federal");
        const state = work.levels.find((l) => l.level === "state");
        expect(federal, `${where}: federal level`).toBeDefined();
        expect(state, `${where}: state level`).toBeDefined();
        if (history === "today") {
          expect(federal!.row?.id, `${where}: the federal research row`).toBe(
            `law:US:federal:${WORK}:general:starting`,
          );
          expect(federal!.row?.value, where).toBe(1);
        } else {
          expect(
            federal!.row,
            `${where}: no century federal mandate`,
          ).toBeNull();
          expect(state!.row?.id, where).toBe(
            `law:${place.state}:state:${WORK}:general:starting`,
          );
          expect(work.governing?.id, where).toBe(state!.row?.id);
        }
      }
    } finally {
      setBookkeeping(true);
    }
  }, 600_000);
}
