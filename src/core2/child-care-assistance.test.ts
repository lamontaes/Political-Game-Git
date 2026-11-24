// @vitest-environment node
/** A state's child care income limit decides which working families' children the state pays a subsidy for: lowering the limit cuts what the families are paid. */
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

const SERIES = "child-care-income-limit";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "child-care-assistance");

it(
  `lowering a state's child care income limit cuts what eligible families are paid: ${place.name}, replay ${replay}`,
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
        unit: "USD/month",
        effectiveDate: addDays(makeIsoDate(control.date), 1),
        measureId: "child-care-limit-cut-test",
        citation: "Test: the state cuts its child care income limit",
      });
      const end = addDays(makeIsoDate(lawWorld.date), 70);
      advanceCore(lawWorld, end);
      advanceCore(control, end);
      const paid = (core: typeof control) =>
        appliedOn(coreAPI(core), SERIES).reduce((n, r) => n + r.amountMinor, 0);
      const withLimit = paid(lawWorld);
      const without = paid(control);
      process.stdout.write(
        `CHILD-CARE ${place.name} (${place.key}, seed ${place.seed}): limit ${start.value} a month for a family of three; households paid ${withLimit} minor units in all with it, ${without} with the limit cut to $1\n`,
      );
      if (withLimit === 0) {
        process.stdout.write(
          `CHILD-CARE ${place.name}: no working family under the limit had a child under 13; nothing to compare\n`,
        );
        return;
      }
      expect(withLimit).toBeGreaterThan(without);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
