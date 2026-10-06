import type { EntityId, World } from "../simulation";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type RelationshipCondition,
  type LinePartVariant,
  LINE_PARTS,
} from "./english-composition";
import type { GroundedEnglishFact } from "./grounded-english";
import { speakerTraits } from "./speaker-traits";
export type SubjectReplyBank = Readonly<
  Record<
    "warm" | "even" | "worn",
    { readonly bank: ComposedLineBank; readonly perception: string }
  >
>;
export function composeSubjectReply(
  world: World,
  context: string,
  tone: "warm" | "even" | "worn",
  bank: SubjectReplyBank,
  speakerId: EntityId,
  listenerId: EntityId,
  facts: Readonly<Record<string, GroundedEnglishFact>> = {},
) {
  const chosen = bank[tone];
  const standing = readRelationshipStanding(world, speakerId, listenerId);
  // The existing English engine gates wording on the recorded relationship.
  const conditions: Record<
    "warm" | "even" | "worn",
    readonly (readonly RelationshipCondition[])[]
  > = {
    warm: [
      [
        {
          dimension: "warmth",
          bands: ["slight", "marked", "strong"],
          adverse: false,
        },
      ],
    ],
    even: [[]],
    worn: [
      [{ dimension: "tension", bands: ["slight", "marked", "strong"] }],
      [
        {
          dimension: "warmth",
          bands: ["slight", "marked", "strong"],
          adverse: true,
        },
      ],
    ],
  };
  const parts = Object.fromEntries(
    LINE_PARTS.flatMap((part) => {
      const variants: LinePartVariant[] = [];
      for (const voice of ["warm", "even", "worn"] as const) {
        if (voice !== tone) continue;
        const authored = bank[voice].bank.parts[part];
        if (!authored) continue;
        for (const [index, requiresRelationship] of conditions[voice].entries())
          variants.push(
            ...authored.variants.map((variant) => ({
              ...variant,
              key: `${voice}-${index}-${variant.key}`,
              requiresRelationship,
            })),
          );
      }
      return variants.length ? [[part, { variants }]] : [];
    }),
  );
  if (!parts.core) throw new Error("A subject reply requires a core part.");
  const composedBank: ComposedLineBank = {
    ...chosen.bank,
    key: chosen.bank.key.replace(/\.(warm|even|worn)$/, ""),
    parts: { ...parts, core: parts.core },
  };

  const result = composeGroundedLine(
    {
      surface: "dialogue",
      worldSeed: world.seed,
      momentKey:
        context + ":" + world.currentDate + ":" + world.history.nextSequence,
      bankVersion: chosen.bank.version,
      stage: tone,
      sourceRecordIds: [
        speakerId,
        listenerId,
        ...Object.values(standing.readings).flatMap((reading) => reading.basis),
        ...Object.values(facts).flatMap((fact) => fact.sourceRecordIds),
      ],
      facts,
      knowledge: Object.entries(facts).map(([factKey, fact]) => ({
        personId: speakerId,
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })),
      speaker: { personId: speakerId, traits: speakerTraits(world, speakerId) },
      viewer: {
        personId: listenerId,
        traits: speakerTraits(world, listenerId),
      },
    },
    composedBank,
    { relationship: standing },
  );
  if (result.kind !== "rendered")
    throw new Error(
      "Cannot compose subject reply: " + result.reasons.join("; "),
    );
  return { ...result, perception: chosen.perception };
}
export const SCHOOL_RAISE: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.school_raise.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Can we look at the unfinished part together?",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Which part do you mean?",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Okay.",
            },
          ],
        },
      },
    },
    perception: "{full} asked about the unfinished work.",
  },
  even: {
    bank: {
      key: "subject-reply.school_raise.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "What is left to do?",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Show me the part you mean.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "How do you want to divide it?",
            },
          ],
        },
      },
    },
    perception: "{full} asked about the unfinished work.",
  },
  worn: {
    bank: {
      key: "subject-reply.school_raise.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "What are you asking me to take on?",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Tell me what you need.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "What is still unfinished?",
            },
          ],
        },
      },
    },
    perception: "{full} asked about the unfinished work.",
  },
};

export const SCHOOL_OFFER: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.school_offer.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Thank you.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Okay.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Thanks for offering to do it.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "I’ll leave that part to you.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "Let me know if you need to change that.",
            },
          ],
        },
      },
    },
    perception: "{full} accepted the offer to handle that part.",
  },
  even: {
    bank: {
      key: "subject-reply.school_offer.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Okay, that part is yours.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I understand.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "You take that part.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "You’re taking that part.",
            },
          ],
        },
      },
    },
    perception: "{full} accepted the offer to handle that part.",
  },
  worn: {
    bank: {
      key: "subject-reply.school_offer.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Fine.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Okay.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "All right.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "You take that part.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "Let me know if that changes.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "We’ve agreed on that part.",
            },
          ],
        },
      },
    },
    perception: "{full} accepted the offer to handle that part.",
  },
};

export const SCHOOL_SPLIT_AGREED: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.school_split_agreed.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Yes.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Let’s split it.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Half each sounds all right.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Which half would you like?",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "You can choose first.",
            },
          ],
        },
      },
    },
    perception: "{full} agreed to divide the work.",
  },
  even: {
    bank: {
      key: "subject-reply.school_split_agreed.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Half each, then.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Yes, we can split it.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "Let’s write down who has what.",
            },
          ],
        },
      },
    },
    perception: "{full} agreed to divide the work.",
  },
  worn: {
    bank: {
      key: "subject-reply.school_split_agreed.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Half each.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Yes.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Let’s be clear about which parts.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "Which part is mine?",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "We should write down the split.",
            },
          ],
        },
      },
    },
    perception: "{full} agreed to divide the work.",
  },
};

export const SCHOOL_SPLIT_REFUSED: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.school_split_refused.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I’m sorry, but I can’t agree to half.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "No, I can’t take half of it.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I’ll have to say no to that split.",
            },
          ],
        },
      },
    },
    perception: "{full} declined the proposed split.",
  },
  even: {
    bank: {
      key: "subject-reply.school_split_refused.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I won’t take half.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "No.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "That split doesn’t work for me.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "I can’t agree to that.",
            },
          ],
        },
      },
    },
    perception: "{full} declined the proposed split.",
  },
  worn: {
    bank: {
      key: "subject-reply.school_split_refused.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "No.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I won’t agree to that split.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "No.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "I’m not taking half.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "We need another arrangement.",
            },
          ],
        },
      },
    },
    perception: "{full} declined the proposed split.",
  },
};

export const SCHOOL_SPLIT_UNDECIDED: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.school_split_undecided.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Let me look at what’s left first, and I’ll tell you tomorrow.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Maybe.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I want to check my week before I agree to half.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "Can I see how much is left before I say?",
            },
          ],
        },
      },
    },
    perception: "{full} did not say yet whether they would take half.",
  },
  even: {
    bank: {
      key: "subject-reply.school_split_undecided.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I don’t know yet.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I can’t say yet.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Ask me again once I’ve seen the rest of it.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Let me see what’s left.",
            },
          ],
        },
      },
    },
    perception: "{full} did not say yet whether they would take half.",
  },
  worn: {
    bank: {
      key: "subject-reply.school_split_undecided.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I’m not agreeing to anything until I see it.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I’ll decide once I know what half means.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Not yet.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-2",
              kind: "template",
              text: "Show me what’s left first.",
            },
          ],
        },
      },
    },
    perception: "{full} did not say yet whether they would take half.",
  },
};

export const NEIGHBORHOOD_MENTION: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.neighborhood_mention.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-1",
              kind: "template",
              text: "Are you thinking of going?",
            },
            {
              key: "core-2",
              kind: "template",
              text: "We can talk about the meeting.",
            },
          ],
        },
      },
    },
    perception: "{full} responded to the question about the meeting.",
  },
  even: {
    bank: {
      key: "subject-reply.neighborhood_mention.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "What about the meeting?",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Are you going?",
            },
            {
              key: "core-2",
              kind: "template",
              text: "What did you want to ask?",
            },
          ],
        },
      },
    },
    perception: "{full} responded to the question about the meeting.",
  },
  worn: {
    bank: {
      key: "subject-reply.neighborhood_mention.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "What do you want to know?",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Is there something you want to ask me?",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Go ahead.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-2",
              kind: "template",
              text: "What about it?",
            },
          ],
        },
      },
    },
    perception: "{full} responded to the question about the meeting.",
  },
};

export const NEIGHBORHOOD_SAY_GOING: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.neighborhood_say_going.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Let me know what you hear there.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I’d like to hear about it afterward.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Tell me how it goes.",
            },
          ],
        },
      },
    },
    perception: "{full} acknowledged the plan to attend.",
  },
  even: {
    bank: {
      key: "subject-reply.neighborhood_say_going.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Okay.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I understand.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Let me know how it goes.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "You can tell me afterward.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "You’re planning to go.",
            },
          ],
        },
      },
    },
    perception: "{full} acknowledged the plan to attend.",
  },
  worn: {
    bank: {
      key: "subject-reply.neighborhood_say_going.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Okay.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Let me know if there’s something I should read.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Tell me afterward.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "I heard you.",
            },
          ],
        },
      },
    },
    perception: "{full} acknowledged the plan to attend.",
  },
};

export const NEIGHBORHOOD_WILL_GO: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.neighborhood_will_go.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Yes, I’ll go.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Yes.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "I’ll come to the meeting.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "Let’s plan to go.",
            },
          ],
        },
      },
    },
    perception: "{full} agreed to attend the meeting.",
  },
  even: {
    bank: {
      key: "subject-reply.neighborhood_will_go.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I’ll go.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "All right, I’ll be there.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Yes, I’ll come.",
            },
          ],
        },
      },
    },
    perception: "{full} agreed to attend the meeting.",
  },
  worn: {
    bank: {
      key: "subject-reply.neighborhood_will_go.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "All right.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Yes.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Okay, I’ll go.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "I’ll go to this meeting.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "I’ll come this time.",
            },
          ],
        },
      },
    },
    perception: "{full} agreed to attend the meeting.",
  },
};

export const NEIGHBORHOOD_WILL_NOT_GO: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.neighborhood_will_not_go.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "No, but thank you for asking.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I’m going to pass on this one.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I won’t be coming, sorry.",
            },
          ],
        },
      },
    },
    perception: "{full} declined the invitation to the meeting.",
  },
  even: {
    bank: {
      key: "subject-reply.neighborhood_will_not_go.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I won’t be going.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "No, not this meeting.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I’m not coming to this one.",
            },
          ],
        },
      },
    },
    perception: "{full} declined the invitation to the meeting.",
  },
  worn: {
    bank: {
      key: "subject-reply.neighborhood_will_not_go.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "No.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I’ll pass.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "No, I don’t want to go.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "I’m not going.",
            },
          ],
        },
      },
    },
    perception: "{full} declined the invitation to the meeting.",
  },
};

export const NEIGHBORHOOD_YOU_GO: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.neighborhood_you_go.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "You’d be better at it than me.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I think you should go.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "You go, and let me know what they decide.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Why don’t you go and tell me how it went?",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "I’ll want to hear about it.",
            },
          ],
        },
      },
    },
    perception: "{full} suggested you go to the meeting yourself.",
  },
  even: {
    bank: {
      key: "subject-reply.neighborhood_you_go.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Why don’t you go instead?",
            },
            {
              key: "core-1",
              kind: "template",
              text: "You go.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "It sounds like it’s more your thing.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "You can tell me what happened.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "You go.",
            },
          ],
        },
      },
    },
    perception: "{full} suggested you go to the meeting yourself.",
  },
  worn: {
    bank: {
      key: "subject-reply.neighborhood_you_go.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "If it matters to you, you go.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "You’re the one who wants somebody there.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "Go yourself.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "You go.",
            },
          ],
        },
      },
    },
    perception: "{full} suggested you go to the meeting yourself.",
  },
};

export const NEIGHBORHOOD_UNDECIDED: SubjectReplyBank = {
  warm: {
    bank: {
      key: "subject-reply.neighborhood_undecided.warm",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "Maybe.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I might.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I haven’t decided.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-0",
              kind: "template",
              text: "Let me see what that evening looks like.",
            },
            {
              key: "reason-1",
              kind: "template",
              text: "I’ll let you know.",
            },
            {
              key: "reason-2",
              kind: "template",
              text: "Can I tell you later this week?",
            },
          ],
        },
      },
    },
    perception: "{full} had not decided whether to go to the meeting.",
  },
  even: {
    bank: {
      key: "subject-reply.neighborhood_undecided.even",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I don’t know yet.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "Maybe.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "I’ll see how the week goes.",
            },
          ],
        },
        reason: {
          variants: [
            {
              key: "reason-1",
              kind: "template",
              text: "I haven’t decided.",
            },
          ],
        },
      },
    },
    perception: "{full} had not decided whether to go to the meeting.",
  },
  worn: {
    bank: {
      key: "subject-reply.neighborhood_undecided.worn",
      version: "1",
      surface: "dialogue",
      act: "answer",
      parts: {
        core: {
          variants: [
            {
              key: "core-0",
              kind: "template",
              text: "I’ll decide that myself.",
            },
            {
              key: "core-1",
              kind: "template",
              text: "I haven’t made up my mind.",
            },
            {
              key: "core-2",
              kind: "template",
              text: "We’ll see.",
            },
          ],
        },
      },
    },
    perception: "{full} had not decided whether to go to the meeting.",
  },
};

function openingBank(key: string, text: string): SubjectReplyBank {
  const entry = {
    bank: {
      key,
      version: "1",
      surface: "dialogue" as const,
      act: "ask" as const,
      parts: {
        core: { variants: [{ key: "ask", kind: "template" as const, text }] },
      },
    },
    perception: "",
  };
  return { warm: entry, even: entry, worn: entry };
}
/** Without a recorded topic the speaker asks rather than asserting a deadline or notice. */
export const SUBJECT_OPEN = openingBank(
  "subject-opening.ask",
  "What did you want to ask?",
);
export const SCHOOL_OPEN = openingBank(
  "subject-opening.school",
  "How should we divide {{work}}?",
);
export const MEETING_OPEN = openingBank(
  "subject-opening.meeting",
  "Did you see the notice?",
);
export const SUBJECT_SETTLED = openingBank(
  "subject-opening.settled",
  "All right.",
);
