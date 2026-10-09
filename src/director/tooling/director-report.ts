/**
 * P13 part 5: one watched life's year as structured lines, not prose, from a
 * year-runner receipt (director-year.ts). Developer report for the owner;
 * every line is read from the receipt, and names come from the core's
 * records. Nothing here is player text.
 *
 *   npx tsx src/director/tooling/director-report.ts --receipt <receipt.json>
 *     --person <id> [--output <file.md>]
 */
import { readFileSync, writeFileSync } from "node:fs";

interface Channel {
  channel: string;
  raw: number;
  scale: number;
  traitWeight: number;
  traits: { traitId: string; recorded: number; weight: number }[];
}
interface Echo {
  earlierId: string;
  earlierKind: string;
  otherId: string;
  reason: string;
  strength: number;
}
interface Moment {
  id: string;
  date: string;
  label: string;
  causeId: string;
  counterpartIds: string[];
  impact: number;
  hindsight: number;
  channels: Channel[];
  broadEventId?: string;
  echoes: Echo[];
}
interface Binding {
  typeKey: string;
  setting: { kind: string; recordId: string };
  roles: { role: string; personIds: string[]; bearing?: string }[];
}
interface Entry {
  momentId: string;
  outcome: string;
  rank: number;
  pace: number;
  stopsSkip: boolean;
  bindings: Binding[];
  coverage?: { reason: string; detail?: string };
}
interface ThreadRow {
  otherId: string;
  name: string;
  kin: string[];
  sharedHome: boolean;
  tie: number;
  closeness: number;
  lastContact?: string;
  importanceAtEnd: number;
  fadingAtEnd: number;
  turns: { date: string; turn: string }[];
  moments: number;
}
interface Life {
  id: string;
  name: string;
  birthDate: string;
  traits: Record<string, number>;
  observedDays: number;
  quietDays: number;
  moments: Moment[];
  belowFloor: Record<string, number>;
  threads: ThreadRow[];
  keptFacts: {
    kind: string;
    otherId: string;
    since: string;
    sinceBasis: string;
    endedAt?: string;
  }[];
  backdrop: { date: string; kind: string; reach: string; sourceId: string }[];
  schedule: Entry[];
  importanceByMonth: { date: string; threads: Record<string, number> }[];
}
interface Receipt {
  seed: string;
  place: string;
  startedAt: string;
  through: string;
  withDrives?: boolean;
  watchedCount: number;
  lives: Life[];
  broadEvents: {
    eventId: string;
    date: string;
    kind: string;
    reachedCount: number;
    byReach: Record<string, number>;
    personalMoments: { personId: string; impact: number }[];
  }[];
}

function args(argv: readonly string[]) {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const receipt = value("--receipt");
  const person = value("--person");
  if (!receipt || !person)
    throw new Error("--receipt and --person are required.");
  return { receipt, person, output: value("--output") };
}

const fixed = (value: number) => value.toFixed(3);

function ageOn(birth: string, date: string): number {
  const [by, bm, bd] = birth.split("-").map(Number) as [number, number, number];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export function lifeLines(receipt: Receipt, personId: string): string[] {
  const life = receipt.lives.find((row) => row.id === personId);
  if (!life) throw new Error(`The receipt has no detailed life ${personId}.`);
  const names = new Map(life.threads.map((row) => [row.otherId, row.name]));
  names.set(life.id, life.name);
  const who = (id: string) => names.get(id) ?? id;
  const relation = (id: string) => {
    const thread = life.threads.find((row) => row.otherId === id);
    if (!thread) return "";
    const parts = [...thread.kin, ...(thread.sharedHome ? ["home"] : [])];
    return parts.length ? ` (${parts.join(", ")})` : "";
  };
  const schedule = new Map(life.schedule.map((row) => [row.momentId, row]));
  const moments = new Map(life.moments.map((row) => [row.id, row]));
  const lines: string[] = [];
  lines.push(
    `LIFE ${life.name} | born ${life.birthDate} | age ${ageOn(life.birthDate, receipt.startedAt)} on ${receipt.startedAt} | ${receipt.place} | seed ${receipt.seed}`,
  );
  lines.push(
    `TRAITS ${Object.entries(life.traits)
      .map(([id, value]) => `${id.split(":").pop()} ${value}`)
      .join(", ")}`,
  );
  lines.push(
    `YEAR ${receipt.startedAt} to ${receipt.through} | days observed ${life.observedDays} | days with no change ${life.quietDays} | moments stored ${life.moments.length}`,
  );
  lines.push(
    `UNDER THE FLOOR ${
      Object.entries(life.belowFloor)
        .map(([label, count]) => `${label} ${count}`)
        .join(", ") || "none"
    }`,
  );
  lines.push("");
  lines.push("MOMENTS BY IMPACT");
  for (const moment of [...life.moments].sort((a, b) => b.impact - a.impact)) {
    const parts = moment.channels
      .map(
        (row) =>
          `${row.channel} ${fixed(row.raw)} x scale ${fixed(row.scale)} x traits ${fixed(row.traitWeight)}${row.traits.length ? ` [${row.traits.map((trait) => `${trait.traitId.split(":").pop()} ${trait.recorded}`).join(", ")}]` : ""}`,
      )
      .join(" + ");
    lines.push(
      `MOMENT ${moment.date} | ${moment.label} | impact ${fixed(moment.impact)} | hindsight ${fixed(moment.hindsight)} | ${parts}`,
    );
    if (moment.counterpartIds.length)
      lines.push(
        `  WITH ${moment.counterpartIds.map((id) => `${who(id)}${relation(id)}`).join(", ")}`,
      );
    lines.push(`  CAUSE ${moment.causeId}`);
    if (moment.broadEventId) {
      const broad = receipt.broadEvents.find(
        (row) => row.eventId === moment.broadEventId,
      );
      if (broad)
        lines.push(
          `  BROAD EVENT ${broad.kind} on ${broad.date} | reached ${broad.reachedCount} watched people (${Object.entries(
            broad.byReach,
          )
            .map(([reach, count]) => `${reach} ${count}`)
            .join(", ")}) | personal moments ${broad.personalMoments.length}`,
        );
    }
    for (const echo of moment.echoes) {
      const earlier = moments.get(echo.earlierId);
      lines.push(
        `  CALLBACK ${echo.reason} to ${earlier ? `${earlier.date} ${earlier.label}` : echo.earlierId} with ${who(echo.otherId)} | strength ${fixed(echo.strength)}`,
      );
    }
    const entry = schedule.get(moment.id);
    if (entry) {
      lines.push(
        `  OUTCOME ${entry.outcome}${entry.stopsSkip ? ", stops a skip" : ""} | rank ${entry.rank} of pace ${entry.pace}${entry.coverage ? ` | coverage ${entry.coverage.reason}${entry.coverage.detail ? ` (${entry.coverage.detail})` : ""}` : ""}`,
      );
      for (const binding of entry.bindings)
        lines.push(
          `  SCENE ${binding.typeKey} at ${binding.setting.kind} | ${binding.roles
            .map(
              (role) =>
                `${role.role}: ${role.personIds.map(who).join(", ") || "nobody"}${role.bearing ? ` (${role.bearing})` : ""}`,
            )
            .join("; ")}`,
        );
    }
  }
  lines.push("");
  lines.push("THREADS BY IMPORTANCE AT YEAR END");
  const monthly = life.importanceByMonth;
  if (monthly.length)
    lines.push(`MONTHS ${monthly.map((row) => row.date).join(" ")}`);
  for (const thread of life.threads.filter(
    (row) => row.importanceAtEnd > 0 || row.turns.length,
  )) {
    const path = monthly
      .map((row) => fixed(row.threads[thread.otherId] ?? 0))
      .join(" ");
    lines.push(
      `THREAD ${thread.name}${relation(thread.otherId)} | importance ${fixed(thread.importanceAtEnd)} | closeness ${fixed(thread.closeness)} | last contact ${thread.lastContact ?? "none"} | faded ${fixed(thread.fadingAtEnd)} | moments ${thread.moments}`,
    );
    if (monthly.length) lines.push(`  BY MONTH ${path}`);
    for (const turn of thread.turns.slice(0, 5))
      lines.push(`  TURN ${turn.date} ${turn.turn}`);
  }
  lines.push("");
  lines.push("KEPT FACTS");
  const byKind = new Map<string, number>();
  for (const fact of life.keptFacts)
    byKind.set(fact.kind, (byKind.get(fact.kind) ?? 0) + 1);
  for (const [kind, count] of byKind) lines.push(`FACTS ${kind} ${count}`);
  for (const fact of [...life.keptFacts]
    .sort((a, b) => a.since.localeCompare(b.since))
    .slice(0, 8))
    lines.push(
      `  FACT ${fact.kind} with ${who(fact.otherId)} since ${fact.since} (${fact.sinceBasis})${fact.endedAt ? ` ended ${fact.endedAt}` : ""}`,
    );
  lines.push("");
  lines.push("BACKGROUND ENTRIES");
  const reach = new Map<string, number>();
  for (const row of life.backdrop)
    reach.set(
      `${row.kind} ${row.reach}`,
      (reach.get(`${row.kind} ${row.reach}`) ?? 0) + 1,
    );
  for (const [key, count] of reach) lines.push(`BACKGROUND ${key} ${count}`);
  for (const row of life.backdrop.filter((entry) => entry.reach !== "place"))
    lines.push(`  ENTRY ${row.date} ${row.kind} ${row.reach}`);
  return lines;
}

function main() {
  const options = args(process.argv.slice(2));
  const receipt = JSON.parse(readFileSync(options.receipt, "utf8")) as Receipt;
  const text = `${lifeLines(receipt, options.person).join("\n")}\n`;
  if (options.output) writeFileSync(options.output, text);
  else process.stdout.write(text);
}

if (process.argv[1]?.endsWith("director-report.ts")) main();
