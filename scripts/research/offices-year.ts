/**
 * Offices and statewide parties against a played year (pool item
 * research-offices-sourced-parameters).
 *
 * At the opening it lists every state office covering the drawn town: the
 * term in progress, the day it ends, and whether that day comes from the
 * state's own clause in the term-starts table (SOURCED or ESTIMATED) or the
 * table's default; for a statewide executive office, the holder's party and
 * whether the statewide-parties research row was checked against a live page.
 * Then it plays one year and lists each term that began in it, with the row
 * its start day came from.
 *
 * Usage: node --import tsx scripts/research/offices-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { officeFamily } from "../../src/core2/elections-calendar";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import type { OfficeInput } from "../../src/core2/offices-local";

interface StartRow {
  tag: string;
  citation?: string;
}
const termStarts = JSON.parse(
  readFileSync("src/core2/data/elections/term-starts.json", "utf8"),
) as { states: Record<string, Record<string, StartRow>> };
const parties = JSON.parse(
  readFileSync(
    "data/research/offices/statewide-executive-parties-2026.json",
    "utf8",
  ),
) as {
  sources: { id: string }[];
  places: Record<
    string,
    Record<string, { party: string | null; sourceId: string; status?: string }>
  >;
};

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const rows = (name: string) =>
  [...api.moduleState(OFFICES_MODULE_ID).table(name).rows()] as unknown as {
    id: string;
    [field: string]: unknown;
  }[];
const offices = new Map(
  rows("offices").map((row) => [row.id, row as unknown as OfficeInput]),
);
const stateKey = [...offices.values()].find(
  (o) => o.level === "state",
)?.jurisdiction;
console.log(
  `${world.place.displayName}, seed ${seed}, from ${core.date}; state ${stateKey}`,
);

const startRow = (office: OfficeInput) => {
  const key = office.jurisdiction.slice(0, 5);
  const row = termStarts.states[key]?.[officeFamily(office)];
  return row ? `${row.tag} ${key} ${officeFamily(office)}` : "default (01-01)";
};
const partyRow = (office: OfficeInput) => {
  const key = office.id.split(":").at(-1) ?? "";
  const row = parties.places[office.jurisdiction]?.[key];
  if (!row) return "";
  return `; party ${row.party ?? "none"} (${row.status ?? row.sourceId})`;
};
const describe = (term: Record<string, unknown>) => {
  const office = offices.get(String(term.officeId));
  if (!office) return null;
  return { office, line: `${office.title} [${office.kind}]` };
};

console.log("\nState offices serving at the opening:");
const seen = new Set<string>();
for (const term of rows("terms")) {
  if (term.status !== "serving") continue;
  const found = describe(term);
  if (!found || found.office.level !== "state") continue;
  // One line per office: a legislature's seats share their office's rule.
  if (seen.has(found.office.id)) continue;
  seen.add(found.office.id);
  console.log(
    `  ${found.line}: ends ${term.endDate ?? "not read"} (${startRow(found.office)})${partyRow(found.office)}; record ${term.id}`,
  );
}

const start = makeIsoDate(core.date);
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(start, 365);
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));

console.log(`\nTerms that began from ${start} to ${core.date}:`);
let began = 0;
for (const term of rows("terms")) {
  const startDate = String(term.startDate);
  if (startDate <= start || startDate > core.date) continue;
  const found = describe(term);
  if (!found) continue;
  began += 1;
  console.log(
    `  ${startDate} ${found.line} (${found.office.level}; ${startRow(found.office)}), reached by ${String(term.reached)}; record ${term.id}`,
  );
}
console.log(`${began} terms began in the year.`);
