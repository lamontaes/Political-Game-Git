/**
 * Turns the mined counter bank (`data/english/parts/counter.json`) into a
 * visit to a county or town office counter: the clerk greets the next person,
 * the person says why they came, the clerk answers from the office's records
 * (the fee, the form, the deadline, which office handles it) and closes. Every
 * line is a piece mined from public-domain records or authored to the
 * calibrated patterns, with the office's record facts in its slots; a line whose facts the visit doesn't
 * carry is left out.
 *
 * Filing for office is the filing visit (`filing-bank.ts`); this is every
 * other errand at the same counter.
 *
 * Stand-in: the engine has no register card for a public counter, so these
 * compose under small-talk until PEOPLE adds one (listed for PEOPLE in
 * docs/coordination/words.md).
 *
 * OPUS-WORDS owns this file until PEOPLE folds it into the director.
 */
import bankJson from "../../data/english/parts/counter.json" with { type: "json" };
import { heldByGrades } from "../../src/english/english-grades";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "../../src/english/english-composition";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";

interface MinedPart {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
}
export const COUNTER_BANK = bankJson as unknown as { parts: MinedPart[] };

/** Why someone came to the counter. */
export type Errand = "pay" | "form" | "question";

interface Step {
  speaker: "clerk" | "visitor";
  subject: "clerk" | "visitor";
  role: string;
  act: SpeechAct;
  /** Only the sentences of this role that say this. */
  only?: RegExp;
  required?: boolean;
}

const OPEN: readonly Step[] = [
  {
    speaker: "clerk",
    subject: "clerk",
    role: "greet",
    act: "greet",
    only: /^(?:Good|Hi|Thank|Thanks|Sorry)/,
  },
  {
    speaker: "clerk",
    subject: "clerk",
    role: "greet",
    act: "offer",
    only: /help|do for you|next/i,
    required: true,
  },
];

/** The middle of the visit, by errand. */
export const ERRANDS: Readonly<Record<Errand, readonly Step[]>> = {
  pay: [
    {
      speaker: "visitor",
      subject: "visitor",
      role: "ask",
      act: "ask",
      only: /^How much|cost/,
      required: true,
    },
    {
      speaker: "clerk",
      subject: "clerk",
      role: "fee",
      act: "answer",
      required: true,
    },
    {
      speaker: "clerk",
      subject: "clerk",
      role: "form",
      act: "request",
      only: /^Sign/,
    },
  ],
  form: [
    {
      speaker: "visitor",
      subject: "visitor",
      role: "ask",
      act: "ask",
      only: /^What do I (?:need|do)|^Where do I/,
      required: true,
    },
    {
      speaker: "clerk",
      subject: "clerk",
      role: "form",
      act: "offer",
      only: /^Here/,
      required: true,
    },
    {
      speaker: "clerk",
      subject: "clerk",
      role: "form",
      act: "request",
      only: /^Sign/,
    },
  ],
  question: [
    {
      speaker: "visitor",
      subject: "visitor",
      role: "ask",
      act: "ask",
      only: /question/,
      required: true,
    },
    {
      speaker: "clerk",
      subject: "clerk",
      role: "answer",
      act: "answer",
      only: /^(?:Hold|One|Just|Give|Sure)/,
    },
    {
      speaker: "clerk",
      subject: "clerk",
      role: "answer",
      act: "answer",
      only: /^(?!Hold|One|Just|Give)(?!.*\{body\})/,
      required: true,
    },
    // Which office handles it, after "We don't do that here."
    {
      speaker: "clerk",
      subject: "clerk",
      role: "answer",
      act: "answer",
      only: /\{body\}/,
    },
  ],
};

const CLOSE: readonly Step[] = [
  {
    speaker: "clerk",
    subject: "clerk",
    role: "close",
    act: "tell",
    only: /^(?:You're all|That's)/,
  },
  {
    speaker: "visitor",
    subject: "visitor",
    role: "ask",
    act: "thank",
    only: /^(?:Thank|Thanks|I appreciate)/,
  },
  {
    speaker: "clerk",
    subject: "clerk",
    role: "close",
    act: "farewell",
    only: /^(?:Have|Good luck|Take care|You're welcome|No problem)/,
  },
];

/** `{filing_office}` becomes the renderer's `{{filing-office}}`. */
function engineText(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

function variantsFor(step: Step): LinePartVariant[] {
  const match = (use: { subject: string; role: string }) =>
    use.subject === step.subject && use.role === step.role;
  return COUNTER_BANK.parts
    .filter(
      (part) =>
        part.shippable &&
        !heldByGrades(part.key) &&
        part.uses.some(match) &&
        (!step.only || step.only.test(part.text)),
    )
    .map((part) => {
      const requires = part.uses.find(match)?.requiresFacts;
      return {
        key: part.key,
        kind: "template" as const,
        text: engineText(part.text),
        ...(requires?.length ? { requiresFacts: requires } : {}),
      };
    });
}

export interface CounterLine {
  speaker: "clerk" | "visitor";
  text: string;
  sourceRecordIds: string[];
}

/**
 * One visit to the counter. The packet carries the office's record facts:
 * `fee` (or `no-fee`), `deadline`, `body` (the office that handles it, with
 * `wrong-office`), `morning` or `afternoon`, and the clerk's answer as a fact
 * (`answer-yes`, `answer-no`, `answer-depends`, `answer-unknown`,
 * `past-deadline`, `office-website`). Null when the visit can't be worded
 * from the record.
 */
export function composeCounterVisit(
  packet: GroundedEnglishPacket,
  errand: Errand,
): CounterLine[] | null {
  const lines: CounterLine[] = [];
  for (const [index, step] of [
    ...OPEN,
    ...ERRANDS[errand],
    // "You're all set." closes a payment or a form, not an answer.
    ...(errand === "question" ? CLOSE.slice(1) : CLOSE),
  ].entries()) {
    const variants = variantsFor(step);
    const bank: ComposedLineBank = {
      key: `counter.${errand}.${index}-${step.role}`,
      version: "words-counter-v1",
      surface: "dialogue",
      act: step.act,
      parts: { core: { variants } },
    };
    const line = variants.length
      ? composeGroundedLine(
          {
            ...packet,
            momentKey: `${packet.momentKey}/${errand}/${index}`,
          },
          bank,
          { register: "small-talk" },
        )
      : null;
    if (!line || line.kind !== "rendered") {
      if (step.required) return null;
      continue;
    }
    lines.push({
      speaker: step.speaker,
      text: line.text,
      sourceRecordIds: [...line.sourceRecordIds],
    });
  }
  return lines;
}
