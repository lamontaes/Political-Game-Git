/**
 * The crime and justice research links reach people through the engines that
 * decide the outcome, in a played world: a place drawn from all 56 on a seed
 * nobody chose, the bench world with every module installed, built twice from
 * the same seed. One world moves the cause; the other is the control. Each
 * world is read into plain records and let go before the next is built.
 *
 * - pretrial-detention-to-conviction: the control keeps money bail and the
 *   other world ends cash bail, so fewer defendants are held until their case
 *   is decided. The court that decides each counted case reads the link's own
 *   size: a case holding fewer defendants convicts fewer of them, by the
 *   link's proportion, and the sentence row keeps the reasons.
 * - unemployment-to-vandalism and crime-level-to-vandalism: unemployment
 *   rises three points in one world's economy month row, so the web's factor
 *   on vandalism moves and the crime engine victimizes more households by it,
 *   as it does for burglary (src/core2/modules/crime.test.ts).
 *
 * Set CRIME_WEB_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./modules/laws";
import {
  countedCases,
  JUSTICE_MODULE_ID,
  type CountedCaseRow,
  type CountedSentenceRow,
} from "./modules/justice";
import {
  crimeMonths,
  CRIME_EVENT,
  CRIME_MODULE_ID,
  VIOLENT,
  type CrimeMonth,
} from "./modules/crime";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WORLD_METRICS_MODULE_ID } from "./modules/world-metrics";
import { WEB_LINKS } from "./outcome-web-model";
import { CASH_BAIL, safetyParameter } from "./public-safety";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";
import { corePlaceByKey } from "./place-lookup";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import crimeData from "./data/crime/victimization.json" with { type: "json" };

const seed = process.env.CRIME_WEB_SEED ?? randomBytes(20).toString("hex");
const TRIES = 5;
const YEAR = 365;

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;

const buildWorld = (drawn: ReturnType<typeof drawPlace>) =>
  buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core;

/** Sets a yes-or-no question in the town's laws from tomorrow, at the lowest level that may pass it, or repeals it everywhere it stands. */
function setQuestion(api: CoreAPI, key: string, value: 0 | 1): void {
  const date = addDays(makeIsoDate(api.state.date), 1);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const levels = lawChain(api).levels;
  if (value === 0) {
    for (const { level, jurisdiction } of levels) {
      const latest = (
        laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
      )
        .filter((r) => r.effectiveDate <= api.state.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      if (latest?.value !== 1) continue;
      enactLaw(api, {
        jurisdiction,
        level,
        series: key,
        value: 0,
        effectiveDate: date,
        measureId: `crime-web-test:${key}:repeal`,
        citation: "Test repeal",
      });
    }
    return;
  }
  const at =
    levels.find((l) => l.level === "city") ??
    levels.find((l) => l.level === "county") ??
    levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: at.jurisdiction,
    level: at.level,
    series: key,
    value: 1,
    effectiveDate: date,
    measureId: `crime-web-test:${key}:enact`,
    citation: "Test enactment",
  });
}

/** An adult counted case decided in a played year, and the sentence row that kept its reasons. */
interface Decided {
  readonly case: CountedCaseRow;
  readonly sentence: CountedSentenceRow;
}

/** Plays a year with the bail question set on the first day and reads the adult cases the court decided (a case keeps the law it was charged under). */
function bailYear(
  drawn: ReturnType<typeof drawPlace>,
  value: 0 | 1,
): Map<string, Decided> {
  const core = buildWorld(drawn);
  const api = coreAPI(core);
  setQuestion(api, CASH_BAIL, value);
  const end = addDays(makeIsoDate(core.date), YEAR);
  for (let day = makeIsoDate(core.date); day < end;) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  const sentences = api.moduleState(JUSTICE_MODULE_ID).table("sentences");
  return new Map(
    countedCases(api, "decided")
      .filter((c) => c.court === "adult" && c.sentenceId)
      .map((c) => [
        c.id,
        {
          case: { ...c },
          sentence: {
            ...(sentences.get(c.sentenceId!) as unknown as CountedSentenceRow),
          },
        },
      ]),
  );
}

describe("pretrial-detention-to-conviction reaches the counted defendants the court convicts", () => {
  it(
    `ending cash bail holds fewer defendants and convicts fewer of them, by the link's size (seed ${seed})`,
    { timeout: 1_500_000 },
    () => {
      const was = setBookkeeping(false);
      const size = link("pretrial-detention-to-conviction").size!;
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(
            seed,
            `law-wiring-crime-web:conviction:${attempt}`,
          );
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${seed}, attempt ${attempt}`;
          const withLaw = bailYear(drawn, 1);
          const without = bailYear(drawn, 0);
          // Cases of the same month, offense and age band, decided in both worlds.
          const pairs = [...withLaw]
            .filter(([id]) => without.has(id))
            .map(([id, law]) => ({ id, law, base: without.get(id)! }))
            .filter(
              ({ law, base }) =>
                law.case.bailLawId &&
                !base.case.bailLawId &&
                law.case.count > 0 &&
                base.case.count > 0,
            );
          const fewerHeld = pairs.filter(
            ({ law, base }) =>
              law.case.detained / law.case.count <
              base.case.detained / base.case.count,
          );
          if (!fewerHeld.length) {
            passed.push(
              `${where}: ${pairs.length} paired adult cases decided, none held fewer under the law`,
            );
            continue;
          }
          for (const { id, law, base } of fewerHeld) {
            const lawReasons = law.sentence.reasons!;
            const baseReasons = base.sentence.reasons!;
            expect(lawReasons.link, `${where}: ${id}`).toBe(
              "pretrial-detention-to-conviction",
            );
            expect(lawReasons.detentionSize, `${where}: ${id}`).toBe(size);
            const heldLaw = law.case.detained / law.case.count;
            const heldBase = base.case.detained / base.case.count;
            // The control keeps money bail: it holds what the offense's base share was measured at, and convicts the base share.
            expect(
              baseReasons.heldShare,
              `${where}: ${base.case.id}`,
            ).toBeCloseTo(baseReasons.heldOnMoneyShare as number, 12);
            expect(
              base.sentence.convicted / base.case.count,
              `${where}: ${base.sentence.id}`,
            ).toBeCloseTo(baseReasons.baseShare as number, 12);
            // The base conviction share is the offense's own parameter, unchanged.
            expect(baseReasons.baseShare).toBe(
              safetyParameter(`convictedShare.${base.case.offense}`),
            );
            // The law's world has the same defendants' money-bail share (their cash differs a little after a year of different bail), but holds fewer of them.
            const moneyLaw = lawReasons.heldOnMoneyShare as number;
            const moneyBase = baseReasons.heldOnMoneyShare as number;
            expect(
              Math.abs(moneyLaw - moneyBase),
              `${where}: ${id}`,
            ).toBeLessThan(0.02);
            // Each convicted at the released rate times one plus the size for the held: the law's case against the control's.
            const expected =
              (1 + size * heldLaw) /
              (1 + size * moneyLaw) /
              ((1 + size * heldBase) / (1 + size * moneyBase));
            expect(
              law.sentence.convicted /
                law.case.count /
                (base.sentence.convicted / base.case.count),
              `${where}: ${law.sentence.id} against ${base.sentence.id}`,
            ).toBeCloseTo(expected, 9);
            expect(expected, `${where}: ${id}`).toBeLessThan(1);
          }
          const first = fewerHeld[0]!;
          const pct = (n: number, of: number) => ((n / of) * 100).toFixed(2);
          process.stdout.write(
            `CRIME WEB conviction: ${where}: ${fewerHeld.length} of ${pairs.length} paired adult cases held fewer under ${first.law.case.bailLawId}; ${first.id} held ${pct(first.law.case.detained, first.law.case.count)}% against ${pct(first.base.case.detained, first.base.case.count)}% and convicted ${pct(first.law.sentence.convicted, first.law.case.count)}% (${first.law.sentence.id}) against ${pct(first.base.sentence.convicted, first.base.case.count)}% (${first.base.sentence.id}), link size ${size}\n`,
          );
          return;
        }
        throw new Error(
          `no place in ${TRIES} draws held fewer under the bail law: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(was);
      }
    },
  );
});

/** Days to play: three months of records, the first on the opening's first 4th. */
const DAYS = 80;
const SHIFT_POINTS = 3;
/** About 2,000 households: at 8.04 per 1,000 a year, a month owes more than one. */
const MIN_VANDALISM_PEOPLE = 5000;

interface VandalismYear {
  readonly month: CrimeMonth;
  readonly web: WebMonth;
  readonly households: number;
  /** Vandalism events the log holds, by household. */
  readonly events: readonly {
    id: string;
    householdId: string;
    webRecordId: string;
  }[];
  /** Counted groups victimized by vandalism in the last month. */
  readonly tallies: readonly { id: string; groupId: string; n: number }[];
}

/** Plays the opening months; in the shifted world the town's unemployment rate is three points higher in each economy month row after the first. */
function vandalismMonths(
  drawn: ReturnType<typeof drawPlace>,
  shifted: boolean,
): VandalismYear {
  const core: CoreState = buildWorld(drawn);
  const api = coreAPI(core);
  let day = makeIsoDate(core.date);
  const end = addDays(day, DAYS);
  let firstRowDay: string | null = null;
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    // The economy's month row is written on the 2nd; the web reads it on the 3rd.
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
  const placeId = core.visiblePlaceIds.values().next().value!;
  const month = crimeMonths(api, placeId).at(-1)!;
  const web = api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .get(month.webRecordId!) as unknown as WebMonth;
  const events = [...(core.logByKind.get(CRIME_EVENT) ?? [])]
    .map((id) => core.durableLog.get(id)!)
    .filter((event) => event.facts?.type === "vandalism")
    .map((event) => ({
      id: event.id,
      householdId: String(event.facts!.householdId),
      webRecordId: String(event.facts!.webRecordId),
    }));
  // The counted groups victimized by vandalism this month: one tally row per place, month and group.
  const tallies = (
    api
      .moduleState(CRIME_MODULE_ID)
      .table("tallies")
      .query("byPlace", [placeId]) as unknown as {
      id: string;
      month: string;
      groupId: string;
      counts: Record<string, number>;
    }[]
  )
    .filter((row) => row.month === month.month && row.counts.vandalism)
    .map((row) => ({
      id: row.id,
      groupId: row.groupId,
      n: row.counts.vandalism!,
    }));
  return {
    month: JSON.parse(JSON.stringify(month)) as CrimeMonth,
    web: JSON.parse(JSON.stringify(web)) as WebMonth,
    households: month.households,
    events,
    tallies,
  };
}

describe("unemployment-to-vandalism and crime-level-to-vandalism reach the households the crime engine victimizes", () => {
  it(
    `a rise in unemployment raises the vandalism households are owed, by the link's size (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const was = setBookkeeping(false);
      try {
        // A month owes a town's households vandalism at about 8 per 1,000 a
        // year, so a town needs some thousands of people for a month to owe
        // one whole household: smaller towns are passed over, named, before a
        // world is built (the carried remainder still counts there).
        const passed: string[] = [];
        let drawn: ReturnType<typeof drawPlace> | undefined;
        for (let attempt = 0; attempt < 40 && !drawn; attempt += 1) {
          const place = drawPlace(
            seed,
            `law-wiring-crime-web:vandalism:${attempt}`,
          );
          const people = publishedPlaceReferencePopulation(
            corePlaceByKey(place.key)?.sourceGeoid ?? place.key,
          )?.value;
          if (people !== undefined && people < MIN_VANDALISM_PEOPLE) {
            passed.push(`${place.name}, ${place.state}: ${people} people`);
            continue;
          }
          drawn = place;
        }
        if (!drawn)
          throw new Error(
            `no drawn town had ${MIN_VANDALISM_PEOPLE} people: ${passed.join("; ")}`,
          );
        const where = `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${seed}; passed over ${passed.length ? passed.join("; ") : "none"}`;
        const control = vandalismMonths(drawn, false);
        const shifted = vandalismMonths(drawn, true);
        const base = control.month;
        const moved = shifted.month;
        expect(moved.month, where).toBe(base.month);
        const unemployment = link("unemployment-to-vandalism");
        // The web moved: its link effect is higher in the shifted world's month row than in the control's.
        const key = unemployment.key;
        expect(
          shifted.web.effects[key]!,
          `${where}: ${shifted.web.id}`,
        ).toBeGreaterThan(control.web.effects[key] ?? 0);
        // The unemployment link's own rise, from the web's two month rows, is the researched size for the points added.
        const rise =
          (1 + shifted.web.effects[key]!) /
            (1 + (control.web.effects[key] ?? 0)) -
          1;
        const [low, high] = unemployment.range!;
        expect(rise, `${where}: ${key}`).toBeGreaterThanOrEqual(
          low * SHIFT_POINTS * 0.9,
        );
        expect(rise, `${where}: ${key}`).toBeLessThanOrEqual(
          high * SHIFT_POINTS * 1.1,
        );
        // Households are victimized by vandalism at the NIBRS-sized rate, times the web's factor for the place.
        const rate = crimeData.types.vandalism.ratePer1000;
        const perHousehold = base.types.vandalism.expected / base.households;
        const owedAtRate = rate / 1000 / 12;
        expect(
          perHousehold / (owedAtRate * base.types.vandalism.factor),
          `${where}: ${base.id}`,
        ).toBeGreaterThan(0.5);
        expect(
          perHousehold / (owedAtRate * base.types.vandalism.factor),
          `${where}: ${base.id}`,
        ).toBeLessThan(2);
        // The records follow the factor the web moved: the shifted month owes its households more.
        const ratio =
          moved.types.vandalism.expected / base.types.vandalism.expected;
        expect(
          ratio,
          `${where}: ${moved.id} against ${base.id}`,
        ).toBeGreaterThan(1);
        expect(ratio).toBeCloseTo(
          moved.types.vandalism.factor / base.types.vandalism.factor,
          1,
        );
        expect(moved.types.vandalism.links, `${where}: ${moved.id}`).toContain(
          key,
        );
        expect(moved.types.vandalism.factor).toBeGreaterThan(
          base.types.vandalism.factor,
        );
        expect(moved.webRecordId, where).toBe(shifted.web.id);
        // Vandalism is not part of the violent index it is scaled by, so it does not feed itself.
        expect(VIOLENT as readonly string[]).not.toContain("vandalism");
        // And it happened: whole households were victimized, as full households' log records or counted groups' tally rows.
        expect(
          moved.types.vandalism.count,
          `${where}: ${moved.id}`,
        ).toBeGreaterThan(0);
        expect(moved.types.vandalism.fullCount, `${where}: ${moved.id}`).toBe(
          shifted.events.filter((e) => e.id.includes(shifted.month.date))
            .length,
        );
        expect(
          shifted.tallies.reduce((n, row) => n + row.n, 0),
          `${where}: ${moved.id}`,
        ).toBe(moved.types.vandalism.countedCount);
        // Any vandalism that happened to a full household is a log record naming the household and the web month it stands on.
        for (const event of [...control.events, ...shifted.events]) {
          expect(event.householdId, `${where}: ${event.id}`).toMatch(/\S/);
          expect(event.webRecordId, `${where}: ${event.id}`).toMatch(/^web:/);
        }
        process.stdout.write(
          `CRIME WEB vandalism: ${where}: ${moved.id} owes ${moved.types.vandalism.expected.toFixed(3)} against ${base.id} ${base.types.vandalism.expected.toFixed(3)} (x${ratio.toFixed(4)}), ${key} effect ${shifted.web.effects[key]!.toFixed(4)} against ${(control.web.effects[key] ?? 0).toFixed(4)} on ${shifted.web.id}, link size ${unemployment.size}; the shifted month victimized ${moved.types.vandalism.count} households (${moved.types.vandalism.fullCount} full, ${shifted.tallies.length} counted groups, e.g. ${shifted.tallies[0]?.id ?? "none"}), the control ${base.types.vandalism.count}\n`,
        );
      } finally {
        setBookkeeping(was);
      }
    },
  );
});
