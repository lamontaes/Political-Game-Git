/**
 * Turns the mined conversation bank (`data/english/parts/conversation.json`)
 * into the story director's conversation data, so the director words every
 * line from sentences real people said instead of hand-written templates.
 *
 * Each mined part lists its uses: a director subject (own-work, home, kin, ...),
 * a role (ask, raise, reply, answer, lie) and a choice (plain, since, turn,
 * brief, ...). Asking, raising, replying and lying offer every variant to the
 * grounded renderer, which picks one by a stable hash and refuses any whose
 * facts are missing. An answer choice is one choice with several wordings:
 * its variants are kept in `variantsOf` and one is chosen per conversation
 * moment by the same stable hash, so two wordings of one choice never show
 * as two choices.
 *
 * Slots are written `{my_employer}` in the bank (the bank schema's `\w`
 * slots) and `{{my-employer}}` for the director's renderer.
 *
 * OPUS-WORDS owns this file until OPUS-PEOPLE folds it into the director.
 */
import bankJson from "../../data/english/parts/conversation.json" with { type: "json" };
import { heldByGrades } from "../../src/presentation/english-grades";
import {
  CONVERSATION_DATA,
  type ConversationData,
} from "../../src/director/conversation";

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
  transcriptsUsing: number;
  shippable: boolean;
  source: { document: string; date: string; url: string; license?: string };
}
export interface MinedBank {
  register: string;
  parts: MinedPart[];
}

export const CONVERSATION_BANK = bankJson as unknown as MinedBank;

/** The director's roles, as its data names them. */
const ROLE_FIELD: Record<
  string,
  "ask" | "raise" | "reply" | "answers" | "lie"
> = {
  ask: "ask",
  raise: "raise",
  reply: "reply",
  answer: "answers",
  lie: "lie",
};

const SLOT = /\{\w+\}/;

/** `{my_employer}` becomes the renderer's `{{my-employer}}`. */
export function directorSlots(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

interface DirectorMove {
  key: string;
  text: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
}

/**
 * The director's conversation data worded from the mined bank. `pick` chooses
 * one wording per answer choice (default: the wording most transcripts say),
 * so a caller can vary wordings by a stable key without rolling.
 */
export function conversationDataFromBank(
  bank: MinedBank = CONVERSATION_BANK,
  pick?: (choiceKey: string, variants: readonly MinedPart[]) => MinedPart,
): ConversationData {
  const subjects: Record<string, Record<string, DirectorMove[]>> = {};
  const answerVariants = new Map<
    string,
    { use: MinedUse; parts: MinedPart[] }
  >();
  for (const part of bank.parts) {
    // A part the owner graded down and never up is not said.
    if (!part.shippable || heldByGrades(part.key)) continue;
    for (const use of part.uses) {
      const field = ROLE_FIELD[use.role];
      if (!field) continue;
      if (field === "answers") {
        const id = `${use.subject}/${use.choice}/${(use.stages ?? []).join(",")}`;
        const entry = answerVariants.get(id) ?? { use, parts: [] };
        entry.parts.push(part);
        answerVariants.set(id, entry);
        continue;
      }
      const moves = ((subjects[use.subject] ??= {})[field] ??= []);
      moves.push(directorMove(`${use.choice}.${part.key}`, part, use));
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
  const chosenAnswers = new Map<string, MinedPart>();
  for (const [id, { parts }] of answerVariants) {
    const ordered = [...parts].sort(
      (a, b) =>
        b.transcriptsUsing - a.transcriptsUsing || a.key.localeCompare(b.key),
    );
    chosenAnswers.set(id, pick ? pick(id, ordered) : ordered[0]!);
  }
  for (const [id, { use }] of answerVariants) {
    const chosen = chosenAnswers.get(id)!;
    const move = directorMove(use.choice, chosen, use);
    // A question turned back ("And you?") follows the plain answer, so the
    // question is never answered with a question.
    if (
      use.choice === "turn" &&
      /\?$/.test(chosen.text) &&
      !SLOT.test(chosen.text)
    ) {
      const plain = chosenAnswers.get(`${use.subject}/plain/`);
      if (plain && !/\?$/.test(plain.text))
        move.text = `${directorSlots(plain.text)} ${move.text}`;
    }
    ((subjects[use.subject] ??= {}).answers ??= []).push(move);
  }
  return {
    ...CONVERSATION_DATA,
    version: `words-${bank.register}-v1`,
    subjects,
  };
}

/** A wording per answer choice chosen by a stable hash of a key (a seed, a moment). */
export function pickBy(key: string) {
  return (choiceKey: string, variants: readonly MinedPart[]): MinedPart =>
    variants[stableHash(`${key}:${choiceKey}`) % variants.length]!;
}

function directorMove(
  key: string,
  part: MinedPart,
  use: MinedUse,
): DirectorMove {
  return {
    key,
    text: directorSlots(part.text),
    ...(use.stages ? { stages: use.stages } : {}),
    ...(use.raises ? { raises: use.raises } : {}),
    ...(use.requiresFacts
      ? { requiresFacts: use.requiresFacts.map((f) => f.replace(/_/g, "-")) }
      : {}),
  };
}

/** Director subjects and roles the hand-written bank fills and the mined bank does not. */
export function uncovered(
  bank: MinedBank = CONVERSATION_BANK,
): readonly string[] {
  const mined = conversationDataFromBank(bank).subjects;
  const gaps: string[] = [];
  for (const [subject, roles] of Object.entries(CONVERSATION_DATA.subjects))
    for (const [role, moves] of Object.entries(roles)) {
      const have = (mined[subject] as Record<string, DirectorMove[]>)?.[role];
      if (role !== "answers") {
        if (!have?.length) gaps.push(`${subject}.${role}`);
        continue;
      }
      for (const move of moves as DirectorMove[])
        if (!have?.some((row) => row.key === move.key))
          gaps.push(`${subject}.answers.${move.key}`);
    }
  return gaps;
}
