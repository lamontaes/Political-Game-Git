import type { PressRecordTerms, PressResponseIntent } from "../simulation";

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

export function composePressRequestPitch(input: {
  readonly subjectSummary: string;
  readonly intent: PressRequestIntent;
  readonly stance: PressRequestStance;
  readonly channel: string;
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
      reason: "No public development is selected for this press request.",
    };
  const intent = PRESS_REQUEST_INTENT_COPY[input.intent];
  const stance = PRESS_REQUEST_STANCE_COPY[input.stance];
  return {
    ok: true,
    statement: `The source ${intent.clause} about “${subject}” on ${input.terms} ${input.channel} terms and ${stance.clause}.`,
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
}):
  | { readonly ok: true; readonly statement: string }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  const followUp = input.followUpQuestion.trim();
  if (!followUp)
    return {
      ok: false,
      reason: "No reporter question is recorded to answer.",
    };
  const fact = input.knownFacts.map((entry) => entry.trim()).find(Boolean);
  const ground = fact || input.primaryQuestion.trim();
  if (!ground)
    return {
      ok: false,
      reason:
        "No recorded fact or reporter question is available for an answer.",
    };
  if (input.intent === "add-context") {
    return {
      ok: true,
      statement: `${ground} That recorded fact does not establish an outcome that has not happened.`,
    };
  }
  if (input.intent === "challenge-premise") {
    return {
      ok: true,
      statement: `The question “${followUp}” assumes more than the record shows. What is established is: ${ground}`,
    };
  }
  return {
    ok: true,
    statement: `Asked “${followUp}”, the source answers from the record: ${ground}`,
  };
}
