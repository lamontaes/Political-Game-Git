/**
 * Estates in a played world: each death's debts paid first, then probate,
 * then the heirs by the will or by the intestate order, by record id.
 * Run: node --import tsx scripts/core2-year/estates-proof.ts [seed] [years]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] || randomBytes(6).toString("hex");
const years = Number(process.argv[3] ?? 2);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
console.log(`${world.place.displayName}, seed ${seed}, ${years} year(s)`);
const money: { id: string; date: string; amountMinor: number }[] = [];
const settled: { id: string; date: string; facts: Record<string, string> }[] =
  [];
const deaths: { id: string; date: string }[] = [];
const post = api.postJournal.bind(api);
api.postJournal = ((entry: Parameters<typeof post>[0]) => {
  if (/^estate/.test(entry.sourceRef.id))
    money.push({
      id: entry.sourceRef.id,
      date: entry.date,
      amountMinor:
        entry.postings.find((row) => row.deltaMinor > 0)?.deltaMinor ?? 0,
    });
  return post(entry);
}) as typeof api.postJournal;
const emit = api.emit.bind(api);
api.emit = ((event: Parameters<typeof emit>[0]) => {
  if (event.kind === "estate.settled")
    settled.push({
      id: event.id,
      date: event.date,
      facts: { ...(event.facts ?? {}) },
    });
  if (event.kind === "life.death")
    deaths.push({ id: event.id, date: event.date });
  return emit(event);
}) as typeof api.emit;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
dev.advance(addDays(makeIsoDate(core.date), 365 * years));

const $ = (minor: number) => (minor / 100).toFixed(2);
console.log(
  `${deaths.length} deaths; ${settled.length} estates settled through probate`,
);
for (const row of [...settled]
  .sort(
    (a, b) =>
      (a.facts.by === "escheat" ? 1 : 0) - (b.facts.by === "escheat" ? 1 : 0),
  )
  .slice(0, 8)) {
  const decedent = row.facts.decedentId!;
  const death = deaths.find((d) => d.id.includes(decedent));
  const debts = money.filter((m) =>
    m.id.startsWith(`estate-debt:${decedent}:`),
  );
  console.log(
    `  ${row.id}: died ${death?.date ?? "?"} (${death?.id ?? "?"}); by ${row.facts.by}; estate ${$(Number(row.facts.estateMinor))}; debts paid first ${debts.length} (${$(debts.reduce((n, d) => n + d.amountMinor, 0))}); heirs ${row.facts.heirs}`,
  );
}
for (const death of deaths) {
  const id = death.id
    .replace(/^life\.death:/, "")
    .replace(/:\d{4}-\d{2}-\d{2}$/, "");
  if (settled.some((row) => row.facts.decedentId === id)) continue;
  const person = core.people.get(id);
  const kin = [...(person?.familyIds ?? [])].filter(
    (k) => core.people.get(k)?.alive,
  ).length;
  console.log(
    `  not yet settled: ${death.id}: cash now ${$(person?.liquidMinor ?? 0)}, debts paid ${$(money.filter((m) => m.id.startsWith(`estate-debt:${id}:`)).reduce((n, m) => n + m.amountMinor, 0))}, ${kin} living kin, ${id.startsWith("official") ? "official" : "resident"}`,
  );
}
