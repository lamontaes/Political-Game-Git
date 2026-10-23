/**
 * Turns the authored floor and hearing parts (`data/english/parts/meeting.json`
 * and `hearing.json`, the pieces with `uses`) into what a town body says at its
 * table: the chair calls the meeting and puts the question, a member asks for a
 * local project, colleagues second, oppose or blame, the chair announces the
 * result; and at a public hearing the chair calls each speaker and members ask
 * their questions. Every line is an authored piece (origin: authored) with the
 * body's record facts in its slots; a line whose facts the packet doesn't carry
 * is left out.
 *
 * Stand-in: the engine has no register card for a town body's table, so these
 * compose under small-talk until PEOPLE adds one (listed in
 * docs/coordination/words.md).
 */
import hearingJson from "../../data/english/parts/hearing.json" with { type: "json" };
import meetingJson from "../../data/english/parts/meeting.json" with { type: "json" };
import { heldByGrades } from "../../src/english/english-grades";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
  type SpeechAct,
} from "../../src/english/english-composition";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";

interface Part {
  key: string;
  text: string;
  uses?: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
}
export const BODY_PARTS: readonly Part[] = [
  ...(meetingJson as unknown as { parts: Part[] }).parts,
  ...(hearingJson as unknown as { parts: Part[] }).parts,
];

/** What the body is doing at its table. */
export type BodyScene = "vote" | "hearing";

interface Step {
  speaker: "chair" | "member" | "colleague" | "public";
  subject: string;
  role: string;
  act: SpeechAct;
  /** Only the sentences of this role that say this. */
  only?: RegExp;
  required?: boolean;
}

export const SCENES: Readonly<Record<BodyScene, readonly Step[]>> = {
  vote: [
    {
      speaker: "chair",
      subject: "chair",
      role: "call-to-order",
      act: "greet",
      required: true,
    },
    {
      speaker: "member",
      subject: "member",
      role: "request",
      act: "ask",
    },
    {
      speaker: "colleague",
      subject: "colleagues",
      role: "blame",
      act: "tell",
    },
    {
      speaker: "chair",
      subject: "chair",
      role: "put-question",
      act: "ask",
      only: /^The question is|^The clerk will call/,
      required: true,
    },
    {
      speaker: "colleague",
      subject: "colleagues",
      role: "agree",
      act: "agree",
    },
    {
      speaker: "colleague",
      subject: "colleagues",
      role: "disagree",
      act: "disagree",
    },
    {
      speaker: "chair",
      subject: "chair",
      role: "announce-result",
      act: "tell",
      required: true,
    },
    {
      speaker: "chair",
      subject: "chair",
      role: "close",
      act: "farewell",
      only: /adjourned/,
    },
  ],
  hearing: [
    {
      speaker: "chair",
      subject: "chair",
      role: "introduce",
      act: "greet",
      required: true,
    },
    {
      speaker: "member",
      subject: "members",
      role: "ask",
      act: "ask",
      required: true,
    },
    {
      speaker: "member",
      subject: "members",
      role: "ask",
      act: "ask",
    },
  ],
};

/** `{blamed}` becomes the renderer's `{{blamed}}`. */
function engineText(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) => `{{${slot.replace(/_/g, "-")}}}`,
  );
}

function variantsFor(step: Step, includeHeld: boolean): LinePartVariant[] {
  const match = (use: { subject: string; role: string }) =>
    use.subject === step.subject && use.role === step.role;
  return BODY_PARTS.filter(
    (part) =>
      (part.shippable || includeHeld) &&
      !heldByGrades(part.key) &&
      part.uses?.some(match) &&
      (!step.only || step.only.test(part.text)),
  ).map((part) => {
    const requires = part.uses!.find(match)?.requiresFacts;
    return {
      key: part.key,
      kind: "template" as const,
      text: engineText(part.text),
      ...(requires?.length ? { requiresFacts: requires } : {}),
    };
  });
}

export interface BodyLine {
  speaker: Step["speaker"];
  text: string;
  sourceRecordIds: string[];
}

/**
 * One stretch at the body's table. The packet carries the body's record
 * facts: `motion`, `project` (a member's request), `blamed` (a colleague's
 * blame), `ayes` and `nays` with `carried`, `failed` or `tabled`; at a hearing
 * `speaker`, `bill`, `cost` and `place`. Null when the scene can't be worded
 * from the record.
 */
export function composeBodyScene(
  packet: GroundedEnglishPacket,
  scene: BodyScene,
  /** Grading and tests only: also use parts held back (`shippable: false`) until graded; play never sets it. */
  options: { includeHeld?: boolean } = {},
): BodyLine[] | null {
  const lines: BodyLine[] = [];
  for (const [index, step] of SCENES[scene].entries()) {
    const variants = variantsFor(step, options.includeHeld === true);
    const bank: ComposedLineBank = {
      key: `body.${scene}.${index}-${step.role}`,
      version: "words-body-v1",
      surface: "dialogue",
      act: step.act,
      parts: { core: { variants } },
    };
    const line = variants.length
      ? composeGroundedLine(
          {
            ...packet,
            momentKey: `${packet.momentKey}/${scene}/${index}`,
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
