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
import addressJson from "../../data/english/parts/address.json" with { type: "json" };
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
  // A resident's public comment: the address bank's pieces for that occasion.
  ...(addressJson as unknown as { parts: Part[] }).parts.filter((part) =>
    part.uses?.some((use) => use.subject === "public-comment"),
  ),
];

/** What the body is doing at its table. */
export type BodyScene = "vote" | "hearing";

/** One resident who spoke at the meeting, from the meeting engine's remark record. */
export interface HearingSpeaker {
  readonly remarkId: string;
  readonly name: string;
  readonly place: string;
  /** For (+1) or against (-1) the bill. */
  readonly position: number;
}

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

function variantsFor(step: Step): LinePartVariant[] {
  const match = (use: { subject: string; role: string }) =>
    use.subject === step.subject && use.role === step.role;
  return BODY_PARTS.filter(
    (part) =>
      part.shippable &&
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
function composeStep(
  packet: GroundedEnglishPacket,
  key: string,
  step: Step,
): BodyLine | null {
  const variants = variantsFor(step);
  if (!variants.length) return null;
  const bank: ComposedLineBank = {
    key: `body.${key}-${step.role}`,
    version: "words-body-v1",
    surface: "dialogue",
    act: step.act,
    parts: { core: { variants } },
  };
  const line = composeGroundedLine(
    { ...packet, momentKey: `${packet.momentKey}/${key}` },
    bank,
    { register: "small-talk" },
  );
  return line.kind === "rendered"
    ? {
        speaker: step.speaker,
        text: line.text,
        sourceRecordIds: [...line.sourceRecordIds],
      }
    : null;
}

export function composeBodyScene(
  packet: GroundedEnglishPacket,
  scene: BodyScene,
): BodyLine[] | null {
  const lines: BodyLine[] = [];
  for (const [index, step] of SCENES[scene].entries()) {
    const line = composeStep(packet, `${scene}.${index}`, step);
    if (!line) {
      if (step.required) return null;
      continue;
    }
    lines.push(line);
  }
  return lines;
}

const COMMENT_STEPS: readonly Step[] = [
  {
    speaker: "public",
    subject: "public-comment",
    role: "name",
    act: "greet",
    only: /^My name is \{name\}, and I live in \{place\}\.$/,
    required: true,
  },
  {
    speaker: "public",
    subject: "public-comment",
    role: "ask",
    act: "ask",
    only: /^I urge you to support/,
  },
  {
    speaker: "public",
    subject: "public-comment",
    role: "close",
    act: "farewell",
    only: /^Thank you for your (?:time|consideration)\.$/,
  },
];

/**
 * A budget hearing worded from the records of a bill and the residents who
 * spoke on it: the chair opens the item and calls each speaker by name, each
 * says who they are and, when they spoke for the bill, urges support, then
 * the chair puts the question and announces the recorded result. `vote` is
 * the vote scene's packet (motion, counts, outcome); each speaker's lines
 * cite their own remark record and the bill's. Null when the vote can't be
 * worded.
 */
export function composeBudgetHearing(
  vote: GroundedEnglishPacket,
  speakers: readonly HearingSpeaker[],
  billId: string,
): BodyLine[] | null {
  const ground = (text: string, id: string) => ({
    text,
    sourceRecordIds: [id, billId],
  });
  const lines: BodyLine[] = [];
  for (const [at, speaker] of speakers.entries()) {
    const facts = {
      ...vote.facts,
      speaker: ground(speaker.name, speaker.remarkId),
      name: ground(speaker.name, speaker.remarkId),
      place: ground(speaker.place, speaker.remarkId),
      ...(vote.facts.motion
        ? { issue: vote.facts.motion, bill: vote.facts.motion }
        : {}),
    };
    const packet = {
      ...vote,
      facts,
      sourceRecordIds: [...vote.sourceRecordIds, speaker.remarkId],
      momentKey: `${vote.momentKey}/speaker/${at}`,
      knowledge: Object.entries(facts).map(([factKey, fact]) => ({
        personId: "chair",
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })),
    } as unknown as GroundedEnglishPacket;
    const invite = composeStep(packet, `budget.${at}.invite`, {
      speaker: "chair",
      subject: "chair",
      role: "introduce",
      act: "greet",
    });
    if (invite) lines.push(invite);
    // A member asks the first speaker about the measure.
    const ask =
      at === 0
        ? composeStep(packet, "budget.0.ask", {
            speaker: "member",
            subject: "members",
            role: "ask",
            act: "ask",
            only: /^(?:Who pays for|Who would this measure help)/,
          })
        : null;
    for (const [index, step] of COMMENT_STEPS.entries()) {
      // Only a speaker for the bill urges support.
      if (step.role === "ask" && speaker.position <= 0) continue;
      const line = composeStep(packet, `budget.${at}.say.${index}`, step);
      if (line) lines.push(line);
    }
    if (ask) lines.push(ask);
  }
  const result = composeBodyScene(vote, "vote");
  return result ? [...lines, ...result] : null;
}
