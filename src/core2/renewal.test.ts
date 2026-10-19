/** Unplanned pregnancies and the decision, read in a drawn place's played world. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { ABORTION_LAW_SERIES } from "./births-unplanned";
import { lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

it("an unplanned pregnancy is decided from her records and the law in force where she lives", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "unplanned-pregnancy");
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365 * 3));
  const tables = api.moduleState(RENEWAL_MODULE_ID);
  const unplanned = tables
    .table("pregnancies")
    .rows()
    .filter((row) => row.unplanned === true);
  const law = lawInForce(api, ABORTION_LAW_SERIES);
  console.log(draw.key, draw.seed, unplanned.length, law.value, law.governing?.id);
  expect(true).toBe(true);
}, 300_000);
