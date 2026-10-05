import {
  composeGroundedLine,
  type ComposedLineBank,
  type CompositionContext,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

/** Reviewable wording only. Facts, voice cues and knowledge come from the
 * owning conversation adapter; missing context is never repaired here.
 */
export const ELECTION_CLERK_LINES = {
  opening: {
    key: "election-clerk:opening",
    version: "1",
    surface: "dialogue",
    act: "ask",
    parts: {
      core: {
        required: true,
        variants: [
          {
            key: "which-office",
            kind: "template",
            text: "Which office are you interested in?",
            requiresFacts: ["clerk-role"],
          },
        ],
      },
    },
  },
  requirements: {
    key: "election-clerk:requirements",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      opener: {
        variants: [
          {
            key: "careful-review",
            kind: "template",
            text: "Let's go through the requirements.",
            requiresTraits: [
              { holder: "speaker", traitKey: "expression:cautious" },
            ],
          },
        ],
      },
      core: {
        required: true,
        variants: [
          {
            key: "requirements-from-record",
            kind: "verbatim",
            factKey: "eligibility",
            requiresKnowledge: [{ holder: "speaker", factKey: "eligibility" }],
          },
        ],
      },
      reason: {
        variants: [
          {
            key: "estimated-filing-deadline",
            kind: "template",
            text: "The estimated filing deadline for {{office-title}} is {{filing-deadline-estimated}}.",
            requiresKnowledge: [
              { holder: "speaker", factKey: "office-title" },
              { holder: "speaker", factKey: "filing-deadline-estimated" },
            ],
          },
          {
            key: "filing-deadline",
            kind: "template",
            text: "For {{office-title}}, the filing deadline is {{filing-deadline}}.",
            requiresKnowledge: [
              { holder: "speaker", factKey: "office-title" },
              { holder: "speaker", factKey: "filing-deadline" },
            ],
          },
        ],
      },
    },
  },
  filingRequest: {
    key: "election-clerk:filing-request",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      core: {
        required: true,
        variants: [
          {
            key: "check-filing",
            kind: "template",
            text: "I'll check your filing for {{office-title}}.",
            requiresFacts: ["eligibility"],
            requiresKnowledge: [
              { holder: "speaker", factKey: "eligibility" },
              { holder: "speaker", factKey: "office-title" },
            ],
          },
        ],
      },
    },
  },
} as const satisfies Record<string, ComposedLineBank>;

export function composeElectionClerkLine(
  kind: keyof typeof ELECTION_CLERK_LINES,
  packet: GroundedEnglishPacket,
  context: CompositionContext = {},
) {
  return composeGroundedLine(packet, ELECTION_CLERK_LINES[kind], context);
}
