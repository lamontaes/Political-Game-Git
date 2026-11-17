/**
 * Pins family 31 (#9747): the day's small shares come from each person's own
 * life. Builds a played world at each of three drawn places, plays one year,
 * and prints what each share was made of there: adults' reserved hours by the
 * people their home keeps, housemates' minutes together by their work weeks,
 * the counted adults' giving against the full members', and who made a will.
 * Every figure is read off the rows dev mode's Trace box opens.
 * Run: node --import tsx scripts/core2-year/pins-31-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { reserveHours } from "../../src/core2/free-block";
import { willOf, willReasons } from "../../src/core2/estates";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const out = (line: string) => process.stdout.write(`${line}\n`);
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "-");

out(`Pins family 31 proof, seed ${seed}`);
for (let draw = 0; draw < 3; draw += 1) {
  const place = drawPlace(seed, `pins-31-proof:${draw}`);
  const started = Date.now();
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const months: string[] = [];
  const end = addDays(makeIsoDate(core.date), 365);
  // Read the reserve at the opening and again at the year's end.
  const reserveBySize = () => {
    const by = new Map<number, number[]>();
    for (const person of core.people.values()) {
      if (!person.alive) continue;
      const age =
        (Date.parse(core.date) - Date.parse(person.birthDate)) / 3.15576e10;
      if (age < 18) continue;
      const size = Math.min(
        5,
        core.households.get(person.householdId)?.memberIds.length ?? 1,
      );
      by.set(size, [...(by.get(size) ?? []), reserveHours(api, person)]);
    }
    return [...by]
      .sort((a, b) => a[0] - b[0])
      .map(
        ([size, xs]) =>
          `${size}${size === 5 ? "+" : ""}:${f(mean(xs))}h(n${xs.length})`,
      )
      .join(" ");
  };
  const reserveOpen = reserveBySize();
  advanceCore(core, end);
  months.push(core.date);
  out(
    `\n== ${place.name} (${place.key}), place seed ${place.seed}, ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
  out(`reserved hours a day by home size, opening: ${reserveOpen}`);
  out(`reserved hours a day by home size, year end: ${reserveBySize()}`);

  const homes = api
    .moduleState("core2-people-p15-v1")
    .table("home-time")
    .rows() as unknown as {
    id: string;
    pairs: {
      a: string;
      b: string;
      family: boolean;
      homeA: number;
      homeB: number;
      minutesPerDay: number;
    }[];
  }[];
  const family = homes.flatMap((row) => row.pairs).filter((p) => p.family);
  const busy = family.filter((p) => Math.min(p.homeA, p.homeB) < 800);
  const free = family.filter((p) => Math.min(p.homeA, p.homeB) >= 800);
  const sorted = family.map((p) => p.minutesPerDay).sort((a, b) => a - b);
  out(
    `family pairs at home: ${family.length}; minutes a day together min ${f(sorted[0]!, 0)} median ${f(sorted[Math.floor(sorted.length / 2)]!, 0)} max ${f(sorted.at(-1)!, 0)}; with a worker ${f(mean(busy.map((p) => p.minutesPerDay)), 0)} (n${busy.length}), with nobody working ${f(mean(free.map((p) => p.minutesPerDay)), 0)} (n${free.length}); e.g. ${homes.find((row) => row.pairs.length)?.id ?? "-"}`,
  );

  const gifts = api
    .moduleState("core2-drives-p10-v1")
    .table("counted-giving")
    .rows() as unknown as {
    id: string;
    date: string;
    fullMembers: number;
    fullGivers: number;
    countedAdults: number;
    countedGivers: number;
    amountMinor: number;
  }[];
  out(
    `counted giving rows: ${gifts.length}; ${
      gifts
        .map(
          (row) =>
            `${row.id} (${row.date}): ${row.fullGivers} of ${row.fullMembers} members gave, so ${row.countedGivers} counted givers, $${f(row.amountMinor / 100)}`,
        )
        .join("; ") || "none in the year"
    }`,
  );

  // Who would leave a will if they died today, by age: age shows only
  // through what each life has saved and who it has to provide for.
  const bands = [
    ["18-39", 18, 40],
    ["40-64", 40, 65],
    ["65+", 65, 200],
  ] as const;
  const wills = bands.map(([label, low, high]) => {
    let n = 0,
      yes = 0;
    const months: number[] = [];
    for (const person of core.people.values()) {
      if (!person.alive) continue;
      const age =
        (Date.parse(core.date) - Date.parse(person.birthDate)) / 3.15576e10;
      if (age < low || age >= high) continue;
      n += 1;
      if (willOf(api, person)) yes += 1;
      const why = willReasons(api, person);
      months.push(why.estateMinor / Math.max(1, why.monthlyCostMinor));
    }
    months.sort((a, b) => a - b);
    return `${label}: ${f((100 * yes) / Math.max(1, n), 0)}% of ${n} (median ${f(months[Math.floor(months.length / 2)] ?? NaN, 1)} months saved)`;
  });
  out(`adults who would leave a will today: ${wills.join("; ")}`);
  const probate = api
    .moduleState("core2-estates-v1")
    .table("probate")
    .rows() as unknown as {
    id: string;
    will: unknown;
    willReasons?: {
      estateMinor: number;
      monthlyCostMinor: number;
      heirs: number;
      pull: number;
    };
  }[];
  const withWill = probate.filter((row) => row.will);
  out(
    `estates in probate: ${probate.length}, with a will ${withWill.length}; ${probate
      .slice(0, 8)
      .map(
        (row) =>
          `${row.id}: ${row.will ? "will" : "no will"}, ${row.willReasons ? `${f(row.willReasons.estateMinor / Math.max(1, row.willReasons.monthlyCostMinor), 1)} months saved, ${row.willReasons.heirs} heirs, pull ${f(row.willReasons.pull)}` : "-"}`,
      )
      .join("; ")}`,
  );
}
