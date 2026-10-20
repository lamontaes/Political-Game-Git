/**
 * Turns the mined interview bank (`data/english/parts/interview.json`) into
 * the interview's words (`src/director/interview.ts`): the reporter's open,
 * question and close, and the candidate's answer for each of the conversation's
 * moves. Every line is a sentence a public-domain federal record says; a
 * sentence whose slot or required fact the interview's records do not give is
 * left out here, never filled in.
 */
import bankJson from "../../../data/english/parts/interview.json" with { type: "json" };
import { heldByGrades } from "../../english/english-grades";
import type { Variant } from "../render";

interface Use {
  subject: string;
  role: string;
  choice: string;
  requiresFacts?: string[];
}
interface MinedPart {
  key: string;
  text: string;
  uses: Use[];
  shippable: boolean;
}
export const INTERVIEW_BANK = bankJson as unknown as { parts: MinedPart[] };

/** The slots an interview's records fill: the question's name, twice over. */
const SLOTS = new Set(["issue", "topic"]);

function directorText(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_all, slot: string) => `{{${slot}}}`);
}

export interface InterviewWords {
  version: string;
  open: Variant[];
  ask: Variant[];
  close: Variant[];
  /** The candidate's answer by role (commit, record, opponent, deflect). */
  answer: Readonly<Record<string, (facts: ReadonlySet<string>) => Variant[]>>;
}

export function interviewWordsFromBank(
  bank: { parts: MinedPart[] } = INTERVIEW_BANK,
): InterviewWords {
  const of = (
    subject: string,
    role: string,
    facts: ReadonlySet<string> = new Set(),
  ) =>
    bank.parts
      .filter(
        (part) =>
          part.shippable &&
          !heldByGrades(part.key) &&
          [...part.text.matchAll(/\{(\w+)\}/g)].every((m) =>
            SLOTS.has(m[1]!),
          ) &&
          part.uses.some(
            (use) =>
              use.subject === subject &&
              use.role === role &&
              (use.requiresFacts ?? []).every((fact) => facts.has(fact)),
          ),
      )
      .map((part): Variant => ({
        key: part.key,
        text: directorText(part.text),
      }));
  return {
    version: "words-interview-v1",
    open: of("reporter", "open"),
    // Only the question that names the issue: the others need a record the
    // interview does not carry.
    ask: of("reporter", "issue").filter((v) => v.text.includes("{{issue}}")),
    close: of("official", "close"),
    answer: Object.fromEntries(
      ["commit", "record", "opponent", "deflect"].map((role) => [
        role,
        (facts: ReadonlySet<string>) => of("official", role, facts),
      ]),
    ),
  };
}
