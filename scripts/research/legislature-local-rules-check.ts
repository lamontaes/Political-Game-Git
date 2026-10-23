/**
 * Checks the legislature research tables of Oct 23, 2026 against the tables
 * the engines read today, and reports where a chamber's own rule differs from
 * the stand-in the engine uses. Exit 1 on any mismatch.
 *
 * - data/research/gov/chamber-committee-appointment-2026.json: who appoints
 *   each chamber's standing committees. One row per chamber row of
 *   chamber-leadership.json (Congress aside); a SOURCED row quotes the
 *   chamber's rule; an ESTIMATED row must equal its template's default, so a
 *   stand-in never drifts from the table it names.
 *
 *   node --import tsx scripts/research/legislature-local-rules-check.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));

export const COMMITTEE_APPOINTMENT_PATH =
  "data/research/gov/chamber-committee-appointment-2026.json";
const LEADERSHIP_PATH = "data/research/legislature/chamber-leadership.json";

const errors: string[] = [];
const fail = (message: string) => errors.push(message);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const APPOINTERS = new Set([
  "speaker",
  "senate-president",
  "president-pro-tempore",
  "majority-leader",
  "party-caucuses",
  "committee-on-committees",
  "chamber-election",
  "seniority",
  "council-chair",
  "council-president",
  "presiding-officer",
]);
/** Chairs may also be chosen by a vote of the chamber, the council or the majority caucus. */
const CHAIR_PICKERS = new Set([
  ...APPOINTERS,
  "chamber-vote",
  "council-vote",
  "majority-caucus",
]);
const MINORITY = new Set([
  "minority-leader",
  "minority-leader-nominates",
  "minority-leader-approves",
]);

interface LeadershipData {
  readonly tables: Record<string, readonly { id: string; value: unknown }[]>;
  readonly rows: readonly {
    jurisdictionKey: string;
    chamberKey: string;
    templateId: string;
  }[];
}
interface AppointmentRow {
  readonly jurisdictionKey?: unknown;
  readonly chamberKey?: unknown;
  readonly templateId?: unknown;
  readonly membersAppointedBy?: unknown;
  readonly minorityMembersBy?: unknown;
  readonly chairsAppointedBy?: unknown;
  readonly tag?: unknown;
  readonly rule?: unknown;
  readonly sourceUrl?: unknown;
  readonly quote?: unknown;
  readonly estimatedFrom?: unknown;
}

/** The engine's stand-in: what leadership.ts reads for each chamber template. */
function templateDefaults(lead: LeadershipData): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of lead.tables.assignmentAuthority ?? [])
    out.set(row.id.split(":")[0]!, String(row.value));
  return out;
}

/** How leadership.ts `assigner()` treats an appointer: the presiding officer, or the majority leader. */
const engineSide = (appointer: string) =>
  /^(speaker|senate-president|president-pro-tempore|council-president|council-chair|presiding-officer)$/.test(
    appointer,
  )
    ? "presiding officer"
    : "majority leader or a panel";

function checkCommittees(): void {
  const lead = read(LEADERSHIP_PATH) as LeadershipData;
  const data = read(COMMITTEE_APPOINTMENT_PATH) as {
    readonly retrievedOn?: unknown;
    readonly rows?: readonly AppointmentRow[];
  };
  const defaults = templateDefaults(lead);
  if (data.retrievedOn !== "2026-10-23") fail("committees: retrievedOn");
  const expected = new Map(
    lead.rows
      .filter((r) => r.jurisdictionKey !== "US")
      .map((r) => [`${r.jurisdictionKey}:${r.chamberKey}`, r.templateId]),
  );
  const seen = new Set<string>();
  let sourced = 0;
  const differs: string[] = [];
  for (const row of data.rows ?? []) {
    const key = `${String(row.jurisdictionKey)}:${String(row.chamberKey)}`;
    const where = `committees ${key}`;
    if (seen.has(key)) fail(`${where}: listed twice`);
    seen.add(key);
    const template = expected.get(key);
    if (!template) {
      fail(`${where}: no such chamber in ${LEADERSHIP_PATH}`);
      continue;
    }
    if (row.templateId !== template)
      fail(`${where}: templateId ${String(row.templateId)}, not ${template}`);
    const by = String(row.membersAppointedBy);
    if (!APPOINTERS.has(by)) fail(`${where}: appointer ${by}`);
    if (
      row.chairsAppointedBy !== null &&
      row.chairsAppointedBy !== undefined &&
      !CHAIR_PICKERS.has(String(row.chairsAppointedBy))
    )
      fail(`${where}: chair appointer ${String(row.chairsAppointedBy)}`);
    if (
      row.minorityMembersBy !== undefined &&
      !MINORITY.has(String(row.minorityMembersBy))
    )
      fail(`${where}: minority appointer ${String(row.minorityMembersBy)}`);
    if (row.tag === "SOURCED") {
      sourced += 1;
      if (!text(row.rule) || !text(row.quote))
        fail(`${where}: SOURCED without its rule and quote`);
      if (!text(row.sourceUrl) || !row.sourceUrl.startsWith("https://"))
        fail(`${where}: SOURCED without an https sourceUrl`);
      if (engineSide(by) !== engineSide(defaults.get(template) ?? ""))
        differs.push(
          `${key} (${by}; the engine uses ${defaults.get(template)})`,
        );
    } else if (row.tag === "ESTIMATED") {
      if (!text(row.estimatedFrom))
        fail(`${where}: ESTIMATED without estimatedFrom`);
      if (by !== defaults.get(template))
        fail(
          `${where}: ESTIMATED ${by} is not the ${template} default ${defaults.get(template)}`,
        );
    } else fail(`${where}: tag ${String(row.tag)}`);
  }
  for (const key of expected.keys())
    if (!seen.has(key)) fail(`committees ${key}: missing`);
  console.log(
    `committees: ${seen.size} chambers, ${sourced} from their own rule; ${differs.length} seat committees through a different hand than the engine's stand-in:`,
  );
  for (const line of differs) console.log(`  ${line}`);
}

checkCommittees();
if (errors.length) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log("legislature local rules: ok");
