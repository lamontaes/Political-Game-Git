import { recordedPrinciplesForPerson } from "./governing/officeholder-principles";
import { libraryMaterialsAuthority } from "./library-materials-authority";
import { LIBRARY_QUESTION } from "./education-civil-law-terms";
import { lawEffectStamp } from "./law-effect-stamp";
import { recordWorldEvent } from "./world";
import type {
  LibraryDecision,
  LibraryChallenge,
  LibraryMaterialsStore,
} from "./library-materials-types";
import type { EntityId, PrincipleRecord, World } from "./types";

/** Preserve the existing optional save field without changing the shared World declaration. */
export type LibraryMaterialsWorld = World & {
  readonly libraryMaterials?: LibraryMaterialsStore;
};

/** Save the actual recorded decision in canonical history for its named participants. */
export function recordLibraryDecisionHistory(
  world: LibraryMaterialsWorld,
  challenge: LibraryChallenge,
  decision: LibraryDecision,
): LibraryMaterialsWorld {
  if (
    !world.libraryMaterials?.challenges.includes(challenge) ||
    !world.libraryMaterials.decisions.includes(decision) ||
    decision.challengeKey !== challenge.key
  )
    throw new Error(
      "Library history requires the saved challenge and decision.",
    );
  const stableKey = `library:collection-decision:${challenge.key}`;
  if (world.history.events.some((row) => row.stableKey === stableKey))
    return world;
  const memberIds = decision.ballots.map((row) => row.personId);
  return recordWorldEvent(world, {
    stableKey,
    type: "library.collection-decision",
    occurredAt: decision.on,
    recordedAt: world.currentDate,
    jurisdictionId: challenge.townId,
    involvedEntityIds: [...new Set([challenge.personId, ...memberIds])],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["library.collection-decision"],
    summary: `The library board ${decision.removed ? "voted to remove" : "voted to retain"} the title named in the resident's recorded challenge.`,
    context: {
      location: null,
      socialContext: decision.authorityReason,
      pressure: null,
      choice: decision.removed
        ? "Remove the challenged title."
        : "Retain the challenged title.",
      motivation:
        "The supplied board members decided from their recorded content preferences.",
      immediateReaction: null,
    },
    ...(decision.lawEffectStamps
      ? { lawEffectStamps: decision.lawEffectStamps }
      : {}),
  });
}

/** Content preferences read held continuous support, not old conviction buckets. */
export function libraryContentView(world: World, personId: EntityId) {
  const relevant = new Map(
    Object.values(world.policyCatalog.principles)
      .filter(
        (row) =>
          row.stableKey.endsWith(":tradition") ||
          row.stableKey.endsWith(":personal-liberty"),
      )
      .map((row) => [row.id, row.stableKey.endsWith(":tradition") ? 1 : -1]),
  );
  const held = new Map<EntityId, PrincipleRecord>();
  for (const row of recordedPrinciplesForPerson(world, personId))
    if (row.formedAt <= world.currentDate && relevant.has(row.principleId))
      held.set(row.principleId, row);
  let score = 0;
  const ids: EntityId[] = [];
  for (const row of held.values()) {
    if (row.stance === "conflicted") continue;
    score +=
      relevant.get(row.principleId)! *
      row.strength *
      (row.stance === "endorses" ? 1 : -1);
    ids.push(row.id);
  }
  return { score, ids };
}

/**
 * A held meeting's caller supplies its actual members and existing challenges.
 * A state allocation alone supplies neither a title rule nor state decision makers.
 */
export function resolveLibraryChallenges(
  world: LibraryMaterialsWorld,
  townId: EntityId,
  memberIds: readonly EntityId[],
  meetingKey: string,
): LibraryMaterialsWorld {
  const prior = world.libraryMaterials;
  if (!prior || !meetingKey.trim() || memberIds.length === 0) return world;
  const members = [...new Set(memberIds)];
  if (members.some((id) => !world.people[id])) return world;
  const authority = libraryMaterialsAuthority(world, townId);
  if (authority.level !== "local" || !authority.law) return world;
  const answered = new Set(prior.decisions.map((row) => row.challengeKey));
  const decisions: LibraryDecision[] = [];
  for (const challenge of prior.challenges) {
    if (
      challenge.townId !== townId ||
      challenge.filedOn > world.currentDate ||
      answered.has(challenge.key) ||
      !world.people[challenge.personId]
    )
      continue;
    const ballots = members.map((personId) => {
      const view = libraryContentView(world, personId);
      return {
        personId,
        remove: view.score > 0,
        score: view.score,
        principleRecordIds: view.ids,
        reason:
          view.score > 0
            ? "The member's recorded content preferences favor removal."
            : "The member's recorded content preferences do not favor removal.",
      };
    });
    const stamp = lawEffectStamp(authority.law, {
      effectKind: "library.collection-decision",
      questionKey: LIBRARY_QUESTION,
      jurisdictionId: townId,
      appliedAt: world.currentDate,
      sourceRecordIds: [
        challenge.personId,
        ...challenge.principleRecordIds,
        ...challenge.faithParticipationIds,
        ...challenge.schoolChildIds,
        ...members,
        ...ballots.flatMap((row) => row.principleRecordIds),
      ],
    });
    decisions.push({
      challengeKey: challenge.key,
      meetingKey,
      on: world.currentDate,
      authority: "local",
      authorityReason: authority.reason,
      ballots,
      removed: ballots.filter((row) => row.remove).length > ballots.length / 2,
      staffHours: null,
      legalHours: null,
      expenseCents: null,
      ...(stamp ? { lawEffectStamps: [stamp] } : {}),
    });
    answered.add(challenge.key);
  }
  let next: LibraryMaterialsWorld = decisions.length
    ? {
        ...world,
        libraryMaterials: {
          challenges: prior.challenges,
          decisions: [...prior.decisions, ...decisions],
        },
      }
    : world;
  for (const decision of decisions) {
    const challenge = prior.challenges.find(
      (row) => row.key === decision.challengeKey,
    )!;
    next = recordLibraryDecisionHistory(next, challenge, decision);
  }
  return next;
}
