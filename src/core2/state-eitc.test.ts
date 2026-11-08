// @vitest-environment node
/** A state's earned income tax credit percent decides what the state pays working households: repealing it stops the payments. */
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

const SERIES = "state-eitc-percent";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "state-eitc");

it(
  `repealing a state's earned income tax credit stops what working households are paid: ${place.name}, replay ${replay}`,
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
      if (!start.value) {
        process.stdout.write(
          `STATE-EITC ${place.name}: the state has no earned income tax credit; nothing to compare\n`,
        );
        return;
      }
      expect(
        billCatalog(api, "state", lawChain(api).stateKey)
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .some((p) => "series" in p && p.series === SERIES),
        "on the state's bill paper",
      ).toBe(true);
      // In the control world the state's legislature repeals the credit.
      const state = lawChain(coreAPI(control)).levels.find(
        (l) => l.level === "state",
      )!;
      enactLaw(coreAPI(control), {
        jurisdiction: state.jurisdiction,
        level: "state",
        series: SERIES,
        value: 0,
        unit: "percent-of-federal-credit",
        effectiveDate: addDays(makeIsoDate(control.date), 1),
        measureId: "eitc-cut-test",
        citation: "Test: the state repeals its earned income tax credit",
      });
      const end = addDays(makeIsoDate(lawWorld.date), 70);
      advanceCore(lawWorld, end);
      advanceCore(control, end);
      const paid = (core: typeof control) =>
        appliedOn(coreAPI(core), SERIES).reduce((n, r) => n + r.amountMinor, 0);
      const withLimit = paid(lawWorld);
      const without = paid(control);
      process.stdout.write(
        `STATE-EITC ${place.name} (${place.key}, seed ${place.seed}): limit ${start.value} percent of the federal credit; households paid ${withLimit} minor units in all with it, ${without} with the credit repealed\n`,
      );
      if (withLimit === 0) {
        process.stdout.write(
          `STATE-EITC ${place.name}: no household earned a state credit here (the state has none or no one qualifies); nothing to compare\n`,
        );
        return;
      }
      expect(withLimit).toBeGreaterThan(without);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
