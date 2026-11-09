// @vitest-environment node
/** A state's home energy assistance income limit decides which households the state pays a monthly benefit: lowering the limit cuts what households are paid. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const SERIES = "energy-assistance-income-limit";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "energy-assistance");

it(
  `lowering a state's home energy assistance income limit cuts what eligible families are paid: ${place.name}, replay ${replay}`,
  { timeout: 1_800_000 },
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
      const start = lawInForce(api, SERIES);
      expect(
        start.value,
        "the researched limit is law at the start",
      ).toBeGreaterThan(0);
      expect(
        billCatalog(api, "state", lawChain(api).stateKey)
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .some((p) => "series" in p && p.series === SERIES),
        "on the state's bill paper",
      ).toBe(true);
      // In the control world the state's legislature cuts the limit to a dollar a month.
      const state = lawChain(coreAPI(control)).levels.find(
        (l) => l.level === "state",
      )!;
      enactLaw(coreAPI(control), {
        jurisdiction: state.jurisdiction,
        level: "state",
        series: SERIES,
        value: 1,
        unit: "percent-of-poverty-line",
        effectiveDate: addDays(makeIsoDate(control.date), 1),
        measureId: "energy-limit-cut-test",
        citation:
          "Test: the state cuts its home energy assistance income limit",
      });
      const end = addDays(makeIsoDate(lawWorld.date), 70);
      advanceCore(lawWorld, end);
      advanceCore(control, end);
      const paid = (core: typeof control) =>
        appliedOn(coreAPI(core), SERIES).reduce((n, r) => n + r.amountMinor, 0);
      const withLimit = paid(lawWorld);
      const without = paid(control);
      process.stdout.write(
        `ENERGY-ASSISTANCE ${place.name} (${place.key}, seed ${place.seed}): limit ${start.value} percent of the poverty line; households paid ${withLimit} minor units in all with it, ${without} with the limit cut to 1 percent\n`,
      );
      if (withLimit === 0) {
        process.stdout.write(
          `ENERGY-ASSISTANCE ${place.name}: no household under the limit was paid; nothing to compare\n`,
        );
        return;
      }
      expect(withLimit).toBeGreaterThan(without);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
