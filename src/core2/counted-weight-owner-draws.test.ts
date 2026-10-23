/**
 * One model, two tiers (pool item world-census-weight-owner-draws): the draws
 * counted owners take from their businesses, per resident of the town, do not
 * fall as the town is opened at a multiple of its sample. A drawn place opened
 * twice from the same seed, once as a sample and once with every counted
 * household standing for three, played for 62 days.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;
const DAYS = 62;

function play(seed: string, key: string, countScale: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  let draws = 0;
  const ids: string[] = [];
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const id = String(entry.sourceRef.id);
    if (id.startsWith("owner-draw:")) {
      // What leaves the business: the owner's draw, counted or full.
      for (const row of entry.postings)
        if (row.deltaMinor < 0) draws -= row.deltaMinor;
      if (ids.length < 3) ids.push(id);
    }
    return post(entry);
  };
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  // People the town stands for: full people plus counted members times weights.
  let residents = core.people.size;
  for (const h of rt.store.liveHouseholds())
    residents += rt.store.countedMembers(h).length * rt.store.weightOf(h);
  return { draws, residents, ids };
}

it("owner draws per resident hold up when counted households stand for several", () => {
  const draw = drawPlace(
    randomBytes(32).toString("hex"),
    "census-weight-owner-draws",
  );
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const base = play(draw.seed, draw.key, 1);
  const scaled = play(draw.seed, draw.key, SCALE);
  const perBase = base.draws / base.residents;
  const perScaled = scaled.draws / scaled.residents;
  console.log(
    `DRAWS ${where} base ${perBase.toFixed(2)} scaled ${perScaled.toFixed(2)} ratio ${(perScaled / perBase).toFixed(3)} ids ${scaled.ids.join(", ")}`,
  );
  expect(base.draws, where).toBeGreaterThan(0);
  expect(perScaled / perBase, where).toBeGreaterThan(0.75);
  expect(perScaled / perBase, where).toBeLessThan(1.25);
}, 900_000);
