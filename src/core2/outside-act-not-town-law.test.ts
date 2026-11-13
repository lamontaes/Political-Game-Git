// @vitest-environment node
/** A law another state passes is that state's law: the town's outcome web must not read it as the town's own. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce, yesLevels } from "./modules/laws";
import { coreAPI } from "./state";

import type { CoreAPI } from "./types";
/** The law on a question for the town on a date, by the laws engine's one lookup: 1 when a level says yes. */
const lawSaysYes = (api: CoreAPI, series: string, date: string) =>
  yesLevels(api, series, date).length ? 1 : 0;

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
      const before = lawSaysYes(api, question, api.state.date);
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
      const after = lawSaysYes(api, question, api.state.date);
      process.stdout.write(
        `OUTSIDE-NOT-TOWN ${place.name} (${place.key}, seed ${place.seed}), home ${home}: ${other} passes ${question}; the web's reading of the town's law ${before} to ${after}\n`,
      );
      expect(after).toBe(before);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
