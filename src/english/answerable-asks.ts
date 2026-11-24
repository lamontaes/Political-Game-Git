/**
 * Rule 108 (words machine): a question is offered only if the record can
 * answer it. Sorts each asking line of a composed scene talk into the Words
 * lead's four classes, by path, and lists the failures. The guard
 * (`tests/guards/english/answerable-asks.test.ts`) and the report script
 * (`scripts/words/answerable-asks.ts`) both read it. It changes no bank.
 *   1 courtesy opener (out of the rule)
 *   2 a question the player's own offered replies answer (passes while a reply follows)
 *   3 a challenge that wants no information (passes while any reply follows)
 *   4 a real request for information (needs an answer line on the path, guarded on a record fact)
 */
import type {
  SceneTalk,
  SceneTalkLine,
  TreeNode,
} from "../director/scene-talk";

/** A bank part and the facts it is guarded on, as the bank file holds them. */
export interface FactPart {
  key: string;
  requiresFacts?: string[];
  onlyWhen?: string[];
  uses?: { requiresFacts?: string[]; onlyWhen?: string[] }[];
}

export type AskClass = 1 | 2 | 3 | 4;

export interface AskFail {
  klass: AskClass;
  purpose: string;
  line: SceneTalkLine;
  why: string;
}

const COURTESY =
  /^(?:have you got a (?:few )?minutes?|is now a bad time|hey\. have you got|how are you|you okay|are you okay|are you all right|how'?s it going|how have you been|what'?s up|how are things|got a minute|do you have a (?:minute|moment))/i;
const CHALLENGE =
  /^(?:are you (?:threatening|serious|kidding|saying)|who else|did it ever|do you (?:really )?think i|why would i|what do you want me to|so (?:that'?s|you)|is that (?:a|supposed)|are you (?:trying|here to)|what'?s that supposed)/i;
const INFO =
  /^(?:what|where|when|who|whom|whose|which|why|how|is |are |does |did |do you (?:know|remember|see|have)|has |have |was |were |would i|will i|could i|can i )/i;
/** An invitation to ask: the scene must then take a question and answer it. */
const INVITES = /\bask me (?:anything|whatever)\b/i;

const firstQuestion = (text: string): string =>
  text.split(/(?<=[.!?])\s+/).find((sentence) => sentence.endsWith("?")) ??
  text;

/** Which of the four classes an asking line falls in. */
export function askClass(text: string): AskClass {
  const q = firstQuestion(text).trim();
  if (COURTESY.test(text.trim()) || COURTESY.test(q)) return 1;
  if (CHALLENGE.test(q)) return 3;
  if (INFO.test(q)) return 4;
  return 2;
}

/** Whether a line asks, or invites a question ("Ask me anything about it."). */
export const asksOrInvites = (line: SceneTalkLine): boolean =>
  line.asks || INVITES.test(line.text);

/** The record facts a line's parts are guarded on (`requiresFacts`, `onlyWhen`). */
export function factsOf(
  line: SceneTalkLine,
  parts: ReadonlyMap<string, FactPart>,
): string[] {
  return line.parts.flatMap((key) => {
    const part = parts.get(key);
    if (!part) return [];
    return [
      ...(part.requiresFacts ?? []),
      ...(part.onlyWhen ?? []),
      ...(part.uses ?? []).flatMap((use) => [
        ...(use.requiresFacts ?? []),
        ...(use.onlyWhen ?? []),
      ]),
    ];
  });
}

/** Every failing asking line of these talks, and how many asking lines were read. */
export function answerableAsks(
  talks: readonly SceneTalk[],
  parts: ReadonlyMap<string, FactPart>,
): { fails: AskFail[]; seen: number } {
  const fails: AskFail[] = [];
  let seen = 0;

  function check(
    talk: SceneTalk,
    line: SceneTalkLine,
    rest: SceneTalkLine[],
    node: TreeNode,
  ): void {
    seen += 1;
    const invites = !line.asks && INVITES.test(line.text);
    const klass: AskClass = invites ? 4 : askClass(line.text);
    if (klass === 1) return;
    const next = rest[0];
    const endsHere = !next && node.replies.length === 0 && !node.branches;
    const playerNext = !next && node.replies.length > 0;
    const what = invites
      ? "invitation"
      : klass === 3
        ? "challenge"
        : "question";
    if (klass === 2 || klass === 3) {
      if (endsHere)
        fails.push({
          klass,
          purpose: talk.purpose,
          line,
          why: `the scene ends on the ${what}`,
        });
      return;
    }
    if (endsHere) {
      fails.push({
        klass,
        purpose: talk.purpose,
        line,
        why: `the scene ends on the ${what}`,
      });
      return;
    }
    if (playerNext) return; // the player answers from their own life: the choices carry it
    if (next && next.role !== line.role) {
      const answering =
        /answer|tell/.test(next.move) || next.after === line.move;
      if (!answering)
        fails.push({
          klass,
          purpose: talk.purpose,
          line,
          why: `next line is ${next.move}, not an answer`,
        });
      else if (factsOf(next, parts).length === 0)
        fails.push({
          klass,
          purpose: talk.purpose,
          line,
          why: `the answer (${next.move}) carries no record fact`,
        });
      return;
    }
    fails.push({
      klass,
      purpose: talk.purpose,
      line,
      why: "no answer line follows it",
    });
  }

  function visit(talk: SceneTalk, node: TreeNode): void {
    node.lines.forEach((line, index) => {
      if (line.role !== "narrator" && asksOrInvites(line))
        check(talk, line, node.lines.slice(index + 1), node);
    });
    for (const reply of node.replies) {
      if (asksOrInvites(reply.line))
        check(
          talk,
          reply.line,
          reply.next?.lines.slice(0, 1) ?? [],
          reply.next ?? { lines: [], replies: [] },
        );
      if (reply.next) visit(talk, reply.next);
    }
    for (const branch of node.branches ?? []) visit(talk, branch.node);
  }

  for (const talk of talks) {
    for (const line of [talk.open, talk.state, ...talk.intro].filter(
      (l): l is SceneTalkLine => !!l,
    )) {
      if (asksOrInvites(line) && line.role !== "narrator") {
        const first = talk.tree.lines[0];
        check(
          talk,
          line,
          first && line !== talk.state ? [] : talk.tree.lines.slice(0, 1),
          talk.tree,
        );
      }
    }
    visit(talk, talk.tree);
  }
  return { fails, seen };
}
