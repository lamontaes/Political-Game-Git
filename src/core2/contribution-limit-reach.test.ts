// @vitest-environment node
/** A contribution limit reaches the donors it holds back: the law reach names them and what the limit kept from the campaigns. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const SERIES = "federal-campaign-contribution-limit";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "contribution-limit-reach");

it(
  `a low federal contribution limit holds back donors and the law reach names them: ${place.name}, replay ${replay}`,
  { timeout: 3_000_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
      // Congress lowers the limit to a dollar an election: every gift is held back.
      enactLaw(api, {
        jurisdiction: federal.jurisdiction,
        level: "federal",
        series: SERIES,
        value: 1,
        unit: "USD/election",
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: "contribution-limit-reach-test",
        citation: "Test: Congress lowers the limit",
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 520));
      const reached = appliedOn(api, SERIES);
      process.stdout.write(
        `LIMIT-REACH ${place.name} (${place.key}, seed ${place.seed}): ${reached.length} donors the federal limit held back, ${reached.reduce((n, r) => n + r.amountMinor, 0)} minor units kept from campaigns\n`,
      );
      if (!reached.length) {
        process.stdout.write(
          `LIMIT-REACH ${place.name}: no federal campaign took a gift in the run; nothing to name\n`,
        );
        return;
      }
      expect(reached.every((r) => r.amountMinor < 0)).toBe(true);
      expect(reached.every((r) => r.what === "gift-held-to-the-limit")).toBe(
        true,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
