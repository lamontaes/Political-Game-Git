/**
 * The director's conversation words, from the mined conversation bank
 * (`data/english/parts/conversation.json`): sentences real Americans said,
 * each with its public-domain source. Nothing here is written by hand; the
 * rules a conversation runs by (`../data/conversation-rules.json`) carry no
 * sentence text.
 *
 * Each mined part lists its uses: a director subject (own-work, home, kin, ...),
 * a role (ask, raise, reply, answer, lie, open, leave, doubt) and a choice
 * (plain, since, turn, brief, ...). Every role offers all its wordings to the
 * grounded renderer, which picks one by a stable hash and refuses any whose
 * facts are missing. An answer choice keeps every wording under the choice's
 * key, so two wordings of one choice never show as two choices.
 *
 * Slots are written `{my_employer}` in the bank and `{{my-employer}}` for the
 * director's renderer. A part the owner's grades hold back is never said.
 *
 * Moved from `scripts/english-corpus/conversation-bank.ts` (OPUS-WORDS) so
 * shipped code reads it without importing scripts.
 */
import bankJson from "../../../data/english/parts/conversation.json" with { type: "json" };
import { heldByGrades } from "../../english/english-grades";
import rulesJson from "../data/conversation-rules.json" with { type: "json" };
import type { ConversationData, Move } from "../conversation";

export interface MinedUse {
  subject: string;
  role: string;
  choice: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
}
export interface MinedPart {
  key: string;
  move: string;
  text: string;
  uses: MinedUse[];
  transcriptsUsing?: number;
  shippable: boolean;
  /** A piece written to the calibrated patterns names its author and date, not a source (text rule, Oct 15). */
  origin?: "authored";
  author?: string;
  date?: string;
  source?: { document: string; date: string; url: string; license?: string };
}
export interface MinedBank {
  register: string;
  parts: MinedPart[];
}

export const CONVERSATION_BANK = bankJson as unknown as MinedBank;
export const CONVERSATION_RULES = rulesJson as unknown as Omit<
  ConversationData,
  "version" | "subjects"
>;

/** The director's roles, as its data names them. */
const ROLE_FIELD: Record<string, keyof SubjectWords> = {
  ask: "ask",
  raise: "raise",
  reply: "reply",
  answer: "answers",
  lie: "lie",
  open: "open",
  leave: "leave",
  doubt: "reply",
};
type SubjectWords = NonNullable<ConversationData["subjects"][string]>;

const SLOT = /\{\w+\}/;
/**
 * The core keeps dates, not the hour, so a greeting or goodbye that names the
 * time of day ("Good evening.") has no record to stand on and is not said.
 */
const TIME_OF_DAY = /\b(?:morning|afternoon|evening|night)\b/i;

/** `{my_employer}` becomes the renderer's `{{my-employer}}`. */
export function directorSlots(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

/** Who a sentence speaks of, when it opens with a pronoun ("She's fine."). */
function pronounOf(text: string): Move["pronoun"] {
  const lead = /^(he|she|they)\b/i.exec(text)?.[1]?.toLowerCase();
  return lead === "he" || lead === "she" || lead === "they" ? lead : undefined;
}

function directorMove(key: string, part: MinedPart, use: MinedUse): Move {
  const pronoun = pronounOf(part.text);
  return {
    key,
    part: part.key,
    text: directorSlots(part.text),
    ...(use.stages ? { stages: use.stages } : {}),
    ...(use.raises ? { raises: use.raises } : {}),
    ...(use.requiresFacts
      ? { requiresFacts: use.requiresFacts.map((f) => f.replace(/_/g, "-")) }
      : {}),
    ...(pronoun ? { pronoun } : {}),
  };
}

/**
 * The director's conversation data worded from the mined bank. Every wording
 * of a choice is kept; the renderer's stable pick chooses one per moment.
 */
export function conversationDataFromBank(
  bank: MinedBank = CONVERSATION_BANK,
): ConversationData {
  const subjects: Record<string, SubjectWords> = {};
  for (const part of bank.parts) {
    // A part the owner graded down and never up is not said.
    if (!part.shippable || heldByGrades(part.key)) continue;
    for (const use of part.uses) {
      const field = ROLE_FIELD[use.role];
      if (!field) continue;
      if (
        (use.subject === "greet" || use.subject === "farewell") &&
        TIME_OF_DAY.test(part.text)
      )
        continue;
      // Only the answers that fit the subject's question are offered.
      const fits = CONVERSATION_RULES.answerMoves?.[use.subject];
      if (field === "answers" && fits && !fits.includes(use.choice)) continue;
      const moves = ((subjects[use.subject] ??= {})[field] ??= []);
      if (moves.some((row) => row.part === part.key && row.key === use.choice))
        continue;
      const move =
        field === "answers"
          ? directorMove(use.choice, part, use)
          : directorMove(`${use.choice}.${part.key}`, part, use);
      // Asking after family is fine only while nothing says otherwise.
      if (
        use.subject === "family" &&
        use.choice === "well" &&
        !move.stages?.length
      )
        move.stages = ["default"];
      // Where someone went to school is said in the past once they're grown.
      if (use.subject === "school" && field === "answers" && !move.stages)
        move.stages =
          use.choice === "at" && /\b(?:went|graduated)\b/.test(part.text)
            ? ["graduated"]
            : ["enrolled"];
      // A bare question turned back ("And you?") follows the plain answer, so
      // the question is never answered with a question.
      if (
        field === "answers" &&
        use.choice === "turn" &&
        /\?$/.test(part.text) &&
        !SLOT.test(part.text)
      )
        move.afterPlain = true;
      moves.push(move);
    }
  }
  // Asking or raising names its subject. "Are you still there?" says where
  // only after something named the place, so it is never the opening line.
  // How long someone has been "there" is asked only right after they name it.
  for (const [subject, roles] of Object.entries(subjects))
    for (const field of ["ask", "raise"] as const)
      if (roles[field] && subject !== "their-tenure")
        roles[field] = roles[field].filter(
          (move) =>
            SLOT.test(move.text) || !/\b(?:there|that|it)\b/i.test(move.text),
        );
  // The same sentences serve the other side of a subject: asking someone
  // where they went to school, and their answer from their own record.
  if (subjects.school?.ask)
    (subjects["their-school"] ??= {}).raise = subjects.school.ask;
  if (subjects.school?.answers)
    (subjects["school-reply"] ??= {}).reply = subjects.school.answers.filter(
      (move) => move.key === "at",
    );
  // Asking after someone's relative, and the answer in their own words: the
  // same sentences serve the turn ("How's your sister?" "She's fine.").
  if (subjects.family?.ask)
    (subjects["their-family"] ??= {}).raise = subjects.family.ask;
  if (subjects.family?.answers)
    (subjects["family-reply"] ??= {}).reply = subjects.family.answers.filter(
      (move) => move.key === "well",
    );
  // A news item raised by the player is answered as the player would answer it.
  if (subjects.news?.answers)
    (subjects["news-reply"] ??= {}).reply = subjects.news.answers.filter(
      (move) => move.key === "yes" || move.key === "no",
    );
  if (subjects.news?.raise)
    subjects.news.raise = subjects.news.raise.filter((move) =>
      SLOT.test(move.text),
    );
  return {
    ...CONVERSATION_RULES,
    version: `words-${bank.register}-v2`,
    subjects,
  };
}

/** The mined conversation words the director reads by default. */
export const MINED_CONVERSATION = conversationDataFromBank();
