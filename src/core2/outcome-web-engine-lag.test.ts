/**
 * A link with a lag reads its cause as it stood after the lag. The property
 * tax rate is an engine reading, not a law row, so its history must not be
 * today's value: a rate raised in the opening month moves rent only after the
 * link's twelve months. Played in the bench world in a place drawn from all 56
 * on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.WEB_LAG_SEED ?? randomBytes(8).toString("hex");
const LINK = "property-tax-to-rent";
const DRAWS = 6;

it("a property tax raised in the opening month moves rent only after the link's lag", () => {
  const bookkeeping = setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(seed, `web-lag:${draw}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const core = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core as CoreState;
      const api = coreAPI(core);
      const base = lawInForce(api, "property-tax").value;
      const city = lawChain(api).levels.find((l) => l.level === "city");
      if (base === null || !city) {
        passed.push(`${where}: no city property tax`);
        continue;
      }
      enactLaw(api, {
        jurisdiction: city.jurisdiction,
        level: "city",
        series: "property-tax",
        value: base * 1.5 + 0.1,
        effectiveDate: addDays(makeIsoDate(core.date), 1),
        measureId: "web-lag-test",
        citation: "Web lag test: the rate raised",
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 200));
      const months = (
        api
          .moduleState(OUTCOME_WEB_MODULE_ID)
          .table("months")
          .rows() as unknown as WebMonth[]
      )
        .filter((m) => m.effects[LINK] !== undefined)
        .sort((a, b) => a.month.localeCompare(b.month));
      if (!months.length) {
        passed.push(`${where}: the web kept no ${LINK} effect`);
        continue;
      }
      // Within the lag no row may show the raised rate's effect.
      const early = months.filter((m) => Math.abs(m.effects[LINK]!) > 1e-9);
      process.stdout.write(
        `WEB-LAG (WEB_LAG_SEED=${seed}) ${where}: ${months.length} rows with ${LINK}; ${early.length} nonzero within 200 days (${early.map((m) => `${m.id} ${m.effects[LINK]}`).join(", ") || "none"}). Passed over: ${passed.join("; ") || "none"}\n`,
      );
      expect(
        early.map((m) => m.id),
        `${where}: moved before the lag`,
      ).toEqual([]);
      return;
    }
    throw new Error(`No draw kept the link: ${passed.join("; ")}`);
  } finally {
    setBookkeeping(bookkeeping);
  }
}, 1_800_000);
