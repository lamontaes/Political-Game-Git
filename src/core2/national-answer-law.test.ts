/**
 * A question the research answers for the nation (and not for the state)
 * is a federal law row in force in every place, so every policy question has
 * a law in force (pool item laws-national-answer-to-state-question-unloaded).
 * Two places drawn from all 56.
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
  it(`every policy question has a law in force, the nation's where the state gives none (seed ${seed}:${draw})`, () => {
    setBookkeeping(false);
    try {
      const place = drawPlace(`${seed}:${draw}`, "national-answer");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const questions = Object.keys(POLICY_QUESTIONS);
      const without = questions.filter(
        (q) => lawInForce(api, q).governing === null,
      );
      expect(without, `${where}: questions with no law in force`).toEqual([]);
      const work = lawInForce(api, WORK);
      expect(
        work.levels.find((l) => l.level === "federal")?.row?.id,
        `${where}: the federal work-requirement row`,
      ).toBe(
        "law:US:federal:us-policy-positions:health-human-services.work-requirement-for-assistance:general:starting",
      );
    } finally {
      setBookkeeping(true);
    }
  }, 600_000);
}
