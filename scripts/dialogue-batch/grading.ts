/**
 * The owner's grading page reads one file per batch run, in exactly this
 * shape (CTO, 5:45 p.m. Oct 6, binding): { id, title, at, head, status,
 * items: [ { i, situation, prior, reply, part, parts, composer, kind, cell,
 * seed } ] }. Only exchanges that pass the rules go into items; the others go
 * to the bin with the rule they broke. Part keys are stored for the engine and
 * never shown to the owner.
 *
 * A development tool. It reads finished batch lines and never words anything:
 * every reply is exactly what a composer returned.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { proseDate } from "../../src/presentation/prose-dates";
import type { BatchLine, BatchResult } from "./run";

/** What kind of text an item is (owner, 6:20 p.m. Oct 6). */
export const TEXT_KINDS = [
  "conversation",
  "legislation",
  "winning-and-losing",
  "judges",
  "news",
  "journal",
  "press",
  "hearing",
  "meeting",
  "minutes",
  "notices-and-screens",
  "choice",
] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

export interface GradingCell {
  readonly register:
    "everyday" | "family" | "workplace" | "press" | "meeting" | "court";
  readonly kind: string;
  readonly relationship:
    | "stranger"
    | "acquaintance"
    | "friend"
    | "family"
    | "boss"
    | "rival"
    | "self";
  readonly trait: string | null;
  readonly mood: string | null;
  readonly experience: string | null;
  readonly belief: string | null;
  readonly place: string;
  readonly pose: string | null;
  readonly ageBand: string;
}

export interface GradingItem {
  readonly i: number;
  /** The batch situation the line came from. */
  readonly id: string;
  /** The one thing this line varies, the axis being graded. */
  readonly axis: string;
  readonly situation: string;
  readonly prior: string;
  readonly reply: string;
  readonly part: string | null;
  readonly parts: readonly string[];
  readonly composer: string;
  readonly kind: TextKind;
  readonly cell: GradingCell;
  readonly seed: string;
  /** For a conversation: the reply choices the game offers next. */
  readonly choices?: readonly string[];
  /** For a conversation: whether any offered choice is a deliberate lie. */
  readonly lieOffered?: boolean;
}

export interface GradingBatch {
  readonly id: string;
  readonly title: string;
  readonly at: string;
  readonly head: string;
  readonly status: "open";
  /** Batch variety rule (CTO 7:55 p.m. Oct 6): the numbers, at the top. */
  readonly variety: {
    readonly items: number;
    readonly places: number;
    readonly kinds: Readonly<Record<string, number>>;
    readonly distinctSituationRelationship: number;
  };
  /** Kinds with no output, each with why. */
  readonly absent: readonly {
    readonly kind: string;
    readonly reason: string;
  }[];
  readonly items: readonly GradingItem[];
}

export interface BinnedExchange {
  readonly item: Omit<GradingItem, "i">;
  readonly rule: string;
}

/**
 * Kinds the owner does not grade (CTO 2:20 p.m. Oct 8, from the owner): floor,
 * hearing and meeting procedure, minutes, bill text and court formulas follow
 * conventions a player cannot judge by ear. Their wording is checked against
 * the real records it was mined from instead. Owner batches carry journal
 * chapters, conversations, news, notices and people's plain speech.
 */
export const PROCEDURAL_KINDS: ReadonlySet<TextKind> = new Set([
  "meeting",
  "hearing",
  "minutes",
  "legislation",
  "judges",
]);

/** Batch ids use A to Z, a to z, 0 to 9 and hyphen only. */
export function gradingBatchId(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `eng-${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}-${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}`;
}

const FAMILY =
  /\b(mom|dad|mother|father|parent|sister|brother|son|daughter|grand\w*|aunt|uncle|cousin|wife|husband|spouse|partner|stepmom|stepdad|stepsister|stepbrother)\b/i;
const FRIEND = /\bfriend\b/i;
const BOSS = /\b(boss|manager|supervisor)\b/i;

function relationshipOf(line: BatchLine): GradingCell["relationship"] {
  if (line.speaker.isPlayer) return "self";
  const relation = line.speaker.relation;
  if (!relation || relation === "judge") return "stranger";
  if (FAMILY.test(relation)) return "family";
  if (BOSS.test(relation)) return "boss";
  if (FRIEND.test(relation)) return "friend";
  return "acquaintance";
}

function textKindOf(line: BatchLine): TextKind {
  const read = /^text-(.+)-\d+$/.exec(line.id)?.[1];
  if (read && (TEXT_KINDS as readonly string[]).includes(read))
    return read as TextKind;
  if (line.id.startsWith("judge-")) return "judges";
  return line.id.startsWith("press-") ? "press" : "conversation";
}

/** The exchange kind of a batch situation, on the EP-1 matrix's terms. */
function exchangeKindOf(id: string): string {
  if (id.startsWith("greet-again")) return "greet-again";
  if (id.startsWith("greet")) return "greet";
  if (id.startsWith("told-plan")) return "tell-plan";
  if (id.startsWith("remember")) return "remembered-topic";
  if (id.startsWith("matter")) return "share-news";
  if (id === "press-answer") return "interview";
  if (id.startsWith("judge-sentence")) return "sentence";
  if (id.startsWith("text-")) return id.replace(/-\d+$/, "").slice(5);
  if (id.startsWith("press")) return "interview-question";
  if (id.endsWith("decline")) return "decline";
  return id;
}

function ageBandOf(age: number): string {
  if (age < 13) return "child";
  if (age < 18) return "teen";
  if (age < 30) return "young-adult";
  if (age < 65) return "adult";
  return "older-adult";
}

/** How the owner reads a speaker's label: "You", "Your mom", "A neighbor". */
/** The composer each kind lacks when a batch has none of it. */
const MISSING_COMPOSER: Readonly<Record<string, string>> = {
  "winning-and-losing":
    "no composer words a race or vote result yet without a recorded vote or decided contest (readWinningLosingBank needs one)",
  minutes:
    "no composer writes minutes until the body has a recorded meeting or vote (readMinutesBank needs one)",
  "notices-and-screens": "no notices composer or bank exists yet",
  choice:
    "no conversation offered a choice the talk-choice bank can word (composeTalkChoice needs a mined sentence for it)",
  legislation:
    "no composer words a bill until a measure with a short title is filed (readLegislationBank needs one)",
  meeting:
    "no composer speaks at a meeting until the home body has a seated chair (readMeetingBank needs one)",
  hearing:
    "no composer speaks at a hearing until the home body is seated (readHearingBank needs one)",
};

const KIND_VOICE: Readonly<Record<string, string>> = {
  news: "Newspaper",
  journal: "Your journal",
  legislation: "Bill text",
  "winning-and-losing": "Results",
  meeting: "A member",
  minutes: "Minutes",
  hearing: "At the hearing",
  choice: "You could say",
};

function voiceLabel(line: BatchLine): string {
  const read = /^text-(.+)-\d+$/.exec(line.id)?.[1];
  if (read) return KIND_VOICE[read] ?? "Screen";
  if (line.speaker.isPlayer) return "You";
  if (line.id.startsWith("press-")) return "Reporter";
  if (line.id.startsWith("judge-")) return "Judge";
  const relation = line.speaker.relation;
  if (!relation) return "Someone in town";
  return relation[0]!.toUpperCase() + relation.slice(1);
}

/** Plain words: who, how old, where. No record ids or engine terms. */
function plainSituation(line: BatchLine): string {
  if (line.id.startsWith("text-"))
    return `${line.situation} In ${line.world.place}, on ${proseDate(line.world.date)}.`;
  // A judge's line needs the case it decides, and a conversation needs the
  // scene and what the player said, which the batch line words.
  if (line.id.startsWith("judge-") || line.id.startsWith("conversation-"))
    return `${line.situation} In ${line.world.place}, on ${proseDate(line.world.date)}.`;
  const who = line.speaker.isPlayer
    ? "You"
    : `${voiceLabel(line)}, ${line.speaker.name} (${line.speaker.age})`;
  return `${who}, in ${line.world.place}, on ${proseDate(line.world.date)}. You are ${line.world.playerAge}.`;
}

/**
 * Words that mark developer text, never speech (CTO EP-2 list). A first
 * gate until EP-2's full rules file lands.
 */
const DEVELOPER_WORDS = [
  "game profile",
  "catalog",
  "does not establish",
  "disclosed",
  "fictional",
  "TODO",
  "stub",
  "{{",
];

export function binRule(reply: string): string | null {
  const lower = reply.toLowerCase();
  const word = DEVELOPER_WORDS.find((entry) =>
    lower.includes(entry.toLowerCase()),
  );
  if (word) return `developer words: "${word}"`;
  // Record keys and ISO dates are system wording, never speech.
  if (/\b[a-z0-9]+(?:-[a-z0-9]+)+:[a-z-]+\b/.test(reply))
    return "raw record key";
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(reply)) return "raw ISO date";
  // Program keys: dotted or snake_case identifiers (press.answer-unknown,
  // school_raise). Hyphenated English like "mother-in-law" stays speech.
  if (/\b[a-z]+(?:\.[a-z][a-z-]*|_[a-z]+)+\b/.test(reply)) return "program key";
  return null;
}

/** "1 line", "2 lines". */
export function counted(n: number, noun: string): string {
  return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

export function toGradingBatch(
  result: BatchResult,
  run: { readonly id: string; readonly head: string; readonly at: Date },
): { batch: GradingBatch; bin: readonly BinnedExchange[] } {
  const items: GradingItem[] = [];
  const bin: BinnedExchange[] = [];
  const pairs = new Set<string>();
  const voices = new Map<string, number>();
  // Conversation repeats when the exchange and the relationship repeat; a
  // read text (news, journal, a judge's reasons) repeats when its words do.
  // A conversation repeats a situation when the same kind of exchange with the
  // same kind of person opens the same way and varies the same thing; one
  // that opens with another choice, or tests another axis, is a new situation.
  const pairOf = (item: Omit<GradingItem, "i">) =>
    item.kind === "conversation" || item.kind === "press"
      ? `${item.kind}|${item.cell.kind}|${item.cell.relationship}|${item.prior}|${item.axis}`
      : `${item.kind}|${item.situation}|${item.reply}`;
  const worldIndex = new Map(
    result.worlds.map((world) => [world.place, world.index]),
  );
  for (const line of result.lines) {
    const traitKeys = Object.keys(line.speaker.traits);
    const item: Omit<GradingItem, "i"> = {
      id: line.id,
      axis: line.axis,
      situation: plainSituation(line),
      prior:
        line.prior === undefined
          ? ""
          : `${line.speaker.isPlayer ? "Reporter" : "You"}: ${line.prior}`,
      reply: `${voiceLabel(line)}: ${line.line}`,
      part: line.parts[0] ?? null,
      parts: line.parts,
      composer: line.composer,
      kind: textKindOf(line),
      cell: {
        register: line.id.startsWith("judge-")
          ? "court"
          : line.id.startsWith("press-")
            ? "press"
            : relationshipOf(line) === "family"
              ? "family"
              : "everyday",
        kind: exchangeKindOf(line.id),
        relationship: relationshipOf(line),
        trait: traitKeys[0] ?? null,
        mood: null,
        experience: line.axis === "experience" ? line.id : null,
        belief: line.axis === "belief" ? line.id : null,
        place: line.world.place,
        pose: null,
        ageBand: ageBandOf(line.speaker.age),
      },
      seed:
        line.seed ?? `${result.seed}:${worldIndex.get(line.world.place) ?? 0}`,
      ...(line.choices ? { choices: line.choices } : {}),
      ...(line.lieOffered !== undefined ? { lieOffered: line.lieOffered } : {}),
    };
    // At most two items for any one relationship (CTO 9:03 p.m. Oct 6:
    // "dads carried 9 of 13").
    const voice = `${item.kind}|${voiceLabel(line)}`;
    const rule =
      (PROCEDURAL_KINDS.has(item.kind)
        ? "procedural wording: checked against real records, not put to the owner"
        : null) ??
      binRule(`${line.line}`) ??
      (pairs.has(pairOf(item))
        ? "repeats a situation and relationship already in the batch"
        : item.kind === "conversation" && (voices.get(voice) ?? 0) >= 2
          ? "this relationship already has two items in the batch"
          : null);
    if (rule) bin.push({ item, rule });
    else {
      pairs.add(pairOf(item));
      voices.set(voice, (voices.get(voice) ?? 0) + 1);
      items.push({ i: items.length, ...item });
    }
  }
  const kinds: Record<string, number> = {};
  for (const kind of TEXT_KINDS)
    kinds[kind] = items.filter((item) => item.kind === kind).length;
  // Every absent kind is a row that names the composer it is missing (CTO
  // 10:14 p.m. Oct 6), with what each world reported.
  const absent = TEXT_KINDS.filter((kind) => kinds[kind] === 0).map((kind) => {
    const row = result.absent?.find((entry) => entry.kind === kind);
    const binned = bin.filter((entry) => entry.item.kind === kind);
    // Lines were made but none reached the owner: say where they went.
    if (row?.dropped || binned.length > 0)
      return {
        kind,
        reason: `no output, because ${[
          ...(binned.length > 0
            ? [
                `${counted(binned.length, "line")} went to the bin (${[...new Set(binned.map((entry) => entry.rule))].join("; ")})`,
              ]
            : []),
          ...(row?.dropped ? [row.reason] : []),
        ].join("; ")}`,
      };
    const seen =
      row?.reason ?? "no situation in the batch reaches this kind yet";
    return {
      kind,
      reason: `no output, because ${MISSING_COMPOSER[kind] ?? "no composer reached this kind"}. In these worlds: ${seen.replace(/no output, because /g, "")}`,
    };
  });
  return {
    batch: {
      id: run.id,
      title: `Dialogue batch ${run.id} (${items.length} exchanges)`,
      at: run.at.toISOString(),
      head: run.head,
      status: "open",
      variety: {
        items: items.length,
        places: new Set(items.map((item) => item.cell.place)).size,
        kinds,
        distinctSituationRelationship: pairs.size,
      },
      absent,
      items,
    },
    bin,
  };
}

/** A cell's key in the coverage ledger. */
export function cellKey(item: GradingItem): string {
  const c = item.cell;
  return [item.kind, c.register, c.kind, c.relationship, c.ageBand].join("|");
}

export interface CoverageLedger {
  readonly byKind: Readonly<Record<string, number>>;
  readonly cells: Readonly<Record<string, number>>;
}

const LEDGER = "data/english/coverage.json";

export function readCoverageLedger(): CoverageLedger {
  if (!existsSync(LEDGER)) return { byKind: {}, cells: {} };
  return JSON.parse(readFileSync(LEDGER, "utf8")) as CoverageLedger;
}

export function addToLedger(
  ledger: CoverageLedger,
  batch: GradingBatch,
): CoverageLedger {
  const byKind = { ...ledger.byKind };
  const cells = { ...ledger.cells };
  for (const item of batch.items) {
    byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
    cells[cellKey(item)] = (cells[cellKey(item)] ?? 0) + 1;
  }
  return { byKind, cells };
}

export function writeCoverageLedger(batch: GradingBatch): void {
  const next = addToLedger(readCoverageLedger(), batch);
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, `${JSON.stringify(next, null, 2)}\n`);
}
