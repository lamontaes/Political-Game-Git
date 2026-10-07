import { composePressLine } from "./press-english";
import type { GroundedEnglishPacket } from "./grounded-english";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import type {
  PressInterviewChannel,
  PressRecordTerms,
  PressResponseIntent,
} from "../simulation/press-interviews";
import type { EntityId, World } from "../simulation/types";

export const PRESS_REQUEST_INTENTS = [
  "request-exchange",
  "offer-statement",
] as const;
export type PressRequestIntent = (typeof PRESS_REQUEST_INTENTS)[number];

export const PRESS_REQUEST_STANCES = [
  "report-what-is-recorded",
  "refuse-speculation",
  "correct-an-unsupported-claim",
] as const;
export type PressRequestStance = (typeof PRESS_REQUEST_STANCES)[number];

export const PRESS_REQUEST_INTENT_COPY: Readonly<
  Record<
    PressRequestIntent,
    { readonly label: string; readonly clause: string }
  >
> = {
  "request-exchange": {
    label: "Request an exchange",
    clause: "asks to arrange",
  },
  "offer-statement": {
    label: "Offer a statement",
    clause: "offers",
  },
};

export const PRESS_REQUEST_STANCE_COPY: Readonly<
  Record<
    PressRequestStance,
    { readonly label: string; readonly clause: string }
  >
> = {
  "report-what-is-recorded": {
    label: "Stay with the recorded file",
    clause:
      "They will speak only to what the public record already establishes.",
  },
  "refuse-speculation": {
    label: "Refuse speculation",
    clause: "They will not speculate beyond what is on the public record.",
  },
  "correct-an-unsupported-claim": {
    label: "Correct an unsupported claim",
    clause:
      "They will separate what has been recorded from claims the record does not support.",
  },
};

export const PRESS_ARRANGEMENT_PLACE_COPY: Readonly<
  Record<PressInterviewChannel, { readonly label: string }>
> = {
  written: { label: "Written correspondence" },
  spoken: { label: "Spoken exchange" },
};

export function plannedPressArrangementPlace(channel: PressInterviewChannel): {
  readonly label: string;
} {
  return PRESS_ARRANGEMENT_PLACE_COPY[channel];
}

export function composeBackgroundAttribution(
  roleTitle: string,
):
  | { readonly ok: true; readonly statement: string }
  | { readonly ok: false; readonly reason: string } {
  const title = roleTitle.trim();
  if (!title)
    return {
      ok: false,
      reason: "No recorded office or work title is available to attribute.",
    };
  if (/^(a|an|the)\s/i.test(title)) return { ok: true, statement: title };
  const article = /^[aeiou]/i.test(title) ? "an" : "a";
  return { ok: true, statement: `${article} ${title}` };
}

export function projectPressBackgroundAttributions(
  world: World,
  personId: EntityId,
): readonly string[] {
  const seen = new Set<string>();
  const statements: string[] = [];
  for (const { role } of activeWorkRelationshipsAt(world, personId)) {
    const composed = composeBackgroundAttribution(role.title);
    if (!composed.ok || seen.has(composed.statement)) continue;
    seen.add(composed.statement);
    statements.push(composed.statement);
  }
  return statements;
}

export function composePressRequestPitch(input: {
  readonly subjectSummary: string;
  readonly intent: PressRequestIntent;
  readonly stance: PressRequestStance;
  readonly channel: string;
  readonly terms: PressRecordTerms;
  readonly backgroundAttribution?: string | null;
}):
  | { readonly ok: true; readonly statement: string }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  const subject = input.subjectSummary.trim();
  if (!subject)
    return {
      ok: false,
      reason: "No public development is selected for this press request.",
    };
  const attribution = input.backgroundAttribution?.trim() ?? "";
  if (input.terms === "on-background" && !attribution)
    return {
      ok: false,
      reason:
        "On-background terms require a recorded work title for attribution.",
    };
  const intent = PRESS_REQUEST_INTENT_COPY[input.intent];
  const stance = PRESS_REQUEST_STANCE_COPY[input.stance];
  const kind = input.intent === "offer-statement" ? "statement" : "exchange";
  const channel = CHANNEL_WORDS[input.channel] ?? input.channel;
  const terms =
    input.terms === "on-background"
      ? `on background, to be attributed to ${attribution},`
      : TERMS_WORDS[input.terms];
  // The development is its own recorded sentence; it follows a colon rather
  // than sitting inside quotation marks, where its full stop read as a nested
  // quote (Maine playthrough, 2026-09-22).
  return {
    ok: true,
    statement: `The source ${intent.clause} ${articleFor(channel)} ${channel} ${kind} ${terms} about this development: ${subject} ${stance.clause}`,
  };
}

const CHANNEL_WORDS: Readonly<Record<string, string>> = {
  written: "written",
  spoken: "spoken",
};

const TERMS_WORDS: Readonly<Record<PressRecordTerms, string>> = {
  "on-record": "on the record",
  "on-background": "on background",
  "off-record": "off the record",
};

function articleFor(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/** Reporter-owned question uses only the reporter's recorded knowledge. */
export function composeReporterQuestion(input: {
  readonly subjectSummary: string;
  readonly terms: PressRecordTerms;
  readonly grounding: GroundedEnglishPacket | null;
}):
  | { readonly ok: true; readonly statement: string }
  | { readonly ok: false; readonly reason: string } {
  if (!input.grounding) return { ok: false, reason: "Choose a reporter." };
  const subject = input.subjectSummary.trim();
  const knowsSubject = Object.entries(input.grounding.facts).some(
    ([key, fact]) =>
      fact?.text.trim() === subject &&
      input.grounding!.knowledge.some(
        (known) =>
          known.personId === input.grounding!.speaker?.personId &&
          known.factKey === key,
      ),
  );
  const line = composePressLine(
    input.grounding,
    knowsSubject ? "reporter-known-topic" : "reporter-unknown-topic",
    knowsSubject ? { subject } : {},
  );
  return line
    ? { ok: true, statement: line.text }
    : { ok: false, reason: "Choose a public development." };
}

export function composePressAnswer(input: {
  readonly intent: PressResponseIntent;
  readonly knownFacts: readonly string[];
  readonly primaryQuestion: string;
  readonly followUpQuestion: string;
  readonly correctingEvidence?: readonly string[];
  readonly grounding: GroundedEnglishPacket | null;
}):
  | { readonly ok: true; readonly statement: string }
  | { readonly ok: false; readonly reason: string } {
  const question =
    input.followUpQuestion.trim() || input.primaryQuestion.trim();
  if (!question || !input.grounding)
    return { ok: false, reason: "Choose a question from the interview." };
  const facts = uniqueRecordedStatements(input.knownFacts);
  const linked = uniqueRecordedStatements(input.correctingEvidence).filter(
    (entry) => facts.includes(entry),
  );
  const fact = input.intent === "challenge-premise" ? linked[0] : facts[0];
  const key =
    input.intent === "challenge-premise"
      ? fact
        ? "challenge-premise"
        : "challenge-unknown"
      : input.intent === "add-context"
        ? fact
          ? "add-context"
          : "context-unknown"
        : fact
          ? "answer-directly"
          : "answer-unknown";
  // The selected question must also belong to this actual interview packet.
  const line = composePressLine(input.grounding, key, {
    question,
    ...(fact ? { fact } : {}),
  });
  return line
    ? { ok: true, statement: line.text }
    : { ok: false, reason: "Read the preparation before answering." };
}

function uniqueRecordedStatements(
  entries: readonly string[] | undefined,
): string[] {
  const seen = new Set<string>();
  const statements: string[] = [];
  for (const entry of entries ?? []) {
    const text = entry.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    statements.push(text);
  }
  return statements;
}
