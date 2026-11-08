// @vitest-environment node
/** A law a bordering state passes in play, not only its researched starting law, pulls the home state's legislators toward the same law. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import stateReach from "./data/places/state-reach.json";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { answerIn, neighborPull } from "./modules/world-legislating";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "outside-state-act-pulls-neighbor");

it(
  `a bordering state's act moves the pull on the home state's legislators: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const home = lawChain(api).stateKey;
      const borders = (
        stateReach as unknown as {
          states: Record<string, { borders: string[] }>;
        }
      ).states[home.replace(/^US-/, "")]!.borders.map((u) => `US-${u}`);
      if (!borders.length) {
        process.stdout.write(
          `OUTSIDE-ACT ${place.name} (${place.key}, seed ${place.seed}): ${home} has no bordering state; nothing to compare\n`,
        );
        return;
      }
      // A question a bordering state answers no today, that the home state can still act on.
      const target = borders
        .flatMap((state) =>
          PLATFORM_QUESTIONS.filter((q) => answerIn(api, state, q) === -1).map(
            (q) => ({ state, q }),
          ),
        )
        .at(0);
      if (!target) {
        process.stdout.write(
          `OUTSIDE-ACT ${place.name} (${place.key}, seed ${place.seed}): no bordering state answers a platform question no; nothing to enact\n`,
        );
        return;
      }
      const before = neighborPull(api, target.q, 1, home);
      // The bordering state's legislature passes it (the row an outside session writes).
      enactLaw(api, {
        jurisdiction: target.state,
        level: "state",
        series: target.q,
        value: 1,
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: "outside-act-test",
        citation: "Test: a bordering state passes the law",
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 3));
      const after = neighborPull(api, target.q, 1, home);
      process.stdout.write(
        `OUTSIDE-ACT ${place.name} (${place.key}, seed ${place.seed}): ${target.state} passes ${target.q}; the pull on ${home}'s legislators toward it ${before.toFixed(3)} to ${after.toFixed(3)} (${borders.length} bordering states)\n`,
      );
      expect(after).toBeGreaterThan(before);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
