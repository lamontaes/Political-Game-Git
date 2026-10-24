/**
 * One played year in a drawn place, read against the legislature research of
 * Oct 23, 2026: for the drawn place's own chambers, who seated each committee
 * (the leadership records) beside who the chamber's rule says appoints it;
 * for its town and county bodies, the number and enacting clause each
 * ordinance carries beside what the state's law gives; and the bills an
 * executive brought through a member beside the place's general-law mode.
 * One run, one number; the seed is drawn unless one is passed.
 *
 *   node --import tsx scripts/research/legislature-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { lawChain } from "../../src/core2/modules/laws";

const root = resolve(import.meta.dirname, "../..");
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;

interface Appointment {
  jurisdictionKey: string;
  chamberKey: string;
  membersAppointedBy: string;
  tag: string;
  rule?: string;
}
const committees = read<{ rows: Appointment[] }>(
  "data/research/gov/chamber-committee-appointment-2026.json",
).rows;
interface Clause {
  clause?: string;
  template?: string;
  tag: string;
  statute?: string;
  appliesTo?: string;
  kinds?: string[];
  /** Further clauses the same level's law gives other classes or kinds of place (a first-class city, a village). */
  alsoSourced?: Clause[];
}
const ordinance = read<{
  places: Record<string, Record<"municipal" | "county" | "numbering", Clause>>;
}>("data/research/gov/local-ordinance-style-2026.json").places;
const executive = read<{
  places: Record<
    string,
    Record<"mayor" | "countyExecutive", { mode: string; tag: string }>
  >;
}>("data/research/gov/local-executive-introduction-2026.json").places;

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const stateKey = lawChain(api).stateKey;
const postal = stateKey.replace(/^US-/, "");
console.log(
  `${world.place.displayName} (${stateKey}), seed ${seed}, ${core.people.size} people, from ${core.date}`,
);
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
console.log(`played to ${core.date}`);

interface OfficeRow {
  id: string;
  kind: string;
  jurisdiction: string;
}
const offices = new Map(
  (
    api
      .moduleState("core2-offices-v1")
      .table("offices")
      .rows() as unknown as OfficeRow[]
  ).map((o) => [o.id, o]),
);
const chamberKeyOf = (kind: string) =>
  kind === "legislature-upper"
    ? "senate"
    : kind === "legislature-lower"
      ? "house"
      : kind === "legislature-unicameral"
        ? "legislature"
        : null;

// 1. Committees: who seated each committee in the drawn place's chambers.
console.log(
  "\nCommittee appointment (research row beside the leadership records):",
);
const seated = api
  .moduleState("core2-leadership-v1")
  .table("committees")
  .rows() as unknown as {
  id: string;
  chamber: string;
  assignedBy: string;
}[];
for (const row of committees.filter((r) => r.jurisdictionKey === stateKey)) {
  const chamberIds = [...offices.values()]
    .filter(
      (o) =>
        o.jurisdiction === stateKey && chamberKeyOf(o.kind) === row.chamberKey,
    )
    .map((o) => o.id);
  const records = seated.filter((s) => chamberIds.includes(s.chamber));
  const by = [...new Set(records.map((r) => r.assignedBy))];
  console.log(
    `  ${row.chamberKey}: research ${row.membersAppointedBy} (${row.tag}${row.rule ? `, ${row.rule}` : ""}); played world: ${records.length} committees seated by ${by.join(", ") || "none"}${records[0] ? ` (e.g. ${records[0].id})` : ""}`,
  );
}

// 2. Ordinances: the number and enacting clause each local bill carries.
console.log("\nLocal ordinance form (state law beside the bills drafted):");
const research = ordinance[postal];
for (const level of ["municipal", "county", "numbering"] as const) {
  const r = research?.[level];
  for (const each of r ? [r, ...(r.alsoSourced ?? [])] : [undefined])
    console.log(
      `  ${level}: ${each?.clause ?? each?.template ?? "none"} (${each?.tag ?? "no row"}${each?.statute ? `, ${each.statute}${each.appliesTo ? `, ${each.appliesTo}` : ""}${each.kinds ? `; covers ${each.kinds.join(", ")}` : ""}` : ""})`,
    );
}
interface BillRow {
  id: string;
  number: string;
  bodyOfficeId: string;
  sponsorId: string;
  requestedBy?: string;
  form?: { kind: string; enactingClause: string };
}
const bills = api
  .moduleState("core2-legislature-v1")
  .table("bills")
  .rows() as unknown as BillRow[];
const local = bills.filter((b) => b.form?.kind === "ordinance");
const clauses = new Map<string, string[]>();
for (const b of local)
  clauses.set(b.form!.enactingClause, [
    ...(clauses.get(b.form!.enactingClause) ?? []),
    `${b.id} (${b.number})`,
  ]);
console.log(`  played world: ${local.length} ordinances drafted`);
for (const [clause, ids] of clauses)
  console.log(
    `    "${clause}": ${ids.length}, e.g. ${ids.slice(0, 2).join(", ")}`,
  );

// 3. Executive bills: brought through a member at the executive's request.
console.log(
  "\nExecutive bill introduction (general-law mode beside the bills):",
);
const modes = executive[postal];
console.log(
  `  research: mayor ${modes?.mayor.mode} (${modes?.mayor.tag}), county executive ${modes?.countyExecutive.mode} (${modes?.countyExecutive.tag})`,
);
const requested = bills.filter((b) => b.requestedBy);
const byBody = new Map<string, string[]>();
for (const b of requested) {
  const kind = offices.get(b.bodyOfficeId)?.kind ?? "unknown";
  byBody.set(kind, [...(byBody.get(kind) ?? []), b.id]);
}
console.log(
  `  played world: ${requested.length} bills carried at someone's request`,
);
for (const [kind, ids] of byBody)
  console.log(`    ${kind}: ${ids.length}, e.g. ${ids.slice(0, 2).join(", ")}`);
