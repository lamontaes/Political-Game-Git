/**
 * Measure numbers repeat across bodies and sessions, so two bills can enact
 * the same series on the same date under the same number. Each bill's row
 * keeps its own id and its own day on the calendar; a bill's second provision
 * for the same series and date replaces its first. (Before, the second
 * enactment threw "Duplicate institutional calendar key" in the middle of a
 * floor week.) Played world, place and seed named in every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { LAWS_MODULE_ID, enactLaw, lawInForce } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("two bills with one number keep two law rows, and one bill's repeat is one row", () => {
  const place = drawPlace(seed, "enact-law-ids");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
  const state = api.state.date;
  const effectiveDate = addDays(makeIsoDate(state), 30);
  const jurisdiction = place.state;
  const enact = (bill: string, value: number) =>
    enactLaw(api, {
      jurisdiction,
      level: "state",
      series: "minimum-wage",
      value,
      unit: "minor/hour",
      effectiveDate,
      measureId: "HB 1",
      citation: "fixture bill",
      terms: { enactedByBill: bill },
    });
  const first = enact("bill:a", 1500);
  const other = enact("bill:b", 1600);
  const again = enact("bill:a", 1700);
  expect(other.id, where).not.toBe(first.id);
  expect(again.id, where).toBe(first.id);
  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  ).filter((r) => r.terms?.enactedBy === "HB 1");
  expect(rows.map((r) => r.value).sort(), where).toEqual([1600, 1700]);
  // Both rows take effect on their day without a duplicate calendar key.
  advanceCore(api.state as never, addDays(makeIsoDate(state), 45));
  expect(
    lawInForce(api, "minimum-wage", effectiveDate).value,
    where,
  ).toBeGreaterThan(0);
}, 600_000);
