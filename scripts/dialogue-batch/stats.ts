/**
 * How a batch's lines measure against the counted register cards: the median
 * turn length, the share of turns of three words or fewer, the share that ask
 * a question, and the share of replies that echo the turn before them.
 *
 * A development measure only. It reads finished lines and the cards; it never
 * changes a line and the game never draws against these figures.
 */
import {
  REGISTER_CARDS,
  type SpeechRegister,
} from "../../src/presentation/speech-registers";

export interface BatchStatLine {
  readonly line: string;
  /** The turn this line answers, when the situation records one. */
  readonly prior?: string;
}

export interface BatchStat {
  readonly key: "median-words" | "short-turns" | "questions" | "echo";
  readonly label: string;
  readonly value: number | null;
  readonly unit: "words" | "share";
  /** How many lines the figure was counted over. */
  readonly over: number;
  /** The card's figure, when the card records one. */
  readonly card: number | null;
}

/** Words as a listener hears them: letters, digits and apostrophes. */
export function spokenWords(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter(Boolean);
}

/** Whether `reply` repeats a run of three or more words from `prior`. */
export function echoes(reply: string, prior: string): boolean {
  const before = spokenWords(prior);
  const runs = new Set<string>();
  for (let at = 0; at + 3 <= before.length; at += 1)
    runs.add(before.slice(at, at + 3).join(" "));
  const after = spokenWords(reply);
  for (let at = 0; at + 3 <= after.length; at += 1)
    if (runs.has(after.slice(at, at + 3).join(" "))) return true;
  return false;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

const share = (count: number, total: number) =>
  total === 0 ? null : count / total;

export function batchStats(
  lines: readonly BatchStatLine[],
  register: SpeechRegister = "small-talk",
): readonly BatchStat[] {
  const card = REGISTER_CARDS[register].checks;
  const cardValue = (key: string) =>
    card.find((row) => row.key === key)?.value ?? null;
  const lengths = lines.map((entry) => spokenWords(entry.line).length);
  const answered = lines.filter((entry) => entry.prior !== undefined);
  return [
    {
      key: "median-words",
      label: "Median turn",
      value: median(lengths),
      unit: "words",
      over: lines.length,
      card: cardValue("median-words"),
    },
    {
      key: "short-turns",
      label: "Turns of three words or fewer",
      value: share(lengths.filter((n) => n <= 3).length, lines.length),
      unit: "share",
      over: lines.length,
      card: cardValue("short-turns"),
    },
    {
      key: "questions",
      label: "Turns that ask a question",
      value: share(
        lines.filter((entry) => entry.line.includes("?")).length,
        lines.length,
      ),
      unit: "share",
      over: lines.length,
      card: cardValue("questions"),
    },
    {
      key: "echo",
      label: "Replies that repeat three words of the turn before",
      value: share(
        answered.filter((entry) => echoes(entry.line, entry.prior!)).length,
        answered.length,
      ),
      unit: "share",
      over: answered.length,
      // An echo is never the target; the card for it is zero.
      card: 0,
    },
  ];
}

function shown(value: number | null, unit: BatchStat["unit"]): string {
  if (value === null) return "none counted";
  return unit === "words" ? `${value} words` : `${Math.round(value * 100)}%`;
}

export function statsSummary(stats: readonly BatchStat[]): string[] {
  return stats.map(
    (stat) =>
      `  ${stat.label}: ${shown(stat.value, stat.unit)} over ${stat.over} lines (card: ${stat.card === null ? "no figure recorded" : shown(stat.card, stat.unit)})`,
  );
}
