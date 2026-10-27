/**
 * The scene web (words-scene-web-from-lives): one row per situation type and
 * per cause that fires it, joined to the lines that word it, the real-life
 * episodes that calibrate it, whether it fired in a played year, and the
 * owner's scene requests it answers. Generated, never written by hand:
 *
 *   npm run scene-web -- [--seed <seed>] [--check]
 *
 * reads src/director/data/situation-types.json, data/english/parts/, the
 * packets in docs/design/scenes/from-life/, scripts/scene-web/domains.json and
 * scripts/scene-web/owner-examples.json, plays one year of buildBenchWorld in
 * a place drawn from all 56 (the player, their household and every official
 * who is a full person watched), and writes docs/reports/scene-web.json and
 * .md. --check fails when a type has no row or domain, an owner example names
 * a type that does not exist, or a row has no episode.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";

const ROOT = join(import.meta.dirname, "../..");
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8")) as T;

type Cause = {
  causeRecord?: string;
  causeEngine?: string;
  awaitingProducer?: string;
  match?: {
    label?: string;
    labelPrefix?: string;
    threadTurn?: string;
    echo?: string;
  };
};
type SituationType = {
  key: string;
  purpose?: string;
  setting: string[];
  causes: Cause[];
  awaiting?: string[];
  roles: { key: string }[];
  tag: { endpoint?: string };
};
type Use = { key?: string; purpose?: string; subject?: string; role?: string };
type Part = { text: string; uses: Use[] };
type OwnerExample = {
  section: string;
  title: string;
  date: string;
  quote: string;
  source: string;
  kind: "scene" | "rule" | "screen";
  types: string[];
  why: string;
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const seed = flag("--seed") ?? randomBytes(20).toString("hex");
const check = args.includes("--check");

const types = read<{ types: SituationType[] }>(
  "src/director/data/situation-types.json",
).types;
const domains = read<{ domains: Record<string, string[]> }>(
  "scripts/scene-web/domains.json",
).domains;
const domainOf = new Map(
  Object.entries(domains).flatMap(([domain, keys]) =>
    keys.map((key) => [key, domain] as const),
  ),
);
const owner = read<OwnerExample[]>("scripts/scene-web/owner-examples.json");

// Lines: a scene-talk piece words a type by its purpose (several purposes
// share one arc key); a scene-words piece
// leads a type by its key or words one of its causes by the cause's label.
const parts = (file: string) =>
  read<{ parts: Part[] }>(`data/english/parts/${file}`).parts;
const talk = parts("scene-talk.json");
const words = parts("scene-words.json");
const conversation = parts("conversation.json");
const { labels: talkSubjects, types: talkByType } = read<{
  labels: Record<string, string[]>;
  types: Record<string, string[]>;
}>("scripts/scene-web/talk-subjects.json");
function linesOf(type: SituationType): Record<string, number> {
  const labels = new Set(
    type.causes.map((cause) => cause.match?.label).filter(Boolean),
  );
  const count: Record<string, number> = {};
  const add = (speaker: string) => (count[speaker] = (count[speaker] ?? 0) + 1);
  for (const part of talk) {
    const use = part.uses.find(
      (row) => row.purpose === (type.purpose ?? type.key),
    );
    if (use) add(use.role ?? "any");
  }
  for (const part of words)
    for (const use of part.uses)
      if (
        (use.subject === "lead" && use.role === type.key) ||
        (use.subject === "cause" && labels.has(use.role))
      ) {
        add("narrator");
        break;
      }
  // A type with no purpose talks through the conversation bank: the news is
  // raised by whoever brings it, and answered by whoever hears it.
  if (!type.purpose && talkByType[type.key]) {
    // Staged on a tie: an ordinary conversation between the two.
    const general = new Set(talkByType[type.key]);
    for (const part of conversation)
      if (part.uses.some((use) => general.has(use.subject ?? ""))) add("talk");
  } else if (!type.purpose) {
    const subjects = new Set(
      [...labels].flatMap((label) => talkSubjects[label!] ?? []),
    );
    for (const part of conversation)
      for (const use of part.uses) {
        const subject = use.subject ?? "";
        if (subjects.has(subject)) add("bearer");
        else if (subjects.has(subject.replace(/-reply$/, ""))) add("hearer");
        else continue;
        break;
      }
  }
  return count;
}

// Episodes: a packet calibrates a type when it names the type's key or
// purpose in code marks.
const EPISODES = "docs/design/scenes/from-life";
const packets = readdirSync(join(ROOT, EPISODES))
  .filter((file) => file.endsWith(".md"))
  .map((file) => ({
    slug: file.replace(/\.md$/, ""),
    marks: new Set(
      [
        ...readFileSync(join(ROOT, EPISODES, file), "utf8").matchAll(
          /`([a-z][a-z0-9-]*)`/g,
        ),
      ].map((match) => match[1]!),
    ),
  }));
const episodesOf = (type: SituationType) =>
  packets
    .filter(
      (packet) =>
        packet.marks.has(type.key) ||
        (type.purpose && packet.marks.has(type.purpose)),
    )
    .map((packet) => packet.slug);

// One played year: which types the director staged, by cause record.
setBookkeeping(false);
const place = drawPlace(seed, "scene-web");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const playerId = (world as { playerId?: string }).playerId;
const watched = new Set<string>();
if (playerId) {
  const household = core.people.get(playerId as PersonId)?.householdId;
  for (const person of core.people.values())
    if (
      person.id === playerId ||
      (household && person.householdId === household)
    )
      watched.add(person.id);
}
for (const row of townSeats(coreAPI(core))) {
  const holder = row.holder?.personId;
  if (holder && core.people.has(holder as PersonId)) watched.add(holder);
}
for (const id of watched) director.watch(core, id as PersonId);
const start = core.date;
advanceCore(core, addDays(makeIsoDate(core.date), 365));
const fired = new Map<string, { count: number; example: string }>();
for (const [, ledger] of director.ledger.people)
  for (const row of ledger.schedule ?? [])
    for (const binding of row.bindings ?? []) {
      const seen = fired.get(binding.typeKey);
      fired.set(binding.typeKey, {
        count: (seen?.count ?? 0) + 1,
        example: seen?.example ?? row.momentId,
      });
    }

const triggerOf = (cause: Cause) =>
  cause.causeRecord ??
  cause.match?.label ??
  // A tie between two people that turned (soured, grew) or came back.
  (cause.match?.threadTurn ? `a tie ${cause.match.threadTurn}` : undefined) ??
  (cause.match?.echo ? `a tie's ${cause.match.echo}` : undefined) ??
  cause.match?.labelPrefix ??
  (cause.awaitingProducer ? `awaiting: ${cause.awaitingProducer}` : "none");

const rows = types.flatMap((type) => {
  const lines = linesOf(type);
  const episodes = episodesOf(type);
  const asked = owner
    .filter((row) => row.types.includes(type.key))
    .map((row) => row.title);
  const outcome = type.purpose
    ? "scene.reply"
    : `${type.tag.endpoint ?? "personal"} conversation`;
  const played = fired.get(type.key);
  return (type.causes.length ? type.causes : [{} as Cause]).map(
    (cause, index) => ({
      domain: domainOf.get(type.key) ?? "none",
      type: type.key,
      variant: index,
      trigger: triggerOf(cause),
      waiting: !!cause.awaitingProducer,
      outcome,
      speakers: lines,
      lines: Object.values(lines).reduce((sum, n) => sum + n, 0),
      episodes,
      ownerAsked: asked,
      firedInYear: played?.count ?? 0,
      firedExample: played?.example ?? null,
    }),
  );
});
const missing = owner
  .filter((row) => row.kind === "scene" && row.types.length === 0)
  .map(({ section, title, date, quote, source }) => ({
    section,
    title,
    date,
    quote,
    source,
  }));
const report = {
  generated: new Date().toISOString().slice(0, 10),
  place: `${place.name} (${place.key})`,
  seed,
  year: `${start} to ${core.date}`,
  watched: watched.size,
  counts: {
    types: types.length,
    rows: rows.length,
    typesFired: new Set(rows.filter((r) => r.firedInYear).map((r) => r.type))
      .size,
    rowsWaitingOnProducer: rows.filter((r) => r.waiting).length,
    rowsWithoutEpisode: rows.filter((r) => !r.episodes.length).length,
    ownerExamples: owner.length,
    ownerScenesMissing: missing.length,
  },
  rows,
  missing,
  unlinkedEpisodes: packets
    .filter(
      (packet) => !types.some((type) => episodesOf(type).includes(packet.slug)),
    )
    .map((packet) => packet.slug),
};
writeFileSync(
  join(ROOT, "docs/reports/scene-web.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

// The morning page: counts first, then each domain's rows, then what's missing.
const md: string[] = [
  "# The scene web",
  "",
  `Generated by \`npm run scene-web\` on ${report.generated}. Played year: ${report.place}, seed \`${seed}\`, ${report.year}, ${watched.size} people watched (the player, their household and the officials who are full people).`,
  "",
  `- **Owner's scenes still missing:** ${missing.length} of ${owner.filter((r) => r.kind === "scene").length} scene requests have no type.`,
  `- **Types:** ${types.length}, in ${rows.length} rows (one per cause). ${report.counts.typesFired} types fired in the played year.`,
  `- **Rows waiting on a producer:** ${report.counts.rowsWaitingOnProducer}. **Rows with no real-life episode:** ${report.counts.rowsWithoutEpisode}.`,
  "",
];
for (const domain of Object.keys(domains)) {
  const here = rows.filter((row) => row.domain === domain);
  md.push(
    `## ${domain.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())}`,
    "",
    "| Type (cause) | Trigger | Lines (by speaker) | Episodes | Type fired in the year | Owner asked |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const row of here)
    md.push(
      `| ${row.type}${row.variant ? ` (${row.variant + 1})` : ""} | ${row.waiting ? "_" : ""}${row.trigger}${row.waiting ? "_" : ""} | ${
        row.lines
          ? Object.entries(row.speakers)
              .map(([k, n]) => `${k} ${n}`)
              .join(", ")
          : "none"
      } | ${row.episodes.join(", ") || "none"} | ${row.firedInYear || "no"} | ${row.ownerAsked.length} |`,
    );
  md.push("");
}
md.push("## Missing: the owner asked, and no type stages it", "");
for (const row of missing)
  md.push(`- **${row.title}** (${row.section}, ${row.date}): ${row.quote}`);
md.push("");
writeFileSync(join(ROOT, "docs/reports/scene-web.md"), md.join("\n"));
console.log(
  `scene-web: ${report.place}, seed ${seed}: ${rows.length} rows, ${report.counts.typesFired} types fired, ${missing.length} owner scenes missing, ${report.counts.rowsWithoutEpisode} rows without an episode`,
);

if (check) {
  const problems = [
    ...types
      .filter((type) => !domainOf.has(type.key))
      .map(
        (type) => `${type.key} has no domain in scripts/scene-web/domains.json`,
      ),
    ...owner.flatMap((row) =>
      row.types
        .filter((key) => !types.some((type) => type.key === key))
        .map((key) => `owner example "${row.title}" names no type ${key}`),
    ),
    ...rows
      .filter((row) => !row.episodes.length)
      .map((row) => `${row.type} (${row.variant + 1}) has no episode`),
  ];
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
}
