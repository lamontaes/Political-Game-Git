import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { readUnemploymentGap } from "./modules/jobs";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

// The jobs engine reads unemployment against the world's own normal rate
// (the macro month row's naturalUnemploymentPct), not a published 4.5%.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the jobless gap moves with the world's own normal rate, seed ${seed}`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "jobless-gap-normal-rate");
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  // Two copies of the same world; only the world's normal rate differs.
  const gapWithNormal = (normal: number) => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const latest = (
      api.moduleState("macro").table("state").get("macro:state") as {
        latestMonth: string;
      }
    ).latestMonth;
    const months = api.moduleState("macro").table("months");
    const row = months.get(`macro-month:${latest}`) as object;
    months.put({ ...row, naturalUnemploymentPct: normal } as never);
    return readUnemploymentGap(api, lawChain(api).townPlaceId);
  };
  // A normal rate 2 points higher makes the same jobless rate a gap 2 points smaller.
  expect(gapWithNormal(4.5) - gapWithNormal(6.5), where).toBeCloseTo(2, 6);
}, 900000);
