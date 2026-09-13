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
    clause: "asks to arrange an exchange",
  },
  "offer-statement": {
    label: "Offer a statement",
    clause: "offers a statement without adding unrecorded claims",
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
    clause: "will speak only to what the public record already establishes",
  },
  "refuse-speculation": {
    label: "Refuse speculation",
    clause: "will not speculate beyond the recorded file",
  },
  "correct-an-unsupported-claim": {
    label: "Correct an unsupported claim",
    clause: "will separate the recorded development from unsupported claims",
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
  const attributionClause =
    input.terms === "on-background"
      ? ` to be attributed as “${attribution}”`
      : "";
  return {
    ok: true,
    statement: `The source ${intent.clause} about “${subject}” on ${input.terms} ${input.channel} terms${attributionClause} and ${stance.clause}.`,
  };
}

/** Reporter-owned question grounded in the selected public development. */
export function composeReporterQuestion(input: {
  readonly subjectSummary: string;
  readonly terms: PressRecordTerms;
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
      reason: "No public development is recorded for a reporter question.",
    };
  return {
    ok: true,
    statement: `What is established about “${subject}”, and what remains open, on ${input.terms} terms?`,
  };
}

export function composePressAnswer(input: {
  readonly intent: PressResponseIntent;
  readonly knownFacts: readonly string[];
  readonly primaryQuestion: string;
  readonly followUpQuestion: string;
  readonly correctingEvidence?: readonly string[];
}):
  | { readonly ok: true; readonly statement: string }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  const followUp =
    input.followUpQuestion.trim() || input.primaryQuestion.trim();
  if (!followUp)
    return {
      ok: false,
      reason: "No reporter question is recorded to answer.",
    };
  const facts = uniqueRecordedStatements(input.knownFacts);
  const linked = uniqueRecordedStatements(
    input.correctingEvidence ?? [],
  ).filter((entry) => facts.includes(entry));
  if (input.intent === "add-context") {
    const fact = facts[0];
    if (!fact)
      return {
        ok: true,
        statement: `Asked “${followUp}”, the source will not add claims that are not already recorded.`,
      };
    return {
      ok: true,
      statement: `${fact} That recorded fact does not establish an outcome that has not happened.`,
    };
  }
  if (input.intent === "challenge-premise") {
    const correction = linked[0];
    if (!correction)
      return {
        ok: true,
        statement: `The source does not accept that “${followUp}” is established by the record now in hand.`,
      };
    return {
      ok: true,
      statement: `The source challenges the premise of “${followUp}”, citing the recorded fact: ${correction}`,
    };
  }
  const fact = facts[0];
  if (!fact)
    return {
      ok: true,
      statement: `Asked “${followUp}”, the source answers without treating that question as an established fact.`,
    };
  return {
    ok: true,
    statement: `Asked “${followUp}”, the source answers from the record: ${fact}`,
  };
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
