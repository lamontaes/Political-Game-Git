// @vitest-environment node
/** A law another state passes is that state's law: the town's outcome web must not read it as the town's own. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../../../src/core2/campaign-data";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import {
  enactLaw,
  lawChain,
  lawInForce,
} from "../../../src/core2/modules/laws";
import { lawValue } from "../../../src/core2/modules/outcome-web";
import { coreAPI } from "../../../src/core2/state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "outside-act-not-town-law");

it(
  `a bordering state's act does not become the town's law in the web: ${place.name}, replay ${replay}`,
  { timeout: 600_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const home = lawChain(api).stateKey;
      const other = ["US-TX", "US-CA", "US-NY", "US-OH"].find(
        (s) => s !== home,
      )!;
      // A question the home town's law says no to, that the other state then passes.
      const question = PLATFORM_QUESTIONS.find(
        (q) => lawInForce(api, q).value === 0,
      );
      if (!question) {
        process.stdout.write(
          `OUTSIDE-NOT-TOWN ${place.name} (${place.key}, seed ${place.seed}): every platform question is already yes at home; nothing to test\n`,
        );
        return;
      }
      const before = lawValue(api, question, api.state.date);
      enactLaw(api, {
        jurisdiction: other,
        level: "state",
        series: question,
        value: 1,
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: "outside-act-test",
        citation: "Test: another state passes the law",
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 3));
      const after = lawValue(api, question, api.state.date);
      process.stdout.write(
        `OUTSIDE-NOT-TOWN ${place.name} (${place.key}, seed ${place.seed}), home ${home}: ${other} passes ${question}; the web's reading of the town's law ${before} to ${after}\n`,
      );
      expect(after).toBe(before);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
