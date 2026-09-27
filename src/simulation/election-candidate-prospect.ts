import type { CharacterHistoryContextPersonInput } from "./character-history";
import { makeIsoDate } from "./dates";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { drawCanonicalNamedIdentity } from "./people";
import { generatePersonIdentity } from "./person-identity";
import { SeededRng } from "./rng";
import type { EntityId, IsoDate, World } from "./types";

/** Shared fictional prospect and dated run/decline choice for background seats. */
export function electionProspectInput(args: {
  readonly world: World;
  readonly stableKey: string;
  readonly year: number;
  readonly minimumAge: number;
  readonly homeJurisdictionId: EntityId;
}): CharacterHistoryContextPersonInput {
  const rng = new SeededRng(args.world.seed).fork(args.stableKey);
  const age = rng.integer(args.minimumAge + 3, 71);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    stableKey: args.stableKey,
    ...drawCanonicalNamedIdentity(
      rng.fork("name"),
      generatePersonIdentity(rng.fork("identity")),
    ),
    birthDate: makeIsoDate(
      `${args.year - age}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
    ),
    homeJurisdictionId: args.homeJurisdictionId,
  };
}

export function recordProspectRunChoice(args: {
  readonly world: World;
  readonly stableKey: string;
  readonly decisionType: string;
  readonly seatKey: string;
  readonly personId: EntityId;
  readonly intakeDate: IsoDate;
  readonly recruitmentEventId: EntityId;
  readonly opportunity: number | null;
  readonly lowOpportunityShare: number;
  readonly recruitmentSourceType?: `institution:${string}`;
  readonly recruitmentExplanation?: string;
}): { world: World; runs: boolean } {
  const { world, stableKey, seatKey, personId, intakeDate } = args;
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: args.decisionType,
    actorPersonId: personId,
    cutoff: {
      asOfDate: intakeDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: seatKey, entityId: null },
    options: [
      { key: "run", label: "Run", description: "Enter the race." },
      { key: "decline", label: "Decline", description: "Do not enter." },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${stableKey}:recruited`,
        optionKey: "run",
        sourceType:
          args.recruitmentSourceType ?? "institution:party-recruitment",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          args.recruitmentExplanation ??
          "A party asked this person to stand for this seat.",
        sourceRefs: [
          { kind: "historical-event", eventId: args.recruitmentEventId },
        ],
      },
      ...(args.opportunity !== null &&
      args.opportunity < args.lowOpportunityShare
        ? [
            {
              stableKey: `${stableKey}:district-view`,
              optionKey: "decline" as const,
              sourceType: "context:district-view" as const,
              direction: "supports" as const,
              importance: "decisive" as const,
              confidence: "high" as const,
              explanation:
                "This party starts with little support in the district.",
              sourceRefs: [],
            },
          ]
        : []),
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return {
    world: recordDurableDecisionTrace(world, evaluation),
    runs: evaluation.selectedOptionKey === "run",
  };
}
