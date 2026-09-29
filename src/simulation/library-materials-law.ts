import { recordedPrinciplesForPerson } from "./governing/officeholder-principles";
import research from "../../data/research/laws/library-materials.json" with { type: "json" };
import { ageOnDate } from "./dates";
import { contentDecisionAuthority } from "./governing/question-authority";
import { policyTermsInForce } from "./governing/policy-bill-terms";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import {
  educationEnrollmentStateAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
  organizationParticipationStateAt,
} from "./life-queries";
import { SeededRng } from "./rng";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, World } from "./types";
import type { LibraryChallenge } from "./library-materials-types";
export const LIBRARY_QUESTION =
  "us-policy-positions:civil-family-community.local-control-of-library-materials";

/** Content preferences read tradition and freedom, separately from views on who holds authority. */
export function libraryContentView(world: World, personId: EntityId) {
  const relevant = new Map(
    Object.values(world.policyCatalog.principles)
      .filter(
        (p) =>
          p.stableKey.endsWith(":tradition") ||
          p.stableKey.endsWith(":personal-liberty"),
      )
      .map((p) => [p.id, p.stableKey.endsWith(":tradition") ? 1 : -1]),
  );
  const held = new Map<EntityId, World["history"]["principles"][number]>();
  for (const r of recordedPrinciplesForPerson(world, personId))
    if (
      r.personId === personId &&
      r.formedAt <= world.currentDate &&
      relevant.has(r.principleId)
    )
      held.set(r.principleId, r);
  const weights = { tentative: 1, moderate: 2, strong: 3, settled: 4 };
  let score = 0;
  const ids: EntityId[] = [];
  for (const r of held.values()) {
    if (r.stance === "conflicted") continue;
    score +=
      relevant.get(r.principleId)! *
      weights[r.conviction] *
      (r.stance === "endorses" ? 1 : -1);
    ids.push(r.id);
  }
  return { score, ids };
}
/** A resident's recorded concern creates a real pending agenda item, at most once per title and person. */
export function fileLibraryChallenges(world: World, townId: EntityId): World {
  const prior = world.libraryMaterials ?? { challenges: [], decisions: [] };
  const keys = new Set(prior.challenges.map((r) => r.key));
  const added: LibraryChallenge[] = [];
  for (const personId of world.personOrder) {
    const p = world.people[personId]!;
    if (
      p.homeJurisdictionId !== townId ||
      ageOnDate(p.birthDate, world.currentDate) < 18
    )
      continue;
    const view = libraryContentView(world, personId);
    if (view.score <= 0) continue;
    const faith = world.history.organizationParticipations
      .filter(
        (r) =>
          r.personId === personId &&
          r.kind === "membership:congregation" &&
          organizationParticipationStateAt(world, r.id)?.status === "active",
      )
      .map((r) => r.id);
    const household = new Set(
      householdMembershipsAt(world, personId).flatMap((r) =>
        peopleInHouseholdAt(world, r.household.id),
      ),
    );
    const children = world.history.educationEnrollments
      .filter(
        (r) =>
          household.has(r.personId) &&
          r.programKind.startsWith("schooling:") &&
          ageOnDate(world.people[r.personId]!.birthDate, world.currentDate) <
            18 &&
          educationEnrollmentStateAt(world, r.id)?.status === "active",
      )
      .map((r) => r.personId);
    if (!faith.length && !children.length) continue;
    for (const title of research.titles) {
      const key = `library-challenge:${townId}:${personId}:${title.key}`;
      if (keys.has(key)) continue;
      added.push({
        key,
        townId,
        personId,
        titleKey: title.key,
        filedOn: world.currentDate,
        reason: `Own tradition-versus-liberty score ${view.score}, ${faith.length} active faith records and ${children.length} school children; concern about ${title.theme}`,
        principleRecordIds: view.ids,
        faithParticipationIds: faith,
        schoolChildIds: children,
      });
    }
  }
  return added.length
    ? {
        ...world,
        libraryMaterials: {
          ...prior,
          challenges: [...prior.challenges, ...added],
        },
      }
    : world;
}
/** Only a held meeting resolves local collection appeals; unknown authority cannot supply a vote. */
export function resolveLibraryChallenges(
  world: World,
  townId: EntityId,
  memberIds: readonly EntityId[],
  meetingKey: string,
): World {
  let next = fileLibraryChallenges(world, townId);
  const authority = contentDecisionAuthority(next, townId, "library");
  if (
    authority.level === "unknown" ||
    (authority.level === "local" && !memberIds.length)
  )
    return next;
  const stateKey = lifePlaceByJurisdictionId(townId)?.stateJurisdictionKey;
  const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
  const terms = state
    ? policyTermsInForce(next, state.id, LIBRARY_QUESTION, next.currentDate)
        ?.terms?.values
    : null;
  const spread =
    0.75 +
    new SeededRng(next.seed).fork(`library-process-cost:${stateKey}`).next() *
      0.5;
  for (const challenge of next.libraryMaterials?.challenges ?? []) {
    if (
      challenge.townId !== townId ||
      next.libraryMaterials!.decisions.some(
        (d) => d.challengeKey === challenge.key,
      )
    )
      continue;
    const ballots =
      authority.level === "local"
        ? memberIds.map((personId) => {
            const view = libraryContentView(next, personId);
            return {
              personId,
              remove: view.score > 0,
              score: view.score,
              principleRecordIds: view.ids,
              reason: view.ids.length
                ? `Own recorded tradition-versus-liberty score ${view.score}.`
                : "No recorded content objection; retain the existing collection.",
            };
          })
        : [];
    const staffHours = terms?.staffReviewHours ?? research.staffHoursMean;
    const legalHours =
      authority.level === "local" ? (terms?.legalReviewHours ?? 0) : 0;
    const decision = {
      challengeKey: challenge.key,
      meetingKey,
      on: next.currentDate,
      authority: authority.level,
      authorityReason: authority.reason,
      ballots,
      removed: ballots.filter((r) => r.remove).length > ballots.length / 2,
      staffHours,
      legalHours,
      expenseCents: Math.round(
        (staffHours + legalHours) *
          (terms?.staffHourlyCents ?? research.staffHourlyCents) *
          spread,
      ),
    };
    next = {
      ...next,
      libraryMaterials: {
        challenges: next.libraryMaterials!.challenges,
        decisions: [...next.libraryMaterials!.decisions, decision],
      },
    };
    next = recordWorldEvent(next, {
      stableKey: `${challenge.key}:decision`,
      type: "library.collection-decided",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: townId,
      involvedEntityIds: [townId, challenge.personId, ...memberIds],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `title:${challenge.titleKey}`,
        `collection:${decision.removed ? "removed" : "retained"}`,
        `expense-cents:${decision.expenseCents}`,
      ],
      summary: `The challenged fictional title was ${decision.removed ? "removed" : "retained"}; ${staffHours} staff hours and ${legalHours} legal-review hours were recorded.`,
      context: {
        location: null,
        socialContext: null,
        pressure: challenge.reason,
        choice: decision.removed ? "Remove the title." : "Retain the title.",
        motivation:
          authority.level === "local"
            ? ballots.map((b) => `${b.personId}: ${b.reason}`).join(" ")
            : "Apply the state collection standard: no prohibited-content finding is recorded for this nonexplicit literary title.",
        immediateReaction: null,
      },
    });
  }
  return next;
}
export function libraryChallengeExpenseDollars(
  world: World,
  townId: EntityId,
  month: IsoDate,
): number {
  const own = new Set(
    (world.libraryMaterials?.challenges ?? [])
      .filter((c) => c.townId === townId)
      .map((c) => c.key),
  );
  return Math.round(
    (world.libraryMaterials?.decisions ?? [])
      .filter(
        (d) =>
          own.has(d.challengeKey) && d.on.slice(0, 7) === month.slice(0, 7),
      )
      .reduce((n, d) => n + d.expenseCents, 0) / 100,
  );
}
