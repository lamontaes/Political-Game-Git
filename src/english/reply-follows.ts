/**
 * Whether a reply follows the line before it (the rule
 * `reply-follows-the-line-before`, `data/english/line-rules.json`).
 *
 * Every pair (line before, reply) the director can produce is judged once
 * against the rubric below (`npm run words:pairs`, judges, `npm run
 * words:verdicts`); the verdicts are `data/english/judged/reply-follows.json`.
 * A reply that does not follow some line is not pulled (owner, Nov 9: when
 * the context is wrong, fix the setup and keep the line); it is simply never
 * offered after that line. The picker (`scene-talk-words.ts`) and the run
 * (`scripts/words/run-rules.ts`) both read the verdicts through `follows`.
 *
 * A pair nobody has judged follows: the table lists only the "no" verdicts.
 */
import verdictFile from "../../data/english/judged/reply-follows.json" with { type: "json" };

/** The question every judge answers for every pair, word for word. */
export const REPLY_FOLLOWS_RUBRIC =
  'You are checking lines of dialogue for a game set in American politics and ordinary life. For each pair, the first line was just said by one person and the second is the other person\'s reply. Words in {braces} stand for a name, a place or a number. Say whether the reply FOLLOWS the first line: a real person could say it right after hearing that line, and it answers, acknowledges, pushes back on or reacts to what was actually said. It does NOT follow when it answers a question that was not asked, ignores a direct question, agrees or disagrees with something nobody said, refers to "it" or "that" when the first line gives nothing it could mean, treats a statement as an offer or an offer as a statement, or only repeats the first line\'s point as if it were new. A reply may dodge, refuse, joke or change the subject on purpose and still follow, if a listener would understand it as a response to that line. Judge only these two lines together; do not judge whether either line is well written. When you cannot tell, say it follows.';

/** The verdict file (`data/english/judged/reply-follows.json`). */
export interface ReplyFollowsFile {
  readonly schema: "english-judged/1";
  readonly rule: "reply-follows-the-line-before";
  readonly rubric: string;
  /** How many pairs were judged, yes and no. */
  readonly judged: number;
  /** For each reply, the lines it does not follow. */
  readonly no: Readonly<Record<string, readonly string[]>>;
  /** A hash of the sorted ids of the pairs judged yes (`reply-follows.yes.txt`). */
  readonly yesHash: string;
}

/** The "no" verdicts as one lookup: a reply key to the set of lines it does not follow. */
export type ReplyFollowsTable = ReadonlyMap<string, ReadonlySet<string>>;

/** Built once; a lookup is two `Map` reads. */
export function tableOf(
  no: Readonly<Record<string, readonly string[]>>,
): ReplyFollowsTable {
  return new Map(
    Object.entries(no).map(([reply, before]) => [reply, new Set(before)]),
  );
}

export const REPLY_FOLLOWS: ReplyFollowsTable = tableOf(
  (verdictFile as unknown as ReplyFollowsFile).no,
);

/** Whether the reply follows that line: false only where a judge said it does not. */
export function follows(
  replyKey: string,
  beforeKey: string,
  table: ReplyFollowsTable = REPLY_FOLLOWS,
): boolean {
  return !table.get(replyKey)?.has(beforeKey);
}
