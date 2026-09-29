/**
 * RENT IN A WATCHED WORLD — what renters paid, what it took of their pay, and
 * what each housing law changed, read from a kept world report run.
 *
 *   npm run world:report -- --years 5 --seed round-1 --place 1714000 \
 *     --keep test-results/world-report/chicago-round-1.run.json
 *   npm run world:rent -- --from test-results/world-report/chicago-round-1.run.json \
 *     [--out test-results/world-report/chicago-round-1.rent.json]
 *
 * Every figure is read from records the world saved: leases, their terms,
 * each month's rent outcome, eviction events and the law in force. Nothing is
 * simulated here. A development tool, never part of play.
 */
import { readFileSync, writeFileSync } from "node:fs";

import type { EntityId, IsoDate, World } from "../../src/simulation";
import { addDays } from "../../src/simulation/dates";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { TOWN_HOME_EVENTS } from "../../src/simulation/living-world/town-homes";
import {
  RENT_EVENTS,
  RENT_LAW_KEYS,
  townLeases,
  townRentSnapshot,
  type TownRentSnapshot,
} from "../../src/simulation/living-world/town-rent";
import { deserializeWorld } from "../../src/simulation/serialization";

interface SavedRun {
  readonly world: unknown;
  readonly anchorPersonId?: EntityId;
}

function monthStarts(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  let [year, month] = from.split("-").map(Number) as [number, number];
  for (;;) {
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    const day = `${year}-${String(month).padStart(2, "0")}-01` as IsoDate;
    if (day > to) return days;
    days.push(day);
  }
}

function dollars(minor: number | null): string {
  return minor === null
    ? "unknown"
    : `$${Math.round(minor / 100).toLocaleString("en-US")}`;
}

function pct(share: number | null): string {
  return share === null ? "unknown" : `${(share * 100).toFixed(1)}%`;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Every change in the law in force on a housing question here, in order. */
function lawChanges(
  world: World,
  town: EntityId,
  key: string,
  days: IsoDate[],
) {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === key);
  if (!proposition) return [];
  const changes: {
    on: IsoDate;
    answer: string;
    measure: string;
    level: string;
  }[] = [];
  let last: string | null = null;
  const start = days[0]!;
  for (
    let day = addDays(start, -31);
    day <= world.currentDate;
    day = addDays(day, 1)
  ) {
    const law = lawInForce(world, town, proposition.id, day);
    const answer = law?.answer ?? "unknown";
    if (answer === last) continue;
    const measure = world.history.legislativeMeasures?.find(
      (row) => row.id === law?.measureId,
    );
    changes.push({
      on: day,
      answer,
      measure: measure
        ? `${measure.designation} ${measure.shortTitle}`
        : law
          ? "the law the game began with"
          : "no law on record",
      level: law?.level ?? "none",
    });
    last = answer;
  }
  return changes;
}

export function rentReport(world: World, town: EntityId) {
  const leases = townLeases(world).filter((lease) => lease.town === town);
  const first = leases.reduce<IsoDate | null>(
    (min, lease) =>
      min === null || lease.flow.startsAt < min ? lease.flow.startsAt : min,
    null,
  );
  if (!first) return null;
  const days = monthStarts(first, world.currentDate);
  const snapshots = days.map((day) => townRentSnapshot(world, town, day));
  const byYear = new Map<string, TownRentSnapshot[]>();
  for (const snapshot of snapshots) {
    const year = snapshot.onDate.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), snapshot]);
  }
  const years = [...byYear].map(([year, rows]) => ({
    year,
    months: rows.length,
    leases: median(rows.map((row) => row.leases)),
    medianRentDue: median(rows.flatMap((row) => row.medianRentMinor ?? [])),
    medianRentPaid: median(rows.flatMap((row) => row.medianPaidMinor ?? [])),
    medianBurden: median(rows.flatMap((row) => row.medianBurden ?? [])),
    burdenedShare: median(rows.flatMap((row) => row.burdenedShare ?? [])),
    monthsPaid: rows.reduce((sum, row) => sum + row.paid, 0),
    monthsShort: rows.reduce((sum, row) => sum + row.short, 0),
    monthsUnknown: rows.reduce((sum, row) => sum + row.unknown, 0),
    landlords: rows.at(-1)!.byLandlord,
    regimes: rows.at(-1)!.byRegime,
  }));

  const leaseTags = new Set(
    leases.map((lease) => `town-rent-v1:lease:${lease.flow.id}`),
  );
  const evictions = world.history.events.filter(
    (event) =>
      event.type.startsWith("housing.") &&
      event.tags.some((tag) => leaseTags.has(tag)),
  );
  const count = (type: string, from: IsoDate, to: IsoDate) =>
    evictions.filter(
      (event) =>
        event.type === type &&
        event.occurredAt >= from &&
        event.occurredAt < to,
    ).length;
  const renterMoves = (from: IsoDate, to: IsoDate) =>
    world.history.events.filter(
      (event) =>
        event.jurisdictionId === town &&
        event.type === TOWN_HOME_EVENTS.moved &&
        event.occurredAt >= from &&
        event.occurredAt < to,
    ).length;

  const flows = new Set(leases.map((lease) => lease.flow.id));
  const capped = world.history.resourceFlowTerms
    .filter(
      (row) =>
        flows.has(row.resourceFlowId) &&
        row.reason?.startsWith("Rent stabilization under"),
    )
    .map((row) => {
      const sought = /sought \$([\d,]+)/.exec(row.reason ?? "");
      return {
        on: row.effectiveAt,
        heldBackMinor: sought
          ? Number(sought[1]!.replace(/,/g, "")) * 100 - row.amount.minorUnits
          : 0,
      };
    });
  const renewals = world.history.resourceFlowTerms.filter(
    (row) =>
      flows.has(row.resourceFlowId) && /:renewal:\d+$/.test(row.stableKey),
  );

  const end = addDays(world.currentDate, 1);
  const laws = Object.entries(RENT_LAW_KEYS).map(([name, key]) => {
    const changes = lawChanges(world, town, key, days);
    const effects = changes
      .filter((change) => change.answer === "yes" && change.on > days[0]!)
      .map((change) => {
        const before =
          addDays(change.on, -365) < days[0]!
            ? days[0]!
            : addDays(change.on, -365);
        const after =
          addDays(change.on, 365) > end ? end : addDays(change.on, 365);
        const window = (from: IsoDate, to: IsoDate) => ({
          from,
          to,
          filings: count(RENT_EVENTS.filed, from, to),
          evictions: count(RENT_EVENTS.evicted, from, to),
          settled: count(RENT_EVENTS.settled, from, to),
          dismissed: count(RENT_EVENTS.dismissed, from, to),
          renterMoves: renterMoves(from, to),
          renewals: renewals.filter(
            (row) => row.effectiveAt >= from && row.effectiveAt < to,
          ).length,
          capped: capped.filter((row) => row.on >= from && row.on < to).length,
          heldBackPerMonth: capped
            .filter((row) => row.on >= from && row.on < to)
            .reduce((sum, row) => sum + row.heldBackMinor, 0),
          affordableLeases: leases.filter(
            (lease) =>
              lease.regime === "affordable" &&
              lease.flow.startsAt >= from &&
              lease.flow.startsAt < to,
          ).length,
          newLeases: leases.filter(
            (lease) => lease.flow.startsAt >= from && lease.flow.startsAt < to,
          ).length,
        });
        // The whole time in force: until the next recorded change of the
        // law, or the end of the run.
        const until = changes.find((later) => later.on > change.on)?.on ?? end;
        return {
          inForce: change.on,
          by: change.measure,
          level: change.level,
          before: window(before, change.on),
          after: window(change.on, after),
          whileInForce: window(change.on, until),
        };
      });
    return { name, key, changes, effects };
  });

  const all = {
    filings: count(RENT_EVENTS.filed, days[0]!, end),
    evictions: count(RENT_EVENTS.evicted, days[0]!, end),
    settled: count(RENT_EVENTS.settled, days[0]!, end),
    dismissed: count(RENT_EVENTS.dismissed, days[0]!, end),
    represented: evictions.filter((event) =>
      event.summary.includes("A lawyer represented"),
    ).length,
    renewals: renewals.length,
    capped: capped.length,
    leasesWritten: leases.length,
  };
  return { town, from: days[0], to: world.currentDate, years, all, laws };
}

function markdown(
  report: NonNullable<ReturnType<typeof rentReport>>,
  name: string,
) {
  const lines = [
    `# Rent in ${name}, ${report.from} to ${report.to}`,
    "",
    "| Year | Leases | Median rent due | Median rent paid | Median rent over pay | Paying over 30% | Months paid / short / unknown |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.years.map(
      (row) =>
        `| ${row.year} | ${row.leases} | ${dollars(row.medianRentDue)} | ${dollars(row.medianRentPaid)} | ${pct(row.medianBurden)} | ${pct(row.burdenedShare)} | ${row.monthsPaid} / ${row.monthsShort} / ${row.monthsUnknown} |`,
    ),
    "",
    `Leases written: ${report.all.leasesWritten}. Renewals: ${report.all.renewals}, ${report.all.capped} held down by rent stabilization. Eviction filings: ${report.all.filings}; ${report.all.evictions} evictions, ${report.all.settled} settled, ${report.all.dismissed} dropped once paid; ${report.all.represented} with a lawyer.`,
    "",
    "## Housing laws",
    "",
  ];
  for (const law of report.laws) {
    lines.push(
      `- **${law.name}**: ${law.changes.map((change) => `${change.answer} from ${change.on} (${change.measure}, ${change.level})`).join("; ")}`,
    );
    for (const effect of law.effects)
      lines.push(
        `  - In force ${effect.inForce} by ${effect.by}. Year before: ${JSON.stringify(effect.before)}. Year after: ${JSON.stringify(effect.after)}. While in force: ${JSON.stringify(effect.whileInForce)}.`,
      );
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1]! : fallback;
  };
  const from = opt("from", "");
  if (!from) throw new Error("Use --from <kept run.json>.");
  const saved = JSON.parse(readFileSync(from, "utf8")) as SavedRun & {
    anchorPersonId?: EntityId;
    placeName?: string;
  };
  const world = deserializeWorld(saved.world as never) as World;
  const anchor =
    saved.anchorPersonId ??
    (world.control.kind === "person" ? world.control.personId : null);
  if (!anchor) throw new Error("The run names no anchor person.");
  const town = world.people[anchor]!.homeJurisdictionId;
  const report = rentReport(world, town);
  if (!report) throw new Error("No leases in this run.");
  const out = opt("out", from.replace(/\.run\.json$/, ".rent.json"));
  writeFileSync(out, JSON.stringify(report, null, 1));
  const name = saved.placeName ?? world.jurisdictions[town]?.name ?? town;
  writeFileSync(out.replace(/\.json$/, ".md"), markdown(report, name));
  console.log(markdown(report, name));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
