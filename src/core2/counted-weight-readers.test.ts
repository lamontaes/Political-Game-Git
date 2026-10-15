/** One model, two tiers: the readers of a counted people count read each household's weight. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { countedDepositTargets } from "./credit-deposits";
import { gameStartDate } from "./game-start";
import { housingStatusCounts } from "./housing-homeless";
import { townFacts } from "./law-reach/group-b-people";
import { lawChain } from "./modules/laws";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import { townConcernShare } from "./modules/meetings";
import { residentsRuntime } from "./modules/residents";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";

const SCALE = 3;
const QUESTION =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";

function openTown(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  // The counted groups' funds open on the first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const rt = residentsRuntime(core)!;
  return { core, api, town, rt, store: rt.store };
}

type Town = ReturnType<typeof openTown>;

function countedPlain(t: Town): number {
  let n = 0;
  for (const h of t.store.liveHouseholds())
    if (h.placeId === t.town) n += t.store.countedCount(h);
  return n;
}

function monthOfPulls(t: Town) {
  for (let day = 0; day < 45; day++) {
    advanceCore(t.core, addDays(makeIsoDate(t.core.date), 1));
    const rows = t.api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table("pulls")
      .rows() as unknown as {
      id: string;
      people: number;
      moversPerMonth: number;
    }[];
    if (rows.length) return new Map(rows.map((row) => [row.id, row]));
  }
  return new Map<
    string,
    { id: string; people: number; moversPerMonth: number }
  >();
}

it("every counted people reader returns the unscaled figure times the scale", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "census-readers");
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  const base = openTown(draw.seed, draw.key);
  const scaled = openTown(draw.seed, draw.key, SCALE);
  const plain = countedPlain(base);
  expect(plain, where).toBeGreaterThan(0);

  // Homeless counts: housed people are everyone the records count, minus those without a home.
  const housedBase = housingStatusCounts(base.api, base.town).housed;
  const housedScaled = housingStatusCounts(scaled.api, scaled.town).housed;
  expect(housedScaled - housedBase, where).toBeCloseTo(plain * (SCALE - 1), 6);

  // Credit deposit groups: each record takes its weight's cost buffer. (The cash a group holds is the
  // money item's: core-census-weight-money.)
  const targets = (t: Town) =>
    new Map(
      countedDepositTargets(t.api, t.town, 1, 30).map((row) => [
        row.holderId,
        row,
      ]),
    );
  const before = targets(base);
  const after = targets(scaled);
  expect(before.size, where).toBeGreaterThan(0);
  expect(after.size, where).toBe(before.size);
  for (const [id, row] of before) {
    expect(
      after.get(id)!.reserveMinor,
      `${where} ${id}`,
    ).toBeGreaterThanOrEqual(row.reserveMinor * SCALE - 1);
    expect(after.get(id)!.reserveMinor, `${where} ${id}`).toBeLessThanOrEqual(
      row.reserveMinor * SCALE + 1,
    );
  }

  // Law reach residents: one counted record stands for its weight of residents.
  const factsBase = townFacts(base.api, base.town);
  const factsScaled = townFacts(scaled.api, scaled.town);
  expect(factsScaled.modeled - factsBase.modeled, where).toBeCloseTo(
    plain * (SCALE - 1),
    6,
  );
  const countedStands = factsScaled.residents
    .filter((r) => !r.named)
    .reduce((n, r) => n + (r.standsFor ?? 1), 0);
  expect(countedStands, where).toBeCloseTo(plain * SCALE, 6);

  // The meetings roll: a counted resident counts as many times as their record stands for, so the
  // share a question touches moves from the named people's toward the counted residents'.
  const concern = (t: Town) => townConcernShare(t.api, QUESTION);
  const low = concern(base);
  const mid = concern(scaled);
  const high = concern(openTown(draw.seed, draw.key, 1000));
  expect(mid, where).toBeGreaterThanOrEqual(Math.min(low, high) - 1e-9);
  expect(mid, where).toBeLessThanOrEqual(Math.max(low, high) + 1e-9);

  // Districts: uniform weights place every household where the unscaled town does.
  for (const h of base.store.liveHouseholds()) {
    const twin = scaled.store.households[scaled.store.householdOf.get(h.id)!]!;
    expect(twin.district, `${where} ${h.id}`).toBe(h.district);
  }

  // Moves: the monthly pull reads each town group's people times the scale. The movers it makes due
  // do too, within the little the state's remaining coarse people shift when the town's count grows.
  const pullsBase = monthOfPulls(base);
  const pullsScaled = monthOfPulls(scaled);
  expect(pullsBase.size, where).toBeGreaterThan(0);
  let townGroups = 0;
  for (const [id, row] of pullsBase) {
    const twin = pullsScaled.get(id);
    expect(twin, `${where} group ${id}`).toBeDefined();
    const factor = id.includes(scaled.town) ? SCALE : 1;
    if (factor === SCALE) townGroups++;
    expect(twin!.people, `${where} group ${id}`).toBeCloseTo(
      row.people * factor,
      6,
    );
    expect(
      Math.abs(twin!.moversPerMonth / (row.moversPerMonth * factor) - 1),
      `${where} group ${id}`,
    ).toBeLessThan(0.02);
  }
  expect(townGroups, where).toBeGreaterThan(0);
}, 900_000);
