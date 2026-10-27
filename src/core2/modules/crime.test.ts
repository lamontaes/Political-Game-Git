/**
 * Victimization records, played in the bench world in a place drawn from all
 * 56 on a seed nobody chose. Two worlds are built the same way from the same
 * seed and place; in the second the town's unemployment rate is raised three
 * points in the economy's month row (written on the 2nd, read by the web on
 * the 3rd), so the web's factor on burglary, robbery and assault moves and
 * the records on the 4th follow it. A world with nothing shifted proves the
 * test can fail: its factor is one.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { residentsRuntime } from "./residents";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./outcome-web";
import { WORLD_METRICS_MODULE_ID } from "./world-metrics";
import {
  CRIME_EVENT,
  crimeChange,
  crimeMonths,
  householdExposure,
  personExposure,
  type CrimeMonth,
} from "./crime";
import { WEB_LINKS } from "../outcome-web-model";
import type { CoreState } from "../types";

const seed = process.env.CRIME_SEED || randomBytes(8).toString("hex");
/** Three months of records: the first on the opening's first 4th, then two more. */
const DAYS = 80;
const SHIFT_POINTS = 3;
/** Households of each tenure a town needs for a group comparison to mean anything. */
const MIN_HOUSEHOLDS = 20;
const MAX_DRAWS = 5;

const openWorld = (placeKey: string) =>
  buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey });

/** Counted households of a world, renting and not renting. */
function tenureCounts(core: CoreState) {
  const store = residentsRuntime(core)!.store;
  let renting = 0,
    owning = 0;
  for (const group of store.groups)
    for (const index of group.households) {
      const household = store.households[index]!;
      if (household.gone) continue;
      if (group.tenure === "rent") renting += store.weightOf(household);
      else owning += store.weightOf(household);
    }
  return { renting, owning };
}

/**
 * The place for this seed: the first draw with enough renting and owning
 * households to compare. A town with a handful of renters can realize no
 * renter victimization in three months, whatever the engine owes them.
 */
function drawTown() {
  const seen: string[] = [];
  for (let attempt = 0; attempt < MAX_DRAWS; attempt += 1) {
    const place = drawPlace(
      seed,
      attempt ? `crime-victimization:${attempt}` : "crime-victimization",
    );
    const world = openWorld(place.key);
    const { renting, owning } = tenureCounts(world.core);
    if (renting >= MIN_HOUSEHOLDS && owning >= MIN_HOUSEHOLDS)
      return { place, world };
    seen.push(
      `${place.name} ${place.state} (${renting} renting, ${owning} owning)`,
    );
  }
  throw new Error(
    `No town with ${MIN_HOUSEHOLDS} renting and ${MIN_HOUSEHOLDS} owning households in ${MAX_DRAWS} draws from seed ${seed}: ${seen.join("; ")}`,
  );
}
const { place, world: openedControl } = drawTown();

function play(shifted: boolean) {
  const opening = gameStartDate();
  const world = shifted ? openWorld(place.key) : openedControl;
  const core = world.core;
  const api = coreAPI(core);
  let day = makeIsoDate(opening);
  const end = addDays(day, DAYS);
  let firstRowDay: string | null = null;
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    // The economy's month row is written on the 2nd; the web reads it on the
    // 3rd. The first row is the baseline, so the shift begins after it.
    if (day.endsWith("-02")) {
      firstRowDay ??= day;
      if (shifted && day !== firstRowDay) {
        const table = api.moduleState(WORLD_METRICS_MODULE_ID).table("months");
        for (const row of table.rows() as unknown as Record<
          string,
          unknown
        >[]) {
          if (!String(row.date).startsWith(day.slice(0, 7))) continue;
          if (typeof row.unemploymentRate !== "number") continue;
          table.put({
            ...row,
            unemploymentRate: row.unemploymentRate + SHIFT_POINTS / 100,
          } as never);
        }
      }
    }
  }
  return { core, api };
}

const webRow = (core: CoreState, id: string) =>
  coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .get(id) as unknown as WebMonth;
const rowsOf = (world: ReturnType<typeof play>) =>
  crimeMonths(world.api, world.core.visiblePlaceIds.values().next().value!);

describe(`victimization records (${place.name}, ${place.state}, seed ${seed})`, () => {
  const control = play(false);
  const shifted = play(true);

  it("writes a record per place-month with counts, reports and a log record per full household", () => {
    const rows = rowsOf(control);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    let fullVictims = 0;
    for (const row of rows) {
      expect(row.webRecordId, row.id).toMatch(/^web:/);
      expect(row.households, row.id).toBeGreaterThan(0);
      for (const type of Object.keys(
        row.types,
      ) as (keyof CrimeMonth["types"])[]) {
        const t = row.types[type];
        expect(t.count).toBe(t.fullCount + t.countedCount);
        expect(t.reported).toBeLessThanOrEqual(t.count);
        // The count follows the expected count, to within what is carried.
        expect(Math.abs(t.count - t.expected)).toBeLessThan(
          1 + row.households * 0.01 + Math.sqrt(row.households),
        );
      }
      fullVictims += row.victims.length;
      for (const victim of row.victims) {
        const event = control.core.durableLog.get(victim.eventId);
        expect(event?.kind).toBe(CRIME_EVENT);
        expect(event?.facts?.webRecordId).toBe(row.webRecordId);
      }
    }
    expect(control.core.logByKind.get(CRIME_EVENT)?.size ?? 0).toBe(
      fullVictims,
    );
    // Crimes were expected at the NCVS scale: some happened in three months.
    expect(
      rows.reduce(
        (n, r) => n + Object.values(r.types).reduce((m, t) => m + t.count, 0),
        0,
      ),
    ).toBeGreaterThan(0);
  });

  it("moves burglary, robbery and assault by the researched size when unemployment rises", () => {
    const base = rowsOf(control).at(-1)!;
    const moved = rowsOf(shifted).at(-1)!;
    expect(moved.month).toBe(base.month);
    // The web moved: its link effects are non-zero in the shifted world, zero in the control.
    const web = webRow(shifted.core, moved.webRecordId!);
    const was = webRow(control.core, base.webRecordId!);
    const sizes = {
      burglary: "unemployment-to-burglary",
      robbery: "unemployment-to-robbery",
      assault: "unemployment-to-assault",
    } as const;
    for (const [type, key] of Object.entries(sizes)) {
      // The control's own unemployment drifts a little; the shift adds to it.
      expect(web.effects[key]!, key).toBeGreaterThan(was.effects[key] ?? 0);
      const link = WEB_LINKS.find((l) => l.key === key)!;
      // The record's expected count is the control's times the factor the web moved.
      const ratio =
        moved.types[type as keyof typeof sizes].expected /
        base.types[type as keyof typeof sizes].expected;
      expect(
        ratio,
        `${type} expected count, ${moved.id} against ${base.id}`,
      ).toBeGreaterThan(1);
      // The record follows the factor the web wrote for the type (the unemployment link and any other link moving it).
      expect(ratio).toBeCloseTo(
        moved.types[type as keyof typeof sizes].factor /
          base.types[type as keyof typeof sizes].factor,
        1,
      );
      // Within the researched range (burglary 2 to 5 percent a point, three points).
      const [low, high] = link.range ?? [link.size! * 0.5, link.size! * 1.5];
      // The unemployment link's own rise, from the web's two month rows.
      const rise = (1 + web.effects[key]!) / (1 + (was.effects[key] ?? 0)) - 1;
      expect(rise).toBeGreaterThanOrEqual(low * SHIFT_POINTS * 0.9);
      expect(rise).toBeLessThanOrEqual(high * SHIFT_POINTS * 1.1);
    }
    // Property crime other than burglary does not move with unemployment.
    expect(
      moved.types["other-property"].expected /
        base.types["other-property"].expected,
    ).toBeCloseTo(1, 1);
    // More crimes happened to real households, not only on paper.
    const total = (r: CrimeMonth) =>
      Object.values(r.types).reduce((n, t) => n + t.expected, 0);
    expect(total(moved)).toBeGreaterThan(total(base));
  });

  it("victimizes renters and low-income households more than owners and high-income", () => {
    // Exposure ranks the household types as the BJS tables do.
    expect(householdExposure(0, "rent", "with-children")).toBeGreaterThan(
      householdExposure(4, "own", "adults") * 2,
    );
    expect(householdExposure(1, "rent", "adults")).toBeGreaterThan(
      householdExposure(1, "own", "adults"),
    );
    expect(personExposure(20, 0)).toBeGreaterThan(personExposure(70, 4));
    // And what the engine owes the counted groups follows it: the expected
    // property victimizations per household, from each group's own exposure
    // (the realized tallies in a small town are too few to rank).
    const store = residentsRuntime(control.core)!.store;
    const owedPerHome = (
      pick: (g: (typeof store.groups)[number]) => boolean,
    ) => {
      let owed = 0,
        homes = 0;
      for (const group of store.groups) {
        if (!pick(group)) continue;
        let n = 0;
        for (const index of group.households) {
          const household = store.households[index]!;
          if (!household.gone) n += store.weightOf(household);
        }
        homes += n;
        owed +=
          n *
          householdExposure(
            group.incomeBand,
            group.tenure === "rent" ? "rent" : "own",
            group.kind,
          );
      }
      return { homes, perHome: homes ? owed / homes : 0 };
    };
    const renters = owedPerHome((g) => g.tenure === "rent");
    const owners = owedPerHome((g) => g.tenure !== "rent");
    const poor = owedPerHome((g) => g.incomeBand <= 1);
    const rich = owedPerHome((g) => g.incomeBand >= 3);
    expect(renters.homes).toBeGreaterThan(0);
    expect(owners.homes).toBeGreaterThan(0);
    expect(renters.perHome, "renters against owners").toBeGreaterThan(
      owners.perHome,
    );
    expect(
      poor.perHome,
      "lowest two fifths against highest two",
    ).toBeGreaterThan(rich.perHome);
  });

  it("feeds what happened back: the web's crime-level links and the voters read the records", () => {
    const rows = rowsOf(control);
    const last = control.core.date;
    // The web read the violent index from the records, citing the month row.
    const web = [
      ...(coreAPI(control.core)
        .moduleState(OUTCOME_WEB_MODULE_ID)
        .table("months")
        .rows() as unknown as WebMonth[]),
    ]
      .sort((a, b) => b.month.localeCompare(a.month))
      .find((row) => row.engineSources?.["crime.violent-victimization-index"]);
    expect(web, "a web month that read the victimization index").toBeTruthy();
    const read = web!.engineSources["crime.violent-victimization-index"]!;
    expect(rows.map((r) => r.id)).toContain(read);
    expect(web!.values["crime.violent-victimization-index"]).toBeCloseTo(
      rows.find((r) => r.id === read)!.violentIndex,
      9,
    );
    // The voters' reading is crimes per household against the first month.
    const recent = rows.filter((r) => r.date <= last).slice(-3);
    const expectedChange =
      recent.reduce((n, r) => n + r.perHousehold, 0) /
        (rows[0]!.expectedPerHousehold * recent.length) -
      1;
    expect(crimeChange(control.api, rows[0]!.placeId)).toBeCloseTo(
      expectedChange,
      12,
    );
  });
});
