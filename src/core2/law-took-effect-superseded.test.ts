/**
 * A scheduled law row that a repeal enacted over it never governs, so no
 * "law took effect" record is made for it (pool item
 * laws-took-effect-for-row-not-in-force). The recorded world: Aberdeen, Ohio
 * (3900142), whose state wage ended by statute on April 28, 2025 and whose
 * starting law holds rows dated January 1, 2026; and a place drawn from all
 * 56 where a scheduled row is overridden by a statute.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import type { ModuleRow } from "./module-data";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`no took-effect record for a scheduled row a repeal overrides, Aberdeen Ohio (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld("ce3235656174370b:ohio", gameStartDate(), {
      twoLevel: true,
      placeKey: "3900142",
    });
    const api = coreAPI(core);
    advanceCore(core, makeIsoDate("2026-01-03"));
    const wage = lawInForce(api, "minimum-wage", "2026-01-02");
    const state = wage.levels.find((l) => l.level === "state")?.row;
    // The state wage is the repeal, not the January 2026 rows.
    expect(state?.value, "the state level in force on 2026-01-02").toBe(0);
    const events = [...core.eventIds].filter((id) =>
      id.startsWith(
        "law-took-effect:law:US-OH:state:minimum-wage:general:2026-01-01",
      ),
    );
    expect(events, "took-effect records for the overridden 2026 rows").toEqual(
      [],
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);

it(`a statute enacted over a scheduled row leaves no took-effect record for the row (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(seed, "took-effect-superseded");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const today = core.date;
    const day = (n: number) => addDays(makeIsoDate(today), n);
    // A scheduled rise in ten days, and a statute enacted over it, in force
    // from the day after the opening.
    // A starting-law row (not an enactment) dated ten days on, as openLaws
    // schedules them, and a statute enacted over it, in force from tomorrow.
    const lawsTable = api.moduleState(LAWS_MODULE_ID).table("laws");
    const scheduled = {
      id: "law:US:federal:minimum-wage:general:test-scheduled",
      jurisdiction: "US",
      level: "federal",
      series: "minimum-wage",
      tier: "general",
      value: 2500,
      unit: "minor/hour",
      effectiveDate: day(10),
      endDate: null,
      source: "test",
      retrieved: today,
      estimate: false,
    };
    lawsTable.put(scheduled as unknown as ModuleRow);
    api.moduleCalendar(LAWS_MODULE_ID).schedule({
      key: `effect:${scheduled.id}`,
      date: scheduled.effectiveDate,
      kind: "law-takes-effect",
      source: {
        tag: "SOURCED",
        citation: "test",
        asOf: today,
      },
      sourceRecordIds: [scheduled.id],
    });
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: "minimum-wage",
      value: 800,
      effectiveDate: day(1),
      measureId: "TEST-OVERRIDE",
      citation: "A statute over it.",
    });
    advanceCore(core, day(12));
    expect(
      core.eventIds.has(`law-took-effect:${scheduled.id}`),
      `${where}: took-effect for the overridden row ${scheduled.id}`,
    ).toBe(false);
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
