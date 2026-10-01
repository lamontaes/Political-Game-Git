import { inventedPersonBirthDate } from "./invented-person-age";
import { lifeWeighsAgainstOffice } from "./careers/another-term";
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
  return {
    stableKey: args.stableKey,
    ...drawCanonicalNamedIdentity(
      rng.fork("name"),
      generatePersonIdentity(rng.fork("identity")),
    ),
    birthDate: inventedPersonBirthDate(rng, {
      role: "background-seat-prospect",
      referenceDate: makeIsoDate(`${args.year}-01-01`),
      legalMinimumAge: args.minimumAge,
    }),
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
  /**
   * The day the term they are asked to run for would end. With it, the
   * person's own health, age and care duties weigh against running.
   */
  readonly termEnds?: IsoDate;
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
      ...(args.termEnds
        ? lifeWeighsAgainstOffice(world, {
            personId,
            keyPrefix: stableKey,
            onDate: intakeDate,
            termEnds: args.termEnds,
            optionKey: "decline",
          })
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
