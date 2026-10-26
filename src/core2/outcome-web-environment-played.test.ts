/**
 * The environment laws reach people through the outcome web on the web's own
 * lags, in a played world with nothing laid on the web by hand. A bottle
 * deposit, a carbon price, emission rules for polluted counties, a
 * clean-electricity standard, a limit on power-plant carbon, farmland
 * protection and a groundwater limit are law in the town from the first day,
 * at every level; the bench world then plays day by day. Each link the web
 * runs from those laws stays at no effect in every web month until the law is
 * as old as the link's lag, and runs from the first month after. Then:
 *
 * - the price engine nets each household's deposit by the share of containers
 *   the web says come back (container-deposit-to-recycling, six months);
 * - the price engine charges the carbon price on the tons the web says a
 *   household emits, for each link into emissions as it comes due;
 * - for each link into particulates as it comes due, the infant outcome reads
 *   the cut particulates the month after (particles-to-infant-deaths), and
 *   the death engine reads that month for full infants and the counted month.
 *
 * Each price read is checked on the same households before and after the lag,
 * so the change is the link's alone. The links into emissions and
 * particulates with lags of two to six years come due only in a longer run
 * (ENV_PLAYED_DAYS); until then each is checked to stay at no effect. The
 * farmland and groundwater laws have no web lag: their engines read them on
 * the day, and the run reports the records they write. Played in a place
 * drawn from all 56 on a seed nobody chose; a place that already had a law
 * whose link comes due in the days played, when the research's base levels
 * were measured, is drawn again, a bounded number of times.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { deathWebFactor } from "./health-web";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { BUSINESS_MODULE_ID } from "./modules/business";
import { advanceCore } from "./life";
import { healthDeathWebOf } from "./modules/health";
import { enactLaw, lawChain } from "./modules/laws";
import {
  lawValue,
  OUTCOME_WEB_MODULE_ID,
  type WebMonth,
} from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { countedHouseholdsByPlace, incomeBandOf } from "./modules/residents";
import { CALIBRATED_AT, WEB_LINKS } from "./outcome-web-model";
import { webLevel, webReach } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.ENV_PLAYED_SEED || randomBytes(8).toString("hex");
const DRAWS = 8;
/**
 * To the 2nd of the month after the infant outcome first reads the cut
 * particulates: a law from the opening (January 20) is a year old at the
 * February 3 web month, the infant link reads that month on March 3, and the
 * counted people's month reads March's record on April 1.
 */
const DAYS = Number(process.env.ENV_PLAYED_DAYS || 438);

const P = "us-policy-positions:";
const BOTTLE = `${P}environment-energy.bottle-deposit`;
const CARBON = `${P}environment-energy.price-carbon`;
const CLEAN_AIR = `${P}environment-energy.clean-air-plan-for-polluted-counties`;
/** Two laws an engine reads on the day, with no web lag: the builders' land and the farms' pumping. */
const FARMLAND = `${P}agriculture-natural-resources.protect-farmland-from-development`;
const GROUNDWATER = `${P}agriculture-natural-resources.limit-groundwater-withdrawal`;
const LAWS = [
  BOTTLE,
  CARBON,
  CLEAN_AIR,
  `${P}environment-energy.clean-electricity-standard`,
  "us-federal-positions:energy-environment.limit-power-plant-carbon",
  FARMLAND,
  GROUNDWATER,
] as const;

const RECYCLED = "env.container-recycling-pct";
const EMISSIONS = "env.emissions";
const PARTICULATES = "env.particulates";
const INFANT_MORTALITY = "health.infant-mortality";
const DEPOSIT_LINK = "container-deposit-to-recycling";
const PARTICULATES_LINK = "emission-rules-to-particulates";
const INFANT_LINK = "particles-to-infant-deaths";
const PERCENT = 100;
const FIFTHS = [0, 1, 2, 3, 4] as const;

const LAW_LINKS = WEB_LINKS.filter((link) =>
  (LAWS as readonly string[]).includes(link.from.replace(/^law:/, "")),
);
const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const seriesOf = (row: (typeof WEB_LINKS)[number]) =>
  row.from.replace(/^law:/, "");
/**
 * The links that must run in the days played: each into the deposit share,
 * emissions or particulates that comes due, with the month its reader takes,
 * before the run ends. Their laws must be new to the place (DUE); a place
 * that already had one when the base levels were measured is drawn again.
 */
const MUST_RUN = LAW_LINKS.filter(
  (row) =>
    [RECYCLED, EMISSIONS, PARTICULATES].includes(row.to) &&
    // Due a lag after the opening, run in the next month's row, read by the
    // engines on the 3rd and 4th of the month after that.
    `${monthsAfter(gameStartDate(), row.lagMonths + 2).slice(0, 8)}05` <=
      addDays(makeIsoDate(gameStartDate()), DAYS),
);
const DUE = [...new Set(MUST_RUN.map(seriesOf))];

/** The same day `months` later, past the 28th read as the 28th, as the web reads a lag. */
function monthsAfter(date: string, months: number): string {
  const index =
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months;
  const day = date.slice(8, 10);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${day > "28" ? "28" : day}`;
}

/** What a full household pays a price on: its living members and their monthly pay, as the price engine reads them. */
function householdBasis(api: CoreAPI, householdId: string) {
  const c = api.state as CoreState;
  const household = c.households.get(householdId);
  const members = (household?.memberIds ?? []).filter(
    (id) => c.people.get(id)?.alive,
  );
  let pay = 0;
  for (const id of members) {
    const job = c.jobs.get(c.people.get(id)!.jobId ?? "");
    if (job && job.endsAt === undefined)
      pay += (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) / 12;
  }
  return { persons: members.length, pay, fifth: incomeBandOf(pay * 12) };
}

/** One monthly price settle: the web month it read and what each full household paid under each law. */
interface Settle {
  readonly date: string;
  readonly read: WebMonth;
  /** The share returned and the emissions factor the engine read, by income fifth. */
  readonly level: Readonly<Record<number, number>>;
  readonly factor: Readonly<Record<number, number>>;
  readonly before: ReadonlyMap<string, ReturnType<typeof householdBasis>>;
  readonly after: ReadonlyMap<string, ReturnType<typeof householdBasis>>;
  readonly deposit: ReadonlyMap<string, { amount: number; rowId: string }>;
  readonly carbon: ReadonlyMap<string, { amount: number; rowId: string }>;
}

function paid(api: CoreAPI, key: string, what: string) {
  const out = new Map<string, { amount: number; rowId: string }>();
  for (const row of appliedOn(api, key))
    if (row.what === what && row.target === "household")
      out.set(row.targetId, {
        amount: (out.get(row.targetId)?.amount ?? 0) + row.amountMinor,
        rowId: row.id,
      });
  return out;
}

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "environment-played");
  const world = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  // The research's base levels include the law each place really had then;
  // only a change from it moves an outcome.
  const atBase = Object.fromEntries(
    LAWS.map((series) => [series, lawValue(api, series, CALIBRATED_AT, true)]),
  ) as Record<string, number>;
  const already = DUE.filter((series) => atBase[series] !== 0);
  if (already.length) return { place, drawSeed, already, result: undefined };
  const effective = core.date;
  for (const series of LAWS)
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series,
        value: 1,
        effectiveDate: effective,
        measureId: `test:environment-played:${series}`,
        citation: "Controlled law case in a generated opening.",
      });
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const townRows = () =>
    (months.rows() as unknown as WebMonth[])
      .filter((row) => row.placeId === town)
      .sort((a, b) => a.month.localeCompare(b.month));
  const settles: Settle[] = [];
  /** On each 4th, the infant hazard the death engine read and the full infants then. */
  const looks: {
    date: string;
    reach: ReturnType<typeof webReach>;
    death: ReturnType<typeof deathWebFactor>;
    byFifth: number[];
    infants: { id: string; factor: number }[];
  }[] = [];
  /** Counted people under one in the town on the 1st of each month, the day its counted month runs. */
  const countedInfantsOn = new Map<string, number>();
  // The counted people's month rows are kept only with bookkeeping on (a
  // debug switch, off for speed): it is on from the month the infant outcome
  // first reads cut particulates to the 2nd of the next, so the counted month
  // that reads that record is kept.
  let keepCountedUntil: string | null = null;
  let day = makeIsoDate(core.date);
  const end = addDays(day, DAYS);
  while (day < end) {
    const next = addDays(day, 1);
    if (keepCountedUntil && next > keepCountedUntil) {
      setBookkeeping(false);
      keepCountedUntil = "";
    }
    if (next.slice(8, 10) === "03") {
      // The price engine settles on the 3rd from the latest month row, before the web writes the new month.
      const read = townRows().at(-1)!;
      const households = [...core.households.values()].filter(
        (h) => h.placeId === town,
      );
      const basis = () =>
        new Map(households.map((h) => [h.id, householdBasis(api, h.id)]));
      const was = basis();
      const level = Object.fromEntries(
        FIFTHS.map((f) => [
          f,
          webLevel(api, town, RECYCLED, { incomeFifth: f })!.level,
        ]),
      );
      const factor = Object.fromEntries(
        FIFTHS.map((f) => [
          f,
          webReach(api, town, EMISSIONS, { incomeFifth: f }).factor,
        ]),
      );
      const deposit0 = paid(api, BOTTLE, "beverage-container-per-unit");
      const carbon0 = paid(api, CARBON, "fuel-share");
      advanceCore(core, next);
      const delta = (
        now: Map<string, { amount: number; rowId: string }>,
        then: Map<string, { amount: number; rowId: string }>,
      ) =>
        new Map(
          [...now].map(([id, row]) => [
            id,
            {
              amount: row.amount - (then.get(id)?.amount ?? 0),
              rowId: row.rowId,
            },
          ]),
        );
      if (
        keepCountedUntil === null &&
        (townRows().at(-1)!.effects[INFANT_LINK] ?? 0) !== 0
      ) {
        setBookkeeping(true);
        keepCountedUntil = `${monthsAfter(next, 1).slice(0, 8)}02`;
      }
      settles.push({
        date: next,
        read,
        level,
        factor,
        before: was,
        after: basis(),
        deposit: delta(
          paid(api, BOTTLE, "beverage-container-per-unit"),
          deposit0,
        ),
        carbon: delta(paid(api, CARBON, "fuel-share"), carbon0),
      });
    } else advanceCore(core, next);
    if (next.slice(8, 10) === "04") {
      const infants = [...core.people.values()]
        .filter(
          (person) =>
            person.alive &&
            person.placeId === town &&
            ageOnDate(makeIsoDate(person.birthDate), next) < 1,
        )
        .map((person) => ({
          id: person.id,
          factor: healthDeathWebOf(core, person.id),
        }));
      looks.push({
        date: next,
        reach: webReach(api, town, INFANT_MORTALITY, { age: 0 }),
        death: deathWebFactor(api, town, 0),
        byFifth: FIFTHS.map((f) => deathWebFactor(api, town, 0, f).factor),
        infants,
      });
    }
    if (next.slice(8, 10) === "01")
      countedInfantsOn.set(
        next.slice(0, 7),
        (countedHouseholdsByPlace(core).get(town) ?? [])
          .flatMap((record) => record.people)
          .filter(
            (person) => ageOnDate(makeIsoDate(person.birthDate), next) < 1,
          ).length,
      );
    day = next;
  }
  const counts = (
    api.moduleState(RENEWAL_MODULE_ID).table("counts").rows() as unknown as {
      month: string;
      placeId?: string;
      webDeathRecordId: string | null;
    }[]
  ).filter((row) => !row.placeId || row.placeId === town);
  const countedInfants = (countedHouseholdsByPlace(core).get(town) ?? [])
    .flatMap((record) => record.people)
    .filter(
      (person) =>
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) < 1,
    ).length;
  // The carried readers' own records: a builder's start on restricted land,
  // and a farm's pumping limit.
  const farmland = appliedOn(api, FARMLAND).filter(
    (row) => row.what === "land-restricted",
  );
  const groundwater = (
    api
      .moduleState(BUSINESS_MODULE_ID)
      .table("operating")
      .rows() as unknown as {
      id: string;
      cause?: string;
    }[]
  ).filter((row) => String(row.cause ?? "").startsWith(`law:${GROUNDWATER}:`));
  return {
    place,
    drawSeed,
    already,
    result: {
      farmland,
      groundwater,
      atBase,
      effective,
      rows: townRows(),
      settles,
      looks,
      counts,
      countedInfants,
      countedInfantsOn,
    },
  };
}

/** The first settle that read a month the link moved, and the one before it. */
function aroundLag(settles: readonly Settle[], key: string) {
  const at = settles.findIndex((s) => (s.read.effects[key] ?? 0) !== 0);
  expect(at, `${key}: a price settle read a month it moved`).toBeGreaterThan(0);
  return { was: settles[at - 1]!, now: settles[at]! };
}

/** Full households whose members and pay held through both settles, with what each paid under a law at each. */
function sameHouseholds(was: Settle, now: Settle, which: "deposit" | "carbon") {
  const same = (a?: { persons: number; pay: number }, b?: typeof a) =>
    a && b && a.persons === b.persons && a.pay === b.pay;
  return [...now[which]]
    .filter(([id]) => {
      const basis = [
        was.before.get(id),
        was.after.get(id),
        now.before.get(id),
        now.after.get(id),
      ];
      return basis.every((b) => same(b, basis[0])) && was[which].has(id);
    })
    .map(([id, row]) => ({
      id,
      fifth: now.before.get(id)!.fifth,
      was: was[which].get(id)!.amount,
      now: row.amount,
      rowId: row.rowId,
    }))
    .filter((row) => row.was > 0);
}

describe(`environment laws reach people on the web's own lags in a played world (seed ${seed})`, () => {
  it("each law's links run once the law is as old as their lag, and the price and death engines read them for the same people", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      const tried: string[] = [];
      let drawSeed = seed;
      let run = play(drawSeed);
      for (let draw = 1; draw < DRAWS && run.already.length; draw += 1) {
        tried.push(
          `${run.place.name}, ${run.place.state} (${drawSeed}): already law at the base: ${run.already.join(", ")}`,
        );
        drawSeed = `${seed}-${draw}`;
        run = play(drawSeed);
      }
      const where = `${run.place.name}, ${run.place.state}, seed ${drawSeed}`;
      expect(run.already, `${where} (${tried.join("; ")})`).toEqual([]);
      const {
        farmland,
        groundwater,
        atBase,
        rows,
        settles,
        looks,
        effective,
        counts,
        countedInfants,
        countedInfantsOn,
      } = run.result!;

      // Every link the web runs from these laws is at no effect until the
      // law is as old as its lag, then runs, in every month row it wrote (a
      // law the place already had at the base moves nothing).
      const firstMoved = new Map<string, WebMonth>();
      const running = LAW_LINKS.filter((row) =>
        rows.some((month) => row.key in month.effects),
      );
      for (const row of running) {
        const due =
          atBase[seriesOf(row)] === 0
            ? monthsAfter(effective, row.lagMonths)
            : "9999-12-31";
        for (const month of rows) {
          const effect = month.effects[row.key] ?? 0;
          const at = `${where}: ${row.key} (lag ${row.lagMonths}) in ${month.id}, written ${month.date}`;
          if (month.date < due) expect(effect, at).toBe(0);
          else {
            expect(effect, at).not.toBe(0);
            expect(Math.sign(effect), at).toBe(Math.sign(row.size!));
            if (!firstMoved.has(row.key)) firstMoved.set(row.key, month);
          }
        }
      }
      for (const row of MUST_RUN)
        expect(
          firstMoved.get(row.key),
          `${where}: ${row.key} ran`,
        ).toBeDefined();

      // The deposit: the same households forfeit the share not returned, at
      // the web's level for the month read, before and after the lag.
      const deposit = aroundLag(settles, DEPOSIT_LINK);
      const kept = (s: Settle, f: number) =>
        1 - Math.min(1, Math.max(0, s.level[f]! / PERCENT));
      expect(deposit.was.read.effects[DEPOSIT_LINK] ?? 0).toBe(0);
      expect(
        deposit.now.level[0]! - deposit.now.read.bases[RECYCLED]!,
      ).toBeCloseTo(deposit.now.read.effects[DEPOSIT_LINK]!, 9);
      const depositRows = sameHouseholds(deposit.was, deposit.now, "deposit");
      expect(
        depositRows.length,
        `${where}: households under the deposit`,
      ).toBeGreaterThan(0);
      for (const row of depositRows) {
        const ratio =
          kept(deposit.now, row.fifth) / kept(deposit.was, row.fifth);
        expect(
          Math.abs(row.now - row.was * ratio),
          `${where}: ${row.id} deposit ${row.was} -> ${row.now} at ${ratio}`,
        ).toBeLessThanOrEqual(0.5 + 0.5 * ratio + 1e-9);
      }

      // The carbon price: the same households pay on fewer tons once each
      // link into the web's emissions runs.
      const into = (measure: string) =>
        running.filter((row) => row.to === measure && firstMoved.has(row.key));
      const carbon = into(EMISSIONS).map((row) => {
        const around = aroundLag(settles, row.key);
        const households = sameHouseholds(around.was, around.now, "carbon");
        expect(
          households.length,
          `${where}: ${row.key}: households under the carbon price`,
        ).toBeGreaterThan(0);
        for (const one of households) {
          const ratio =
            around.now.factor[one.fifth]! / around.was.factor[one.fifth]!;
          expect(ratio, `${row.key}: ${one.id}`).toBeLessThan(1);
          expect(
            Math.abs(one.now - one.was * ratio),
            `${where}: ${row.key}: ${one.id} carbon ${one.was} -> ${one.now} at ${ratio}`,
          ).toBeLessThanOrEqual(0.5 + 0.5 * ratio + 1e-9);
        }
        return { key: row.key, ...around, households };
      });

      // Particulates to infants: the month after a link first cuts the
      // particulates, the infant outcome reads them as a share of their
      // start, and the death engine's next look reads that month.
      const infants = into(PARTICULATES).map((row) => {
        const cut = firstMoved.get(row.key)!;
        const share =
          (cut.values[PARTICULATES]! / cut.bases[PARTICULATES]!) * PERCENT;
        expect(share, `${row.key}: ${cut.id}`).toBeLessThan(PERCENT);
        const after = rows[rows.indexOf(cut) + 1];
        expect(after, `${where}: a month after ${cut.id}`).toBeDefined();
        const before = rows[rows.indexOf(cut) - 1]!;
        expect(after!.effects[INFANT_LINK]).toBeCloseTo(
          link(INFANT_LINK).size! * (share - PERCENT),
          12,
        );
        expect(
          after!.effects[INFANT_LINK]!,
          `${row.key}: ${after!.id}`,
        ).toBeLessThan(before.effects[INFANT_LINK] ?? 0);
        const look = looks.find((l) => l.death.recordId === after!.id);
        expect(
          look,
          `${where}: the death engine read ${after!.id}`,
        ).toBeDefined();
        const part = look!.reach.parts.find((p) => p.link === INFANT_LINK);
        expect(part?.effect, `${where}: ${after!.id}`).toBe(
          after!.effects[INFANT_LINK],
        );
        // Full infants not already ill carry that month's factor for their
        // household's fifth in their hazard (an ill one's course is set).
        const read = look!.infants.filter(
          (infant) =>
            infant.factor !== 1 &&
            [look!.death.factor, ...look!.byFifth].some(
              (f) => Math.abs(f - infant.factor) < 1e-12,
            ),
        );
        return { key: row.key, cut, share, after: after!, look: look!, read };
      });
      // The counted people's month reads the record of the first cut, where
      // the town has counted infants that month; a town whose infants are
      // all full people reads it only through them.
      const first = infants.find((row) => row.key === PARTICULATES_LINK)!;
      const after = first.after;
      const counted = counts.filter((row) => row.webDeathRecordId === after.id);
      const countedThen = countedInfantsOn.get(
        monthsAfter(after.date, 1).slice(0, 7),
      );
      if (countedThen !== 0)
        expect(
          counted.length,
          `${where}: a counted month read ${after!.id} (${counts
            .slice(-4)
            .map((row) => `${row.month} read ${row.webDeathRecordId}`)
            .join("; ")})`,
        ).toBeGreaterThan(0);

      const d = depositRows[0]!;
      console.log(
        [
          `environment played: ${where}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}; laws from ${effective}, ${DAYS} days played`,
          ...running.map((row) =>
            firstMoved.has(row.key)
              ? `${row.key} (lag ${row.lagMonths}): first runs in ${firstMoved.get(row.key)!.id} (written ${firstMoved.get(row.key)!.date}), effect ${firstMoved.get(row.key)!.effects[row.key]}`
              : `${row.key} (lag ${row.lagMonths}): no effect in all ${rows.length} months, ${atBase[seriesOf(row)] === 0 ? `due ${monthsAfter(effective, row.lagMonths)}` : "its law already in force at the base"}`,
          ),
          `deposit: read ${deposit.was.read.id} on ${deposit.was.date} (returned ${deposit.was.level[0]!.toFixed(1)}%), then ${deposit.now.read.id} on ${deposit.now.date} (${deposit.now.level[0]!.toFixed(1)}%); ${depositRows.length} households, e.g. ${d.id} (${d.rowId}) ${d.was} -> ${d.now} cents`,
          ...carbon.map(
            (c) =>
              `carbon, ${c.key}: read ${c.was.read.id} on ${c.was.date} (factor ${c.was.factor[0]}), then ${c.now.read.id} on ${c.now.date} (factor ${c.now.factor[0]}); ${c.households.length} households, e.g. ${c.households[0]!.id} (${c.households[0]!.rowId}) ${c.households[0]!.was} -> ${c.households[0]!.now} cents`,
          ),
          ...infants.map(
            (i) =>
              `infants, ${i.key}: ${i.cut.id} particulates ${i.share.toFixed(3)}% of start; ${i.after.id} infant effect ${i.after.effects[INFANT_LINK]}; death engine read it on ${i.look.date} (age 0 factor ${i.look.death.factor}); ${i.read.length} of ${i.look.infants.length} full infants carry it${i.read[0] ? `, e.g. ${i.read[0].id} at ${i.read[0].factor}` : ""}`,
          ),
          `carried: farmland ${farmland.length ? `${farmland[0]!.id} (${farmland[0]!.target} ${farmland[0]!.targetId}, ${farmland[0]!.times} months from ${farmland[0]!.since})` : "no builder start on restricted land"}; groundwater ${groundwater.length ? groundwater.map((row) => row.id).join(", ") : "no farm in the town"}`,
          `counted months reading ${after.id}: ${counted.map((row) => row.month).join(", ")} (${countedThen ?? "no count"} counted infants on the 1st of the month after, ${countedInfants} at the end)`,
        ].join("\n"),
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 3_600_000);
});
