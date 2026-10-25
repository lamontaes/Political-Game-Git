/**
 * The health laws reach people's death risk through the outcome web on the
 * web's own lags, in a played world with nothing laid on the web by hand.
 * Every law the web runs into a death outcome or the uninsured share (a child
 * access law, a handgun purchase age, an abortion ban, the Medicaid expansion
 * and its work requirement, harm reduction, cannabis sales) changes in the
 * town on the second day, at every level: a law the place had when the
 * research's base levels were measured is repealed, and a law it lacked is
 * enacted, so every link can run in every place. The bench world then
 * plays day by day, and its legislatures may change a law again. Each link
 * the web runs from those laws moves a web month only while the law as it
 * stood a lag earlier differs from the base, in the direction of the
 * difference, and a change the world keeps for the lag must run it. Then,
 * for each link into a death outcome that ran:
 *
 * - the death engine's monthly look reads the first month the link moved:
 *   the web's reach for that outcome carries the link's effect, and full
 *   people of the link's ages carry the factor of that month in their death
 *   hazard, changed from their factor before;
 * - a counted month reads a month the link moved.
 *
 * The two links into the uninsured share run on their lags here; the engine
 * that reads them is the coverage review (web-coverage-reads), so this test
 * checks only that they run. Played in a place drawn from all 56 on a seed
 * nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { deathWebFactor } from "./health-web";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { healthDeathWebOf } from "./modules/health";
import { enactLaw, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import {
  lawValue,
  OUTCOME_WEB_MODULE_ID,
  type WebMonth,
} from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { countedHouseholdsByPlace } from "./modules/residents";
import { CALIBRATED_AT, moderatorScale, WEB_LINKS } from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.HEALTH_PLAYED_SEED || randomBytes(8).toString("hex");
/**
 * To the 2nd of the month after the twelve-month links first run: a change
 * on January 21 is a year old at the February 3 web month, the death engine
 * reads it on February 4, and the counted people's month reads it on
 * March 1.
 */
const DAYS = Number(process.env.HEALTH_PLAYED_DAYS || 410);

/** The death outcomes the death engine reads, with the ages a person must be for the link's effect to reach their hazard. */
const DEATHS: Readonly<Record<string, { from: number; below: number }>> = {
  "health.youth-firearm-deaths": { from: 1, below: 20 },
  "health.youth-firearm-suicide": { from: 10, below: 20 },
  "health.infant-mortality": { from: 0, below: 1 },
  "health.mortality-55-64": { from: 55, below: 65 },
  // No overdose deaths are recorded under 15, so the cause has no share there.
  "health.overdose-deaths": { from: 15, below: 120 },
};
const UNINSURED = "health.uninsured-pct";
const FIFTHS = [0, 1, 2, 3, 4] as const;

const isLaw = (from: string) => from.startsWith("law:");
const seriesOf = (row: (typeof WEB_LINKS)[number]) =>
  row.from.replace(/^law:/, "");
/** The law links into the death outcomes and the uninsured share. */
const FAMILY = WEB_LINKS.filter(
  (row) => isLaw(row.from) && (row.to in DEATHS || row.to === UNINSURED),
);
const LAWS = [...new Set(FAMILY.map(seriesOf))];
/** Every link the web runs from those laws, into any outcome. */
const LAW_LINKS = WEB_LINKS.filter(
  (row) => isLaw(row.from) && LAWS.includes(seriesOf(row)),
);
const MUST_RUN = FAMILY.filter(
  (row) =>
    `${monthsAfter(gameStartDate(), row.lagMonths + 1).slice(0, 8)}05` <=
    addDays(makeIsoDate(gameStartDate()), DAYS),
);

/** The same day `months` later, past the 28th read as the 28th, as the web reads a lag. */
function monthsAfter(date: string, months: number): string {
  const index =
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months;
  const day = date.slice(8, 10);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${day > "28" ? "28" : day}`;
}

/**
 * Change one law at every level that holds it and every level of the town's
 * chain: to 0 where the place had it at the base, to 1 where it did not. A
 * real row already scheduled for a later date would undo the change on that
 * date, so the change is enacted again on each such date.
 */
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
      measureId: `test:health-played:${series}:${date}`,
      citation: "Controlled law case in a generated opening.",
    });
  for (const [jurisdiction, level] of levels)
    enact(jurisdiction, level, effectiveDate);
  const later = rows.filter(
    (row) => row.effectiveDate > effectiveDate && Number(row.value) !== to,
  );
  for (const row of later)
    enact(row.jurisdiction, row.level, row.effectiveDate);
  return [effectiveDate, ...later.map((row) => row.effectiveDate)];
}

/** On each 4th, after the death engine's refresh: the month it read, the web's reach for each death outcome, and each full person's factor. */
interface Look {
  readonly date: string;
  readonly rowId: string;
  readonly reach: Readonly<Record<string, ReturnType<typeof webReach>>>;
  readonly people: ReadonlyMap<
    string,
    { age: number; factor: number; reads: boolean; links: string[] }
  >;
  /** Counted people in the town of each death outcome's ages. */
  readonly counted: Readonly<Record<string, number>>;
}

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "health-played");
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
  const changeTo = Object.fromEntries(
    LAWS.map((series) => [series, atBase[series] === 1 ? 0 : 1]),
  ) as Record<string, number>;
  const effective = addDays(makeIsoDate(core.date), 1);
  for (const series of LAWS)
    changeLaw(api, series, changeTo[series]!, effective);
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const townRows = () =>
    (months.rows() as unknown as WebMonth[])
      .filter((row) => row.placeId === town)
      .sort((a, b) => a.month.localeCompare(b.month));
  const moving = (row: WebMonth | undefined) =>
    new Set(
      FAMILY.filter(
        (link) => link.to in DEATHS && (row?.effects[link.key] ?? 0) !== 0,
      ).map((link) => link.key),
    );
  const looks: Look[] = [];
  // The counted people's month rows are kept only with bookkeeping on (a
  // debug switch, off for speed): it is on from the day a link into a death
  // outcome first moves the town's latest month to the 2nd of the next
  // month, so the counted month that reads it is kept.
  const seen = new Set<string>();
  let keepCountedUntil = "";
  let day = makeIsoDate(core.date);
  const end = addDays(day, DAYS);
  while (day < end) {
    const next = addDays(day, 1);
    if (keepCountedUntil && next > keepCountedUntil) {
      setBookkeeping(false);
      keepCountedUntil = "";
    }
    advanceCore(core, next);
    const fresh = [...moving(townRows().at(-1))].filter(
      (key) => !seen.has(key),
    );
    if (fresh.length) {
      for (const key of fresh) seen.add(key);
      setBookkeeping(true);
      keepCountedUntil = `${monthsAfter(next, 1).slice(0, 8)}02`;
    }
    if (next.slice(8, 10) === "04") {
      const people = new Map<
        string,
        { age: number; factor: number; reads: boolean; links: string[] }
      >();
      for (const person of core.people.values()) {
        if (!person.alive || person.placeId !== town) continue;
        const age = ageOnDate(makeIsoDate(person.birthDate), next);
        const factor = healthDeathWebOf(core, person.id);
        // The fifth whose factor the person carries, and the links whose
        // part reaches that subject (a link may reach some fifths only).
        const at = [undefined, ...FIFTHS].findIndex(
          (fifth) =>
            Math.abs(deathWebFactor(api, town, age, fifth).factor - factor) <
            1e-12,
        );
        const fifth = at > 0 ? FIFTHS[at - 1] : undefined;
        const links =
          at < 0
            ? []
            : Object.entries(DEATHS)
                .filter(([, ages]) => age >= ages.from && age < ages.below)
                .flatMap(([measure]) =>
                  webReach(api, town, measure, {
                    age,
                    ...(fifth === undefined ? {} : { incomeFifth: fifth }),
                  })
                    .parts.filter((part) => part.weight !== 0)
                    .map((part) => part.link),
                );
        people.set(person.id, { age, factor, reads: at >= 0, links });
      }
      looks.push({
        date: next,
        rowId: townRows().at(-1)!.id,
        reach: Object.fromEntries(
          Object.entries(DEATHS).map(([measure, ages]) => [
            measure,
            webReach(api, town, measure, { age: ages.from }),
          ]),
        ),
        people,
        counted: Object.fromEntries(
          Object.entries(DEATHS).map(([measure, ages]) => [
            measure,
            (countedHouseholdsByPlace(core).get(town) ?? [])
              .flatMap((record) => record.people)
              .filter((person) => {
                const age = ageOnDate(makeIsoDate(person.birthDate), next);
                return age >= ages.from && age < ages.below;
              }).length,
          ]),
        ),
      });
    }
    day = next;
  }
  const counts = (
    api.moduleState(RENEWAL_MODULE_ID).table("counts").rows() as unknown as {
      id?: string;
      month: string;
      placeId?: string;
      webDeathRecordId: string | null;
    }[]
  ).filter((row) => !row.placeId || row.placeId === town);
  return {
    core,
    place,
    drawSeed,
    atBase,
    changeTo,
    effective,
    rows: townRows(),
    looks,
    counts,
  };
}

describe(`health laws reach people's death risk on the web's own lags in a played world (seed ${seed})`, () => {
  it("each law's links run while the law a lag earlier differs from the base, and the death engine reads them for full and counted people", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      const run = play(seed);
      const { atBase, effective, rows, looks, counts } = run;
      const where = `${run.place.name}, ${run.place.state}, seed ${run.drawSeed}`;
      const byId = new Map(rows.map((row) => [row.id, row]));
      const api = coreAPI(run.core);
      const sign = (x: number) => Math.sign(x) || 0;

      // Every link the web runs from these laws moves a month only while the
      // law as it stood a lag earlier differs from the base, in the
      // direction of the difference, and stops the day the law is back at
      // the base; a link that acts only under another law (the work
      // requirement under the Medicaid expansion) moves only while that law
      // stood a lag earlier too. A legislature in the played world may
      // change a law again.
      const expected = (row: (typeof WEB_LINKS)[number], date: string) => {
        const series = seriesOf(row);
        const base = atBase[series]!;
        // Before the calibration date a law stands as it did then.
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
      // A change the world kept for the link's lag must have run it.
      const kept = (row: (typeof FAMILY)[number]) =>
        rows.some((month) => expected(row, month.date).sign !== 0);
      for (const row of MUST_RUN.filter(kept))
        expect(
          firstMoved.get(row.key),
          `${where}: ${row.key} ran`,
        ).toBeDefined();
      const ran = MUST_RUN.filter((row) => firstMoved.has(row.key));
      expect(
        ran.filter((row) => row.to in DEATHS).length,
        `${where}: a link into a death outcome ran`,
      ).toBeGreaterThan(0);

      // The death engine's look that first reads each link into a death
      // outcome, the full people of its ages who carry that month's factor,
      // and a counted month reading a month the link moved.
      const reads = ran
        .filter((row) => row.to in DEATHS)
        .map((row) => {
          const at = looks.findIndex((look) =>
            look.reach[row.to]!.parts.some((part) => part.link === row.key),
          );
          expect(
            at,
            `${where}: the death engine read ${row.key}`,
          ).toBeGreaterThanOrEqual(0);
          const look = looks[at]!;
          const before = looks[at - 1];
          const month = byId.get(look.rowId)!;
          const part = look.reach[row.to]!.parts.find(
            (p) => p.link === row.key,
          )!;
          expect(
            month.date >= monthsAfter(effective, row.lagMonths),
            `${where}: ${row.key} read ${month.id}`,
          ).toBe(true);
          expect(part.effect, `${where}: ${row.key} in ${month.id}`).toBe(
            month.effects[row.key],
          );
          expect(
            before?.reach[row.to]!.parts.some((p) => p.link === row.key) ??
              false,
            `${where}: ${row.key} not read before ${look.date}`,
          ).toBe(false);
          const ages = DEATHS[row.to]!;
          const people = [...look.people].filter(
            ([id, person]) =>
              person.age >= ages.from &&
              person.age < ages.below &&
              person.reads &&
              person.links.includes(row.key) &&
              person.factor !== (before?.people.get(id)?.factor ?? 1),
          );
          const counted = counts.filter(
            (c) =>
              c.webDeathRecordId !== null &&
              (byId.get(c.webDeathRecordId)?.effects[row.key] ?? 0) !== 0,
          );
          // A town small enough to be all full people has no counted month to read it.
          if (look.counted[row.to]! > 0)
            expect(
              counted.length,
              `${where}: a counted month read a month ${row.key} moved (${counts
                .slice(-4)
                .map((c) => `${c.month} read ${c.webDeathRecordId}`)
                .join("; ")})`,
            ).toBeGreaterThan(0);
          const inAges = [...look.people.values()].filter(
            (person) => person.age >= ages.from && person.age < ages.below,
          ).length;
          // An infant is rare in a small town; every other link's ages have full people.
          if (ages.below > 1)
            expect(
              people.length,
              `${where}: full people aged ${ages.from} to ${ages.below - 1} carry ${month.id} (${inAges} in the town)`,
            ).toBeGreaterThan(0);
          return { row, look, before, month, part, people, inAges, counted };
        });

      console.log(
        [
          `health played: ${where}; laws changed from ${effective}, ${DAYS} days played`,
          ...LAWS.map(
            (series) =>
              `${series}: ${atBase[series] === 1 ? "in force at the base, repealed" : "not in force at the base, enacted"}`,
          ),
          ...running.map((row) =>
            firstMoved.has(row.key)
              ? `${row.key} (lag ${row.lagMonths}): first runs in ${firstMoved.get(row.key)!.id} (written ${firstMoved.get(row.key)!.date}), effect ${firstMoved.get(row.key)!.effects[row.key]}`
              : `${row.key} (lag ${row.lagMonths}): no effect in all ${rows.length} months: in none did the law a lag before differ from the base where the link acts (due ${monthsAfter(effective, row.lagMonths)})`,
          ),
          ...reads.map((r) => {
            const one = r.people[0];
            return `${r.row.key}: death engine read ${r.month.id} on ${r.look.date} (part ${r.part.effect}, weight ${r.part.weight}, factor at age ${DEATHS[r.row.to]!.from} ${r.look.reach[r.row.to]!.factor}); ${r.people.length} of ${r.inAges} full people aged ${DEATHS[r.row.to]!.from} to ${DEATHS[r.row.to]!.below - 1} carry it${one ? `, e.g. ${one[0]} (age ${one[1].age}) ${r.before?.people.get(one[0])?.factor ?? 1} -> ${one[1].factor}` : ""}; ${r.look.counted[r.row.to]} counted people of those ages, counted months ${r.counted.map((c) => `${c.month} (${c.webDeathRecordId})`).join(", ") || "none"}`;
          }),
        ].join("\n"),
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 3_600_000);
});
