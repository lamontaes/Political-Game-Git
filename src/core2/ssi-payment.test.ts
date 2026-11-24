// @vitest-environment node
/** The federal SSI benefit rate decides what aged residents with low income are paid: a congressional cut to a dollar stops the payments. */
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

const SERIES = "ssi-federal-benefit-rate";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "ssi-payment");

it(
  `cutting the federal SSI rate stops what aged residents are paid: ${place.name}, replay ${replay}`,
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
      expect(start.value, "the 2026 rate is law at the start").toBe(994);
      expect(
        billCatalog(api, "federal", "US")
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .some((p) => "series" in p && p.series === SERIES),
        "on Congress's bill paper",
      ).toBe(true);
      // In the control world Congress cuts the rate to a dollar a month.
      const federal = lawChain(coreAPI(control)).levels.find(
        (l) => l.level === "federal",
      )!;
      enactLaw(coreAPI(control), {
        jurisdiction: federal.jurisdiction,
        level: "federal",
        series: SERIES,
        value: 1,
        unit: "USD/month",
        effectiveDate: addDays(makeIsoDate(control.date), 1),
        measureId: "ssi-rate-cut-test",
        citation: "Test: Congress cuts the SSI federal benefit rate",
      });
      const end = addDays(makeIsoDate(lawWorld.date), 70);
      advanceCore(lawWorld, end);
      advanceCore(control, end);
      const paid = (core: typeof control) =>
        appliedOn(coreAPI(core), SERIES).reduce((n, r) => n + r.amountMinor, 0);
      const withRate = paid(lawWorld);
      const without = paid(control);
      process.stdout.write(
        `SSI ${place.name} (${place.key}, seed ${place.seed}): rate ${start.value} a month; households paid ${withRate} minor units in all with it, ${without} with the rate cut to $1\n`,
      );
      if (withRate === 0) {
        process.stdout.write(
          `SSI ${place.name}: no aged resident had a low enough income; nothing to compare\n`,
        );
        return;
      }
      expect(withRate).toBeGreaterThan(without);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
