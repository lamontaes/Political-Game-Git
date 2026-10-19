/* eslint-disable @typescript-eslint/no-explicit-any -- module rows are read untyped by this tooling */
/**
 * One officeholder's year, as the simulation lives it (owner, Oct 19: "start
 * as the president and see what the simulation does for their life ... work
 * backwards, not authoring scenes"). Development tooling: nothing here words
 * anything for play.
 *
 *   npm run words:life -- --id life-1 --seed life-1 [--role president] [--days 365]
 *
 * A place is drawn from all 56 by the seed and built as the bench builds it.
 * The officeholder of `--role` (an office kind: president, governor, mayor,
 * ...) and everyone they know are watched by the story director, the year
 * runs, and the page lists, in plain dates, everything the records hold for
 * them: their past, every event that names them, every moment the director
 * noted and every scene it staged, with the scene's opening as the engine
 * words it. What never happened is listed as a gap, never filled in.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import { composeScene } from "../../src/director/scene";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const id = option("id", "life-1");
const seed = option("seed", id);
const role = option("role", "president");
const days = Number(option("days", "365"));

/** A date as people read it: "November 1, 2026" (owner, Oct 19). */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const said = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
};

setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "life-page");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core as CoreState;
const api = coreAPI(core);
const rows = (module: string, table: string): any[] => {
  try {
    return api.moduleState(module).table(table).rows() as any[];
  } catch {
    return [];
  }
};
const offices = new Map<string, any>(
  rows("core2-offices-v1", "offices").map((row) => [row.id, row]),
);
const term = rows("core2-offices-v1", "terms").find(
  (row) => row.status === "serving" && offices.get(row.officeId)?.kind === role,
);
if (!term) {
  console.error(`No serving ${role} in ${place.name}.`);
  process.exit(1);
}
const personId: string = term.personId;
const person = core.people.get(personId as never) as any;
const circle = [
  personId,
  ...(person?.familyIds ?? []),
  ...(person?.knownIds ?? []),
];
for (const who of circle) world.director.watch(core, who);
const startDate = core.date;
advanceCore(core, addDays(makeIsoDate(core.date), days));

const nameOf = (who: string) => {
  const row = core.people.get(who as never) as any;
  return row ? `${row.givenName} ${row.familyName}` : who;
};
const mentions = (value: unknown) =>
  JSON.stringify(value).includes(personId) ||
  JSON.stringify(value).includes(String(term.id));

// Everything the records hold for this person.
const past = (person?.pastFacts ?? []).map((fact: any) => ({
  date: said(fact.date),
  kind: fact.kind,
  summary: fact.summary,
}));
const events = [...core.durableLog.values()]
  .filter((event: any) => event.date >= startDate && mentions(event))
  .map((event: any) => ({
    date: said(event.date),
    kind: event.kind,
    facts: event.facts ?? {},
  }));
const book = world.director.ledger.people.get(personId as never);
const moments = (book?.moments ?? []).map((moment: any) => ({
  date: said(moment.date),
  label: moment.label,
  cause: moment.causeId,
}));
const scenes = (book?.schedule ?? []).map((entry: any) => {
  const scene = composeScene(core, world.director, personId as never, entry);
  return {
    date: said(entry.date),
    outcome: entry.outcome,
    types: entry.bindings.map((row: any) => row.typeKey),
    narration: scene?.narration.map((line: any) => line.text) ?? [],
  };
});
const family = [...(person?.familyIds ?? [])].map(nameOf);

const out = {
  id,
  seed,
  place: place.name,
  role,
  person: { id: personId, name: nameOf(personId), tier: person?.tier },
  office: offices.get(term.officeId)?.title ?? term.officeId,
  from: said(startDate),
  to: said(core.date),
  family,
  known: (person?.knownIds?.size ?? 0) as number,
  past,
  events,
  moments,
  scenes,
};
mkdirSync("/tmp/claude-0/lives", { recursive: true });
writeFileSync(
  `/tmp/claude-0/lives/${id}.json`,
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(
  `${out.person.name}, ${out.office}, ${place.name}: ${past.length} past facts, ${events.length} events, ${moments.length} moments, ${scenes.length} scenes staged (/tmp/claude-0/lives/${id}.json)`,
);
