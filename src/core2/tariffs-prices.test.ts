// @vitest-environment node
/**
 * Congress raising tariffs raises the prices businesses charge through the
 * outcome web's household-prices link (tariffs-to-prices, lag a year). Two
 * copies of one world differ only by the tariff law: where the world opens
 * with tariffs not raised Congress raises them in one, and where its history
 * opened it with them raised Congress repeals them in the other.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { webFactorFor } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const QUESTION = "us-federal-positions:trade.raise-tariffs";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "tariffs-prices");

it(
  `Congress raising tariffs raises what businesses charge: ${place.name}, replay ${replay}`,
  { timeout: 3_000_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        }).core;
      const lawWorld = build();
      const control = build();
      const api = coreAPI(lawWorld);
      const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
      // The history from 1925 may open the world with tariffs already raised.
      // Then the control world is the one Congress changes, by repealing them,
      // so the law world is still the one with raised tariffs.
      const opened = lawInForce(api, QUESTION).value === 1;
      enactLaw(opened ? coreAPI(control) : api, {
        jurisdiction: federal.jurisdiction,
        level: "federal",
        series: QUESTION,
        value: opened ? 0 : 1,
        effectiveDate: addDays(makeIsoDate(lawWorld.date), 1),
        measureId: "tariffs-test",
        citation: opened
          ? "Test: Congress repeals the raised tariffs"
          : "Test: Congress raises tariffs",
      });
      // The link's lag is a year; run past it.
      const end = addDays(makeIsoDate(lawWorld.date), 16 * 30);
      advanceCore(lawWorld, end);
      advanceCore(control, end);
      const town = lawChain(api).townPlaceId;
      const factor = (core: CoreState) =>
        webFactorFor(coreAPI(core), town, "household.prices");
      const prices = (core: CoreState) => {
        const out = new Map<string, number>();
        for (const [id, book] of core.finance.businesses)
          out.set(id, book.price / book.anchorPrice);
        return out;
      };
      const withLaw = prices(lawWorld);
      const without = prices(control);
      const ratios = [...withLaw]
        .filter(([id]) => without.has(id))
        .map(([id, price]) => price / without.get(id)!);
      const mean = ratios.reduce((n, r) => n + r, 0) / (ratios.length || 1);
      process.stdout.write(
        `TARIFFS ${place.name} (${place.key}, seed ${place.seed}): web factor on household prices ${factor(control).toFixed(4)} without, ${factor(lawWorld).toFixed(4)} with; ${ratios.length} businesses' prices ${mean.toFixed(4)} times the control's on average; ${opened ? "tariffs raised at the opening, repealed in the control" : "tariffs raised in the law world"}\n`,
      );
      expect(factor(lawWorld)).toBeGreaterThan(factor(control));
      expect(ratios.length).toBeGreaterThan(0);
      expect(mean).toBeGreaterThan(1);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
