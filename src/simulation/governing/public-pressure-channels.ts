import { recordEventKnowledge } from "../records";
import { recordWorldEvent } from "../world";
import { recordPropositionExposure } from "../politics";
import { schedulePoliticalReflectionForExposure } from "../living-world/political-reflection-schedule";
import type { EntityId, IsoDate, World } from "../types";

/** The existing public routes a bargaining warning may use. */
export const PUBLIC_PRESSURE_CHANNELS = [
  {
    key: "reporter-statement",
    reader: "presentation/press-request.ts:composePressAnswer",
  },
  {
    key: "meeting-speech",
    reader: "speech-reception.ts",
  },
  {
    key: "supporter-contact",
    reader: "recorded constituent contact events",
  },
] as const;

export type PublicPressureChannel =
  (typeof PUBLIC_PRESSURE_CHANNELS)[number]["key"];

/** Tags shared by the event writer and the vote-reason reader. */
export const CONSTITUENT_CONTACT_TAGS = {
  event: "public-pressure.constituent-contact",
  forMeasure: (measureId: string) => `public-pressure.measure:${measureId}`,
  forVote: "public-pressure.vote:yea",
  againstVote: "public-pressure.vote:nay",
  targetRole: "focus:target",
} as const;

/** Record one named constituent reaching the member, then record what the member learned. */
export function recordConstituentContact(
  world: World,
  input: {
    readonly stableKey: string;
    readonly measureId: EntityId;
    readonly propositionId: EntityId;
    readonly advocatePersonId: EntityId;
    readonly memberPersonId: EntityId;
    readonly direction: "yea" | "nay";
    readonly occurredAt: IsoDate;
    readonly jurisdictionId: EntityId;
    readonly measureLabel: string;
  },
): World {
  const directionTag =
    input.direction === "yea"
      ? CONSTITUENT_CONTACT_TAGS.forVote
      : CONSTITUENT_CONTACT_TAGS.againstVote;
  const summary = `A constituent contacted the member to urge a ${input.direction} vote on ${input.measureLabel}.`;
  const eventWorld = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: "politics.constituent-contact",
    occurredAt: input.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.advocatePersonId,
      input.memberPersonId,
      input.measureId,
    ],
    participants: [
      {
        personId: input.advocatePersonId,
        role: "agency:constituent-advocate",
        detail: summary,
      },
      {
        personId: input.memberPersonId,
        role: CONSTITUENT_CONTACT_TAGS.targetRole,
        detail: summary,
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      CONSTITUENT_CONTACT_TAGS.event,
      CONSTITUENT_CONTACT_TAGS.forMeasure(input.measureId),
      directionTag,
    ],
    summary,
    context: {
      location: null,
      socialContext: "A constituent's direct political contact with a member.",
      pressure: "constituent-contact",
      choice: null,
      motivation: `Urge a ${input.direction} vote on ${input.measureLabel}.`,
      immediateReaction: null,
    },
  });
  const event = eventWorld.history.events.at(-1)!;
  let next = recordEventKnowledge(eventWorld, {
    stableKey: `${input.stableKey}:heard-by-member`,
    personId: input.memberPersonId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  next = recordPropositionExposure(next, {
    stableKey: `${input.stableKey}:question-reached-member`,
    personId: input.memberPersonId,
    propositionId: input.propositionId,
    encounteredAt: world.currentDate,
    summary,
    provenance: { kind: "direct-experience", eventId: event.id },
  });
  const exposure = next.history.propositionExposures.at(-1)!;
  return schedulePoliticalReflectionForExposure(next, exposure.id);
}
