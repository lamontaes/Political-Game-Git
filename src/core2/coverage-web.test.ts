import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COVERAGE_MODULE_ID,
  type CountedCoverageRow,
  type CoverageRow,
} from "./modules/coverage";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import { webReach } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A recession raises the uninsured share of men, not women (Cawley, Moriya
// and Simon 2015): the coverage decision multiplies the uninsured part of its
// own rate by the web's factor for each worker (web-coverage-reads).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINK = "unemployment-to-uninsured";
const MEASURE = "health.uninsured-pct";

function heldBySex(core: CoreState) {
  const api = coreAPI(core);
  const out = { male: 0, female: 0 };
  const rows = api
    .moduleState(COVERAGE_MODULE_ID)
    .table("coverage")
    .rows() as unknown as CoverageRow[];
  for (const row of rows) {
    if (row.to !== null || row.plan !== "employer") continue;
    if (row.holderId !== row.personId) continue;
    const gender = core.people.get(row.personId)?.looks?.gender;
    if (gender === "male" || gender === "female") out[gender] += 1;
  }
  const rt = residentsRuntime(core);
  const counted = api
    .moduleState(COVERAGE_MODULE_ID)
    .table("countedCoverage")
    .rows() as unknown as CountedCoverageRow[];
  for (const row of counted) {
    if (row.to !== null || !rt) continue;
    const ix = rt.store.householdOf.get(row.householdId);
    const h = ix === undefined ? undefined : rt.store.households[ix];
    const m = rt.store.countedMember(row.holderId);
    if (!h || m === undefined) continue;
    const gender = rt.store.strings[rt.store.genderIx[m]!];
    if (gender === "male" || gender === "female")
      out[gender] += rt.store.weightOf(h);
  }
  return out;
}

it(`a rise in the unemployment link's effect leaves fewer men holding an employer plan and women unchanged, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `coverage-web:${attempt}`);
    const where = `${place.name} [${place.key}], seed ${seed}`;
    tried.push(where);
    const worlds = [0, 1].map(() =>
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }),
    );
    const year = Number(gameStartDate().slice(0, 4));
    // After the web's month row (the 3rd) and before the next review (the 1st).
    for (const { core } of worlds)
      advanceCore(core, makeIsoDate(`${year}-03-20`));
    const [control, treatment] = worlds as [
      (typeof worlds)[number],
      (typeof worlds)[number],
    ];
    const api = coreAPI(treatment.core);
    const months = api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [treatment.placeId]) as unknown as WebMonth[];
    const latest = [...months].sort((a, b) =>
      b.month.localeCompare(a.month),
    )[0];
    if (!latest) continue;
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .put({
        ...latest,
        effects: { ...latest.effects, [LINK]: 0.5 },
      } as unknown as Parameters<
        ReturnType<ReturnType<typeof api.moduleState>["table"]>["put"]
      >[0]);
    for (const { core } of worlds)
      advanceCore(core, makeIsoDate(`${year}-04-02`));
    const men = webReach(coreAPI(treatment.core), treatment.placeId, MEASURE, {
      sex: "male",
    });
    const women = webReach(
      coreAPI(treatment.core),
      treatment.placeId,
      MEASURE,
      {
        sex: "female",
      },
    );
    expect(men.recordId, `${where}: the web month it stands on`).toBe(
      latest.id,
    );
    expect(men.factor, `${where}: men`).toBeGreaterThan(1);
    expect(women.factor, `${where}: women`).toBe(1);
    const before = heldBySex(control.core);
    const after = heldBySex(treatment.core);
    if (before.male === 0) continue;
    expect(
      after.male,
      `${where}: men holding a plan, control ${before.male}`,
    ).toBeLessThan(before.male);
    // A woman's own slot does not move; a household's policy can pass to her
    // when her husband loses his, so women holding a plan can only rise.
    expect(
      after.female,
      `${where}: women holding a plan`,
    ).toBeGreaterThanOrEqual(before.female);
    return;
  }
  throw new Error(
    `no drawn place had working men with plans (${tried.join("; ")})`,
  );
}, 1_800_000);
