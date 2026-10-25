/**
 * The transit and road laws reach people's money through the outcome web on
 * the web's own lags, in a played world with nothing laid on the web by hand
 * (web-reach-places-services). Every law the web runs into transit service or
 * road condition changes in the town on the second day, at every level,
 * against the town's own base: repealed where it was law, enacted where it
 * was not. The bench world then plays day by day, and its legislatures may
 * change a law again. Each link from those laws moves a web month only while
 * the law a lag earlier differs from the base. Then, for each that runs:
 *
 * - the link from its outcome (transit service to ridership, poor roads to
 *   prices) runs the month after;
 * - the price engine reads that month: for ridership, the fares households
 *   pay for their trips under the web's ridership factor, by journal
 *   receipt; for prices, the businesses whose next price review takes the
 *   web's price factor, by business.
 *
 * Highway money for transit comes due at 24 months, inside the default run;
 * fix-it-first roads at 60 months (PLACES_PLAYED_DAYS=1900). Played in a
 * place drawn from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import {
  lawValue,
  OUTCOME_WEB_MODULE_ID,
  type WebMonth,
} from "./modules/outcome-web";
import { CALIBRATED_AT, moderatorScale, WEB_LINKS } from "./outcome-web-model";
import { webFactorFor } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.PLACES_PLAYED_SEED || randomBytes(8).toString("hex");
/** To April 10, 2027: the 24-month link runs in February 2027, ridership in March, and the price engine reads it on April 3. */
const DAYS = Number(process.env.PLACES_PLAYED_DAYS || 810);

const SERVICE = "transit.service-access";
const ROADS = "roads.poor-condition-pct";
const RIDERSHIP = "transit.ridership";
const PRICES = "household.prices";

const isLaw = (from: string) => from.startsWith("law:");
const seriesOf = (row: (typeof WEB_LINKS)[number]) =>
  row.from.replace(/^law:/, "");
/** The law links into transit service and road condition. */
const FAMILY = WEB_LINKS.filter(
  (row) => isLaw(row.from) && [SERVICE, ROADS].includes(row.to),
);
const LAWS = [...new Set(FAMILY.map(seriesOf))];
const LAW_LINKS = WEB_LINKS.filter(
  (row) => isLaw(row.from) && LAWS.includes(seriesOf(row)),
);
/** The links that start from an outcome the family moves: they run the month after it moves. */
const chainedFrom = (outcome: string) =>
  WEB_LINKS.filter((row) => row.from.startsWith(`${outcome}:`));

/** The family links whose lag, the month after and the reader's month fit in the days played. */
const DUE = FAMILY.filter(
  (row) =>
    `${monthsAfter(gameStartDate(), row.lagMonths + 2).slice(0, 8)}05` <=
    addDays(makeIsoDate(gameStartDate()), DAYS),
);
const DRAWS = 3;

/** Whether the change to a link's law held, in some month, from a lag before to that month. */
function held(
  run: { core: CoreState; atBase: Record<string, number>; rows: WebMonth[] },
  row: (typeof WEB_LINKS)[number],
): boolean {
  const api = coreAPI(run.core);
  const series = seriesOf(row);
  const base = run.atBase[series]!;
  return run.rows.some((month) => {
    const back = monthsAfter(month.date, -row.lagMonths);
    const lagged = back < CALIBRATED_AT ? CALIBRATED_AT : back;
    return (
      lawValue(api, series, lagged) !== base &&
      lawValue(api, series, month.date) !== base
    );
  });
}

/** The same day `months` later, past the 28th read as the 28th, as the web reads a lag. */
function monthsAfter(date: string, months: number): string {
  const index =
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months;
  const day = date.slice(8, 10);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${day > "28" ? "28" : day}`;
}

/** Change one law at every level that holds it and every level of the town's chain, and again on each later real row that would undo it. */
function changeLaw(
  api: CoreAPI,
  series: string,
  to: number,
  effectiveDate: string,
): void {
  const rows = [
    ...(api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [series]) as unknown as readonly {
      jurisdiction: string;
      level: Parameters<typeof enactLaw>[1]["level"];
      value: unknown;
      effectiveDate: string;
    }[]),
  ];
  const levels = new Map(
    lawChain(api).levels.map((level) => [level.jurisdiction, level.level]),
  );
  for (const row of rows) levels.set(row.jurisdiction, row.level);
  const enact = (jurisdiction: string, level: string, date: string) =>
    enactLaw(api, {
      jurisdiction,
      level: level as Parameters<typeof enactLaw>[1]["level"],
      series,
      value: to,
      effectiveDate: date,
      measureId: `test:places-played:${series}:${date}`,
      citation: "Controlled law case in a generated opening.",
    });
  for (const [jurisdiction, level] of levels)
    enact(jurisdiction, level, effectiveDate);
  for (const row of rows)
    if (row.effectiveDate > effectiveDate && Number(row.value) !== to)
      enact(row.jurisdiction, row.level, row.effectiveDate);
}

/** On each 3rd, as the price engine settles: the month it read and the ridership factor. */
interface Settle {
  readonly date: string;
  readonly rowId: string;
  readonly ridership: number;
}

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "places-played");
  const world = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const atBase = Object.fromEntries(
    LAWS.map((series) => [series, lawValue(api, series, CALIBRATED_AT, true)]),
  ) as Record<string, number>;
  const effective = addDays(makeIsoDate(core.date), 1);
  for (const series of LAWS)
    changeLaw(api, series, atBase[series] === 1 ? 0 : 1, effective);
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const townRows = () =>
    (months.rows() as unknown as WebMonth[])
      .filter((row) => row.placeId === town)
      .sort((a, b) => a.month.localeCompare(b.month));
  const settles: Settle[] = [];
  /** Each business's web price factor as it stood when each month row was written. */
  const factorsAt = new Map<string, Map<string, number | undefined>>();
  const books = () =>
    [...core.finance.businesses.entries()].filter(([, book]) => !book.closedAt);
  let observed = false;
  let day = makeIsoDate(core.date);
  const end = addDays(day, DAYS);
  while (day < end) {
    const next = addDays(day, 1);
    // The journal keeps each household's receipts only in observer mode (a
    // debug switch): it is on for the first settle that reads a month where
    // the ridership link from transit service moved.
    let observing = false;
    if (next.slice(8, 10) === "03") {
      // The price engine settles on the 3rd from the latest month row, before the web writes the new month.
      const read = townRows().at(-1)!;
      settles.push({
        date: next,
        rowId: read.id,
        ridership: webFactorFor(api, town, RIDERSHIP),
      });
      observing =
        !observed &&
        chainedFrom(SERVICE).some(
          (link) => (read.effects[link.key] ?? 0) !== 0,
        );
      if (observing) observed = true;
    }
    const wasObserver = core.observer;
    if (observing) core.observer = true;
    advanceCore(core, next);
    core.observer = wasObserver;
    const latest = townRows().at(-1)!;
    if (!factorsAt.has(latest.id))
      factorsAt.set(
        latest.id,
        new Map(books().map(([id, book]) => [id, book.lastWebPriceFactor])),
      );
    day = next;
  }
  return {
    core,
    place,
    drawSeed,
    town,
    atBase,
    effective,
    rows: townRows(),
    settles,
    factorsAt,
    books: books(),
  };
}

describe(`transit and road laws reach people's money on the web's own lags in a played world (seed ${seed})`, () => {
  it("each law's links run while the law a lag earlier differs from the base, and the price engine reads what they move", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      // A place whose legislatures undid every change before its link came
      // due is drawn again, a bounded number of times.
      const tried: string[] = [];
      let run = play(seed);
      for (
        let draw = 1;
        draw < DRAWS && !DUE.some((row) => held(run, row));
        draw += 1
      ) {
        tried.push(
          `${run.place.name}, ${run.place.state} (${run.drawSeed}): ${LAWS.map((series) => `${series} ${run.atBase[series]} at the base, ${lawValue(coreAPI(run.core), series, run.rows.at(-1)!.date)} at the end`).join("; ")}`,
        );
        run = play(`${seed}-${draw}`);
      }
      const { atBase, effective, rows, settles } = run;
      const where = `${run.place.name}, ${run.place.state}, seed ${run.drawSeed}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}`;
      const api = coreAPI(run.core);
      const sign = (x: number) => Math.sign(x) || 0;

      // Each link from these laws moves a month only while the law as it
      // stood a lag earlier differs from the base, in the direction of the
      // difference, and stops the day the law is back at the base.
      const expected = (row: (typeof WEB_LINKS)[number], date: string) => {
        const series = seriesOf(row);
        const base = atBase[series]!;
        const back = monthsAfter(date, -row.lagMonths);
        const lagged = back < CALIBRATED_AT ? CALIBRATED_AT : back;
        const then = lawValue(api, series, lagged);
        const now = lawValue(api, series, date);
        const moderator = row.moderator;
        const known = !moderator || isLaw(moderator.measure);
        const scale =
          moderator && known
            ? moderatorScale(
                moderator,
                lawValue(api, moderator.measure.replace(/^law:/, ""), lagged),
              )
            : 1;
        const moves =
          then !== base && (row.lagMonths === 0 || now !== base) && scale !== 0;
        return {
          then,
          now,
          base,
          known,
          sign: moves
            ? sign(sign(row.size!) * sign(then - base) * sign(scale))
            : 0,
        };
      };
      const firstMoved = new Map<string, WebMonth>();
      const running = LAW_LINKS.filter((row) =>
        rows.some((month) => row.key in month.effects),
      );
      for (const row of running)
        for (const month of rows) {
          const want = expected(row, month.date);
          const effect = month.effects[row.key] ?? 0;
          const at = `${where}: ${row.key} (lag ${row.lagMonths}) in ${month.id}, written ${month.date}: the law ${want.then} a lag before, ${want.now} then, ${want.base} at the base`;
          if (want.known) expect(sign(effect), at).toBe(want.sign);
          if (effect !== 0 && !firstMoved.has(row.key))
            firstMoved.set(row.key, month);
        }
      const due = DUE;
      const kept = (row: (typeof FAMILY)[number]) =>
        rows.some((month) => expected(row, month.date).sign !== 0);
      for (const row of due.filter(kept))
        expect(
          firstMoved.get(row.key),
          `${where}: ${row.key} ran`,
        ).toBeDefined();
      const ran = due.filter((row) => firstMoved.has(row.key));
      expect(ran.length, `${where}: a family link ran`).toBeGreaterThan(0);

      const reads = ran.map((row) => {
        // The link from the outcome runs from the month after it moves.
        const moved = firstMoved.get(row.key)!;
        const after = rows[rows.indexOf(moved) + 1];
        expect(after, `${where}: a month after ${moved.id}`).toBeDefined();
        const chained = chainedFrom(row.to).filter(
          (link) => (after!.effects[link.key] ?? 0) !== 0,
        );
        expect(
          chained.length,
          `${where}: a link from ${row.to} runs in ${after!.id}`,
        ).toBeGreaterThan(0);
        for (const link of chained)
          for (const month of rows.slice(0, rows.indexOf(after!)))
            expect(
              month.effects[link.key] ?? 0,
              `${link.key} in ${month.id}`,
            ).toBe(0);
        if (row.to === SERVICE) {
          // The price engine's settle that reads that month takes the
          // ridership factor for every household's trips.
          const settle = settles.find((s) => s.rowId === after!.id);
          expect(
            settle,
            `${where}: a price settle read ${after!.id}`,
          ).toBeDefined();
          expect(
            settle!.ridership,
            `${where}: ridership on ${settle!.date}`,
          ).not.toBe(1);
          // Each full household's fare for its trips under the web's
          // ridership factor is a journal transfer from that settle.
          const prefix = `price:${run.town}:transit-fare:price:${settle!.date}:`;
          const receipts = [...run.core.cashJournal.detailedReceipts.values()]
            .filter(
              (receipt) =>
                receipt.sourceRef.id.startsWith(prefix) &&
                receipt.sourceRef.id.endsWith(`:web:${RIDERSHIP}:pay`),
            )
            .map((receipt) => `${receipt.id} (${receipt.sourceRef.id})`);
          expect(
            receipts.length,
            `${where}: households paid fares under ${RIDERSHIP} on ${settle!.date}`,
          ).toBeGreaterThan(0);
          return { row, moved, after, chained, settle, receipts };
        }
        // Each business whose price review after that month took the web's
        // price factor, changed from the one it held when the month was written.
        const before = run.factorsAt.get(after!.id)!;
        const reviewed = run.books.filter(
          ([id, book]) =>
            book.lastReviewedAt !== undefined &&
            book.lastReviewedAt >= after!.date &&
            book.lastWebPriceFactor !== before.get(id),
        );
        expect(
          reviewed.length,
          `${where}: a business's price review read ${PRICES} after ${after!.id}`,
        ).toBeGreaterThan(0);
        return { row, moved, after, chained, reviewed };
      });

      console.log(
        [
          `places played: ${where}; laws changed from ${effective}, ${DAYS} days played`,
          ...LAWS.map(
            (series) =>
              `${series}: ${atBase[series] === 1 ? "in force at the base, repealed" : "not in force at the base, enacted"}`,
          ),
          ...running.map((row) =>
            firstMoved.has(row.key)
              ? `${row.key} (lag ${row.lagMonths}): first runs in ${firstMoved.get(row.key)!.id} (written ${firstMoved.get(row.key)!.date}), effect ${firstMoved.get(row.key)!.effects[row.key]}`
              : `${row.key} (lag ${row.lagMonths}): no effect in all ${rows.length} months`,
          ),
          ...reads.map((r) =>
            "settle" in r
              ? `${r.row.key}: ${r.chained.map((c) => `${c.key} ${r.after.effects[c.key]}`).join(", ")} in ${r.after.id}; the price engine read it on ${r.settle!.date} (ridership factor ${r.settle!.ridership}); ${r.receipts!.length} households paid fares under it, e.g. ${r.receipts![0]}`
              : `${r.row.key}: ${r.chained.map((c) => `${c.key} ${r.after.effects[c.key]}`).join(", ")} in ${r.after.id}; ${r.reviewed!.length} businesses' price reviews took the web's price factor, e.g. ${r.reviewed![0]![0]} on ${r.reviewed![0]![1].lastReviewedAt} at ${r.reviewed![0]![1].lastWebPriceFactor}`,
          ),
        ].join("\n"),
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 3_600_000);
});
