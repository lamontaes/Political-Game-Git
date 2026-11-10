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
  'You are checking lines of dialogue for a game set in American politics and ordinary life. For each pair, the first line (A) was just said by one person and the second (B) is the other person\'s reply. Words in {braces} stand for a name, a place or a number. Each pair also names its scene: what the whole conversation is about (for example "conflict accuse", "floor switch", "family loss"). Earlier lines of the scene are not shown. B may refer to the scene\'s own subject (the bill, the vote, the firm, the loss) even when A does not repeat it; that alone is never a reason to say B does not follow.\n\nFor each pair, do this in order:\n1. Say to yourself what A does: asks something (what?), offers something (what?), states something (what?), agrees to something, thanks, refuses, or says it is leaving.\n2. Find what B reacts to. B\'s main point is the thing it answers, agrees with, thanks for, pushes back on, promises, or asks about. Look for that thing in A.\n3. B FOLLOWS when that thing is in A: a real person could say B right after hearing A, and a listener would know what B is responding to. A reply may dodge, refuse, joke or change the subject on purpose and still follow, if a listener would understand it as a response to A.\n4. B does NOT follow when any of these is true:\n   - B answers a question A did not ask, or acts as if A had told a story, made a case, made an offer, given a plan or apologized when A did not;\n   - A asked a direct question or made a direct request and B neither answers it, refuses it, nor visibly dodges it;\n   - B agrees or disagrees with, or thanks A for, something A did not say;\n   - B leans on "it", "that", "them", "the third" or the like and A gives nothing it could mean;\n   - A already did the thing B asks for (A gave the plan and B asks what the plan is; A said yes and B treats it as a no; A has not told the story yet and B asks whether that is all of it);\n   - B\'s tone answers a different situation (A agrees warmly and B shrugs it off as if overruled).\n5. Do not judge whether either line is well written, only whether B follows A. Do not give B the benefit of an imagined earlier conversation: only A was said. If a listener would have to guess what B refers to, it does not follow.\n\nExamples that do NOT follow:\n- A: "Give me a minute. I\'ll explain how it happened." B: "And that\'s everything?" (A has not explained anything yet.)\n- A: "I\'ll call the landlord tomorrow and set up a payment by Friday." B: "Sorry isn\'t enough. What\'s your plan?" (A just gave the plan and did not say sorry.)\n- A: "Count me in. I\'ll tell them tonight." B: "Have it your way." (B answers a refusal, and A agreed.)\n- A: "We open at nine on Saturdays." B: "I never said that about your brother." (Nothing in A is about a brother or a claim.)\nExamples that DO follow:\n- A: "Would you sign my petition?" B: "I don\'t really follow local politics." (A dodge a listener understands.)\n- A: "You can\'t avoid me forever." B: "I\'ve said all I\'m going to say."\n- A: "I need your vote on this." B: "What\'s in it for my district?"';

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
