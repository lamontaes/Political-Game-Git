/**
 * The scene inventory: every situation type the director can stage, and every
 * scene-talk purpose with no type, judged against the engines that stand
 * behind it (lead's brief, Nov 12, 2026: keep only scenes an engine stands
 * behind). The judgments (cause, what it writes back, the engine that models
 * it, the verdict and why) are hand-kept in docs/design/scene-inventory.json;
 * this script fills in what the data says (causes, settings, how the player
 * reaches it under src/director/scheduling.ts, the line counts) and writes the
 * readable page docs/design/scene-inventory.md.
 *
 *   node --import tsx scripts/words/scene-inventory.ts          rewrite both
 *   node --import tsx scripts/words/scene-inventory.ts --check  fail if stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { format } from "prettier";

const ROOT = path.resolve(import.meta.dirname, "../..");
const read = (file: string) =>
  JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
const JSON_FILE = "docs/design/scene-inventory.json";
const MD_FILE = "docs/design/scene-inventory.md";

interface Cause {
  match?: { label?: string; labelPrefix?: string; echo?: string };
  causeEngine?: string;
  causeRecord?: string;
  awaitingProducer?: string;
  setting?: string | string[];
}
interface Type {
  key: string;
  purpose?: string;
  setting: string[];
  timing: string;
  causes: Cause[];
  stopsDay?: boolean;
  waits?: boolean;
  awaiting?: string[];
}
interface Part {
  key: string;
  text?: string;
  uses?: { purpose: string }[];
  piece?: { of: string; part: string; required?: boolean };
}
interface Row {
  key: string;
  kind: "type" | "purpose";
  cause: string;
  writes: string;
  models: string;
  verdict: "KEEP" | "WIRE" | "DELETE" | "NEEDED-LATER";
  why: string;
  link?: string;
  neededEngine?: string;
  reachNote?: string;
  computed?: Record<string, unknown>;
  /** Deleted by the inventory's own pull request: its computed fields are as they were before. */
  removed?: boolean;
}
interface Doc {
  judgedAgainst?: string;
  beforeDeletion?: Record<
    string,
    { rows: number; lines: number; counted: number }
  >;
  goldenPath?: { step: string; scenes: string }[];
  neededLater?: string[];
  awaitingWishes?: { type: string; records: string[] }[];
  likedLinesRetired?: { scene: string; key: string; text: string }[];
  rows: Row[];
}

const types = read("src/director/data/situation-types.json") as {
  scheduling: Record<string, string[]>;
  types: Type[];
};
const director = read("src/director/data/director.json") as {
  parameters: Record<string, { value: number }>;
  eventImpacts: {
    channel: string;
    eventKind: string;
    impactParameter?: string;
    scaleFact?: string;
  }[];
};
const bank = read("data/english/parts/scene-talk.json") as { parts: Part[] };
const interruptLine = director.parameters.directorInterruptImpact!.value;
const sched = types.scheduling;

// The no-insert rule of tests/guards/english/line-inserts.test.ts, as written
// there: a line counts when it names no slot in braces, has four words or
// more, and is not a piece of a sentence whose required part always names one.
const INSERT = /\{[^{}\s]+\}/;
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const joined = (() => {
  const w = new Map<string, { required: boolean; all: boolean }>();
  for (const p of bank.parts) {
    if (!p.piece) continue;
    const id = `${p.piece.of}\u0000${p.piece.part}`;
    const r = w.get(id) ?? { required: true, all: true };
    r.required &&= p.piece.required === true;
    r.all &&= INSERT.test(p.text ?? "");
    w.set(id, r);
  }
  const out = new Set<string>();
  for (const [id, r] of w)
    if (r.required && r.all) out.add(id.split("\u0000")[0]!);
  return out;
})();
const counted = (p: Part) =>
  !INSERT.test(p.text ?? "") &&
  words(p.text ?? "") > 3 &&
  !(p.piece && joined.has(p.piece.of));

/** A use's purpose without its variant ("ask-vote.trade" is ask-vote's). */
const base = (purpose: string) =>
  purpose === "*" ? "*" : purpose.split(".")[0]!;
const purposesOf = (p: Part) =>
  new Set((p.uses ?? []).map((u) => base(u.purpose)));

function lines(purpose: string | undefined) {
  if (!purpose) return { all: 0, counted: 0, onlyHere: 0, onlyHereCounted: 0 };
  let all = 0,
    c = 0,
    only = 0,
    onlyC = 0;
  for (const p of bank.parts) {
    const ps = purposesOf(p);
    if (!ps.has(purpose)) continue;
    all++;
    if (counted(p)) c++;
    if (ps.size === 1) {
      only++;
      if (counted(p)) onlyC++;
    }
  }
  return { all, counted: c, onlyHere: only, onlyHereCounted: onlyC };
}

const labelOf = (c: Cause) =>
  c.match?.label ??
  (c.match?.labelPrefix !== undefined
    ? `${c.match.labelPrefix}*`
    : undefined) ??
  (c.match?.echo ? `echo:${c.match.echo}` : "(any)");

/** How a moment of this cause reaches the player, by scheduleMoment's rule. */
function reachOf(
  type: Type,
  c: Cause,
): { how: string; plays: "yes" | "maybe" | "no" } {
  if (c.awaitingProducer)
    return {
      how: `never staged: waits on a producer not built (${c.awaitingProducer})`,
      plays: "no",
    };
  const label = labelOf(c);
  const settings = [c.setting ?? type.setting].flat();
  if (type.stopsDay)
    return { how: "stops the day (the type's stopsDay)", plays: "yes" };
  if (type.waits)
    return {
      how: "waits by its type (waits: true), and a waiting scene is never played",
      plays: "no",
    };
  if (label.startsWith("circumstance:"))
    return {
      how: "stops the day: met where the player is (metWhereYouAre)",
      plays: "yes",
    };
  if (label.startsWith("tie:"))
    return {
      how: "stops the day when met the day the tie turned (tieMet); else waits",
      plays: "maybe",
    };
  if (
    (sched.ownRecordScenes ?? []).includes(label) &&
    settings.some((s) => (sched.ownRecordSettings ?? []).includes(s))
  )
    return {
      how: "stops the day: the player's own record (ownRecordScenes)",
      plays: "yes",
    };
  if (
    (sched.householdRecordScenes ?? []).includes(label) &&
    settings.includes("home")
  )
    return {
      how: "stops the day: the household's record (householdRecordScenes)",
      plays: "yes",
    };
  if (
    (sched.householdScenes ?? []).includes(label) &&
    settings.includes("home")
  )
    return {
      how: "stops the day when a household member is in it (householdScenes)",
      plays: "yes",
    };
  const m = /^([a-z-]+):event:(.+)$/.exec(label);
  const rule = m
    ? director.eventImpacts.find(
        (r) => r.channel === m[1] && r.eventKind === m[2],
      )
    : undefined;
  const value = rule?.impactParameter
    ? director.parameters[rule.impactParameter]?.value
    : undefined;
  if (value !== undefined) {
    if (rule!.scaleFact)
      return value * 1 >= interruptLine
        ? {
            how: `stops when ${value} times its ${rule!.scaleFact} reaches ${interruptLine}; else waits`,
            plays: "maybe",
          }
        : {
            how: `waits: impact at most ${value}, under ${interruptLine}`,
            plays: "no",
          };
    return value >= interruptLine
      ? {
          how: `stops the day: impact ${value}, at or over ${interruptLine}`,
          plays: "yes",
        }
      : {
          how: `waits: impact ${value}, under the interrupt line ${interruptLine}`,
          plays: "no",
        };
  }
  return {
    how: `by the appraisal of ${label}: stops at ${interruptLine} or over, else waits`,
    plays: "maybe",
  };
}

const WAIT_FAULT =
  "A non-interrupt moment is 'scene-waiting' (src/director/scheduling.ts, scheduleMoment's outcome), and nothing in src/bench plays one: only stops (registerInterrupts, src/director/ledger.ts) and the opening day's and election night's own routes open a staged scene (pool item director-a-waiting-scene-is-never-played).";

const doc = read(JSON_FILE) as Doc;
const byKey = new Map(doc.rows.map((r) => [r.key, r]));
const seen = new Set<string>();
const problems: string[] = [];
const counts = new Map<string, number>();
for (const t of types.types) counts.set(t.key, (counts.get(t.key) ?? 0) + 1);

for (const t of types.types) {
  if (seen.has(t.key)) continue;
  seen.add(t.key);
  const row = byKey.get(t.key);
  if (!row) {
    problems.push(`no judgment for type ${t.key}`);
    continue;
  }
  const reach = t.causes.map((c) => ({
    cause: labelOf(c),
    engine: c.causeEngine ?? "",
    record: c.causeRecord ?? "",
    ...reachOf(t, c),
  }));
  const plays = reach.some((r) => r.plays === "yes")
    ? "yes"
    : reach.some((r) => r.plays === "maybe")
      ? "maybe"
      : "no";
  delete row.removed;
  row.computed = {
    purpose: t.purpose ?? null,
    setting: t.setting,
    timing: t.timing,
    rowsInTypesFile: counts.get(t.key),
    causes: reach,
    playerReaches: row.reachNote ? `${plays} (${row.reachNote})` : plays,
    lines: lines(t.purpose ?? (t.causes.length ? undefined : undefined)),
  };
}
const typePurposes = new Set(types.types.map((t) => t.purpose).filter(Boolean));
const bankPurposes = new Set(bank.parts.flatMap((p) => [...purposesOf(p)]));
for (const p of [...bankPurposes].sort()) {
  if (typePurposes.has(p)) continue;
  const row = byKey.get(p);
  if (!row) {
    problems.push(`no judgment for untyped purpose ${p}`);
    continue;
  }
  seen.add(p);
  delete row.removed;
  row.computed = {
    purpose: p,
    playerReaches: row.reachNote ?? "",
    lines: lines(p),
  };
}
for (const r of doc.rows)
  if (!seen.has(r.key) && r.verdict === "DELETE" && r.computed)
    r.removed = true;
  else if (!seen.has(r.key))
    problems.push(
      `judgment for ${r.key}, which is neither a type nor an untyped purpose`,
    );

// Lines per verdict: a line belongs to a verdict when one of its purposes'
// owners has it; a purpose shared by types of two verdicts counts under the
// one that keeps it (KEEP, WIRE, NEEDED-LATER before DELETE).
const order = ["KEEP", "WIRE", "NEEDED-LATER", "DELETE"] as const;
const purposeVerdict = new Map<string, string>();
for (const r of doc.rows) {
  const p = (r.computed?.purpose as string | null) ?? null;
  if (!p) continue;
  const was = purposeVerdict.get(p);
  if (
    !was ||
    order.indexOf(r.verdict) < order.indexOf(was as (typeof order)[number])
  )
    purposeVerdict.set(p, r.verdict);
}
const tally: Record<string, { rows: number; lines: number; counted: number }> =
  {};
for (const v of order) tally[v] = { rows: 0, lines: 0, counted: 0 };
for (const r of doc.rows) if (!r.removed) tally[r.verdict]!.rows++;
for (const p of bank.parts) {
  const vs = [...purposesOf(p)].map((x) => purposeVerdict.get(x) ?? "KEEP");
  const v = order.find((o) => vs.includes(o)) ?? "KEEP";
  tally[v]!.lines++;
  if (counted(p)) tally[v]!.counted++;
}
const totalCounted = bank.parts.filter(counted).length;

const md: string[] = [];
md.push("# Scene inventory");
md.push("");
md.push(
  `Every situation type the director can stage (src/director/data/situation-types.json) and every scene-talk purpose with no type, judged against the engines that already exist (lead's brief, Nov 12, 2026: keep only scenes an engine stands behind). The judgments are kept in \`${JSON_FILE}\`; this page is generated from it by \`node --import tsx scripts/words/scene-inventory.ts\`, which also fills in the causes, how the player reaches each scene and the line counts from the data.`,
);
md.push("");
md.push(
  "A scene is kept when an engine's record causes it, it writes something back that another engine reads, and the player can reach it. Scenes whose matter is a tie (family, friends, a quarrel) write back through the closeness engine, which is the right reader; scenes whose matter is a vote, a bill, a race or a law must be read by that engine, and one that writes only time together is a scene that only talks.",
);
md.push("");
md.push(`Judged against ${doc.judgedAgainst ?? "main"}.`);
md.push("");
md.push("## The golden path, scene by scene");
md.push("");
md.push(
  "The scene at each step of the player's path and its verdict. The gap from proposing an ordinance to people bringing it up is closed by the WIRE rows, in the order a bill meets them.",
);
md.push("");
md.push("| Step | Scenes (verdict) |");
md.push("|---|---|");
const verdictOf = (key: string) => byKey.get(key)?.verdict ?? "?";
for (const g of doc.goldenPath ?? [])
  md.push(
    `| ${g.step} | ${g.scenes
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => `${k} (${verdictOf(k)})`)
      .join(", ")} |`,
  );
md.push("");
md.push("## Needed later");
md.push("");
md.push(
  "Scenes the story needs that no engine models yet; each names the engine it would need.",
);
md.push("");
for (const r of doc.rows.filter((r) => r.neededEngine))
  md.push(`- **${r.key}**: ${r.neededEngine}`);
for (const n of doc.neededLater ?? []) md.push(`- ${n}`);
md.push("");
md.push(
  "Records the types said they waited on (their `awaiting` lists and never-built `awaitingProducer` causes, removed from situation-types.json with this inventory), which no engine writes:",
);
md.push("");
for (const w of doc.awaitingWishes ?? [])
  md.push(`- **${w.type}** (${verdictOf(w.type)}): ${w.records.join(", ")}`);
md.push("");
if (doc.beforeDeletion) {
  md.push("## Totals when judged, before the deletions");
  md.push("");
  md.push(
    "| Verdict | Rows | Lines in scene-talk | Lines the no-insert guard counts |",
  );
  md.push("|---|---|---|---|");
  for (const v of order) {
    const b = doc.beforeDeletion[v]!;
    md.push(`| ${v} | ${b.rows} | ${b.lines} | ${b.counted} |`);
  }
  md.push("");
}
md.push("## Totals now");
md.push("");
md.push(
  "| Verdict | Rows | Lines in scene-talk | Lines the no-insert guard counts |",
);
md.push("|---|---|---|---|");
for (const v of order)
  md.push(
    `| ${v} | ${tally[v]!.rows} | ${tally[v]!.lines} | ${tally[v]!.counted} |`,
  );
md.push(
  `| All | ${doc.rows.filter((r) => !r.removed).length} | ${bank.parts.length} | ${totalCounted} |`,
);
md.push("");
md.push(
  "A line shared by purposes of different verdicts is counted under the verdict that keeps it. Counted lines follow tests/guards/english/line-inserts.test.ts: no slot in braces, four words or more, not a joined piece.",
);
md.push("");
md.push("## How a scene reaches the player");
md.push("");
md.push(WAIT_FAULT);
md.push("");
md.push(
  "So a scene plays only when its moment stops the day: met where the player is (a circumstance), the player's own record met at home, the office, the chamber, by phone or in public (ownRecordScenes and ownRecordSettings), the household's news at home, a tie turned that day, the type's stopsDay, or an impact at or over the interrupt line (directorInterruptImpact, 0.5). Everything else waits and is never seen.",
);
md.push("");
for (const v of order) {
  const rows = doc.rows.filter((r) => r.verdict === v);
  md.push(
    `## ${v} (${rows.length}${v === "DELETE" ? ", deleted with this inventory; their counts are as judged" : ""})`,
  );
  md.push("");
  md.push(
    "| Scene | Cause | Writes back | Player reaches it | Engine that models it | Lines (all / counted) | Why |",
  );
  md.push("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const c = r.computed ?? {};
    const l = (c.lines ?? {}) as { all: number; counted: number };
    const name = `${r.key}${r.kind === "purpose" ? " (purpose, no type)" : c.purpose ? ` (${c.purpose})` : ""}`;
    const reach = String(c.playerReaches ?? "");
    const why = [
      r.why,
      r.link ? `Link: ${r.link}` : "",
      r.neededEngine ? `Needs: ${r.neededEngine}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    md.push(
      `| ${name} | ${r.cause} | ${r.writes} | ${reach} | ${r.models} | ${l.all ?? 0} / ${l.counted ?? 0} | ${why} |`.replace(
        /\n/g,
        " ",
      ),
    );
  }
  md.push("");
}
md.push("## Lines the owner graded good, deleted with their scenes");
md.push("");
md.push(
  "The owner graded these lines good (data/english/part-grades.json). They went with their scenes (lead's direction, Nov 12, 2026, under the owner's grant of the whole story that day); they are kept here so the move pieces that replace that kind of moment can learn from them.",
);
md.push("");
for (const l of doc.likedLinesRetired ?? [])
  md.push(`- **${l.scene}**: "${l.text}" (\`${l.key}\`)`);
md.push("");
md.push("## Causes by type, with how each reaches the player");
md.push("");
for (const r of doc.rows.filter((r) => r.kind === "type" && !r.removed)) {
  const c = r.computed as {
    causes: { cause: string; engine: string; record: string; how: string }[];
  };
  md.push(
    `- **${r.key}**: ${c.causes.map((x) => `${x.cause}${x.engine ? ` (${x.engine}/${x.record})` : ""}: ${x.how}`).join("; ")}`,
  );
}
md.push("");

const jsonText = await format(JSON.stringify(doc, null, 2), {
  parser: "json",
});
const mdText = await format(md.join("\n"), { parser: "markdown" });
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
if (process.argv.includes("--check")) {
  const stale =
    readFileSync(path.join(ROOT, JSON_FILE), "utf8") !== jsonText ||
    readFileSync(path.join(ROOT, MD_FILE), "utf8") !== mdText;
  if (stale) {
    console.error(`${JSON_FILE} or ${MD_FILE} is stale: rerun the script.`);
    process.exit(1);
  }
} else {
  writeFileSync(path.join(ROOT, JSON_FILE), jsonText);
  writeFileSync(path.join(ROOT, MD_FILE), mdText);
}
console.log(JSON.stringify(tally), `rows ${doc.rows.length}`);
