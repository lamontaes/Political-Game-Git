import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { recordedVandalismClemencyCase } from "../../../tests/fixtures/clemency-court-case";
import { ageOnDate, dateAtAge } from "../dates";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import {
  createOrganization,
  createWorkRelationship,
  recordOrganizationParticipationState,
} from "../life";
import {
  currentLifeCutoff,
  organizationParticipationStateAt,
} from "../life-queries";
import { recordRelationshipInteraction } from "../records";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createFormationContext, recordPrinciples } from "../politics";
import { latestPrinciple } from "../queries";
import { assertWorldIntegrity } from "../world";
import { fileClemencyPetition, advanceClemencyPetition } from "./clemency";
import { answersTo } from "./clemency-records";
import {
  enterPlea,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
} from "./prosecution";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";
import {
  ensureOpeningClemencyBoardAppointments,
  clemencyBoardAppointmentProfiles,
} from "./clemency-board-seating";
import {
  decideRecordedClemencyBoard,
  CLEMENCY_BOARD_MEMBER_VOTE,
} from "./clemency-board-decisions";

function fixture() {
  const profile = clemencyBoardAppointmentProfiles.find(
    (row) => row.quorum !== null && row.minimumFavorableVotes !== null,
  )!;
  const small = smallWorld({
    place: profile.jurisdictionKey,
    seed: "team9-board-member-consumer",
    offices: ["governor"],
    people: 32,
  });
  const facts = recordedVandalismClemencyCase(
    small.world,
    small.personId,
    profile.jurisdictionKey,
  );
  const referral = referForProsecution(facts.world, {
    stableKey: "fixture:board-member-case",
    subjectPersonId: small.personId,
    jurisdictionId: facts.world.people[small.personId]!.homeJurisdictionId,
    offenseKey: "crime:vandalism",
    referredBy: {
      kind: "police",
      label: "Authored recorded charge",
      personId: null,
    },
    basisEventIds: facts.basisEventIds,
    sentencingAllegations: facts.sentencingAllegations,
    evidence: "documentary",
    standingFindings: 6,
  });
  let world = referral.world;
  const chargeDue = world.history.futureDueItems.find(
    (row) =>
      row.stableKey === `justice:prosecution-stage:${referral.referralId}`,
  )!;
  for (const item of world.history.futureDueItems) {
    if (
      item.id !== chargeDue.id &&
      futureDueItemStateAt(world, item.id, currentLifeCutoff(world))?.status ===
        "scheduled"
    )
      world = cancelFutureDueItem(world, {
        stableKey: `fixture:board-isolate:${item.id}`,
        dueItemId: item.id,
        effectiveAt: world.currentDate,
        reasonKey: "fixture:isolated-court",
        context:
          "Retain unrelated commitments while testing the saved court case.",
      });
  }
  world = resolveFutureDueItemsThrough(
    world,
    chargeDue.dueAt,
    createProsecutionTransitionRegistry(),
  );
  const charge = world.history.events.find(
    (row) =>
      row.type === PROSECUTION_CHARGED_EVENT &&
      row.tags.includes(`justice.referral:${referral.referralId}`),
  )!;
  const plea = enterPlea(world, {
    personId: small.personId,
    referralId: referral.referralId,
    plea: "guilty",
  });
  expect(plea.ok).toBe(true);
  const trialDue = plea.world.history.futureDueItems.find(
    (row) => row.stableKey === `justice:prosecution-stage:${charge.id}`,
  )!;
  world = resolveFutureDueItemsThrough(
    plea.world,
    trialDue.dueAt,
    createProsecutionTransitionRegistry(),
  );
  const sentence = world.history.events.find(
    (row) =>
      row.type === PROSECUTION_SENTENCED_EVENT &&
      row.involvedEntityIds.includes(small.personId),
  )!;
  expect(sentence).toBeDefined();
  const filed = fileClemencyPetition(world, {
    personId: small.personId,
    sentencedEventId: sentence.id,
  });
  expect(filed.ok, filed.ok ? undefined : filed.reason).toBe(true);
  if (!filed.ok) throw new Error(filed.reason);
  return {
    world: filed.world,
    petition: filed.world.history.events.find(
      (row) => row.id === filed.petitionId,
    )!,
    profile,
    petitionerId: small.personId,
  };
}

describe("actual appointed board members answer a saved clemency petition", () => {
  it("preserves an unseated body's actual petition without inventing votes", () => {
    const { world, petition, profile } = fixture();
    const result = decideRecordedClemencyBoard(
      world,
      petition,
      profile.jurisdictionKey,
      profile.bodyKey,
    );
    expect(result.world).toBe(world);
    expect(result.favorable).toBeNull();
    expect(result.votes).toEqual([]);
    expect(
      answersTo(advanceClemencyPetition(world, petition.id), petition.id),
    ).toEqual([]);
  }, 30_000);

  it("uses actual appointment decisions and members' reasons, preserving votes and the board answer through reload", () => {
    const initial = fixture();
    let world = initial.world;
    const office = governorOfficeForJurisdiction(
      world,
      initial.profile.jurisdictionKey,
    )!;
    const candidates = world.personOrder
      .filter(
        (id) =>
          id !== office.holderPersonId &&
          id !== initial.petitionerId &&
          ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 30,
      )
      .slice(0, initial.profile.quorum!);
    expect(candidates).toHaveLength(initial.profile.quorum!);
    world = createOrganization(world, {
      stableKey: "fixture:board-professional-employer",
      formedAt: candidates
        .map((candidate) =>
          dateAtAge(
            world.people[candidate]!.birthDate,
            ageOnDate(world.people[candidate]!.birthDate, world.currentDate) -
              8,
          ),
        )
        .sort()[0]!,
      provenance: {
        kind: "authored",
        note: "Explicit fixture professional employer.",
      },
      initialProfile: {
        name: "Recorded professional employer",
        classification: "service:professional",
        locationJurisdictionId: office.jurisdictionId,
      },
    });
    const employerId = world.history.organizations.at(-1)!.id;
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (row) =>
        row.stableKey.endsWith(
          "justice-public-safety.restore-voting-after-sentence",
        ),
    )!;
    for (const candidate of candidates) {
      world = recordRelationshipInteraction(world, {
        stableKey: `fixture:board-governor-help:${candidate}`,
        personIds: [office.holderPersonId, candidate],
        eventId: null,
        occurredAt: world.currentDate,
        kind: "support:helped-through-a-hard-time",
        change: "strengthened",
        significance: "major",
        summary:
          "Authored fixture: the governor knows this actual professional.",
        tags: [`relationship.actor:${candidate}`],
      });
      world = createWorkRelationship(world, {
        stableKey: `fixture:board-work:${candidate}`,
        personId: candidate,
        organizationId: employerId,
        startedAt: dateAtAge(
          world.people[candidate]!.birthDate,
          ageOnDate(world.people[candidate]!.birthDate, world.currentDate) - 8,
        ),
        kind: "employment:staff",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: {
          kind: "authored",
          note: "Explicit eight-year professional history, not inferred qualification.",
        },
        initialRole: {
          title: "Recorded professional",
          occupationClassification: "profession:corrections",
          locationJurisdictionId: office.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "rigid",
            interruptibility: "non-interruptible",
            locationJurisdictionId: office.jurisdictionId,
          },
        },
      });
      world = recordPrinciples(
        world,
        [
          ...new Map(
            (proposition.principles ?? []).map((bearing) => [
              bearing.principleId,
              bearing,
            ]),
          ).values(),
        ].map((bearing) => ({
          stableKey: `fixture:board-mercy:${candidate}:${bearing.principleId}`,
          personId: candidate,
          principleId: bearing.principleId,
          formedAt: world.currentDate,
          stance:
            bearing.bearing !== "against"
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: 1,
          conviction: "strong" as const,
          flexibility: "conditional" as const,
          qualification:
            "Authored member belief favors a second chance; the shared decision chooses the vote.",
          formation: createFormationContext("reflection:initial"),
          supersedesPrincipleRecordId:
            latestPrinciple(world, candidate, bearing.principleId)?.id ?? null,
        })),
      );
      world = ensureOpeningClemencyBoardAppointments(world);
    }
    const membership = world.history.organizationParticipations.find(
      (row) => row.kind === "membership:clemency-board",
    )!;
    const membershipState = organizationParticipationStateAt(
      world,
      membership.id,
    )!;
    const departed = recordOrganizationParticipationState(world, {
      stableKey: "fixture:board-member-left",
      participationId: membership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      roleKind: null,
      context:
        "Authored fixture: one actual member has left before considering this request.",
      provenance: {
        kind: "authored",
        note: "Explicit dated departure; no missing attendance inferred.",
      },
      supersedesStateId: membershipState.id,
    });
    const short = decideRecordedClemencyBoard(
      departed,
      initial.petition,
      initial.profile.jurisdictionKey,
      initial.profile.bodyKey,
    );
    expect(short.world).toBe(departed);
    expect(short.favorable).toBeNull();
    expect(short.votes).toEqual([]);
    const controlled = decideRecordedClemencyBoard(
      { ...world, control: { kind: "person", personId: candidates[0]! } },
      initial.petition,
      initial.profile.jurisdictionKey,
      initial.profile.bodyKey,
    );
    expect(controlled.votes).toHaveLength(initial.profile.quorum! - 1);
    expect(
      controlled.votes.every(
        (vote) =>
          !vote.participants.some(
            (person) => person.personId === candidates[0],
          ),
      ),
    ).toBe(true);
    expect(controlled.favorable).toBeNull();
    const result = decideRecordedClemencyBoard(
      world,
      initial.petition,
      initial.profile.jurisdictionKey,
      initial.profile.bodyKey,
    );
    expect(result.votes).toHaveLength(initial.profile.quorum!);
    expect(
      result.votes.every((vote) => vote.type === CLEMENCY_BOARD_MEMBER_VOTE),
    ).toBe(true);
    expect(result.favorable).toBe(true);
    const answered = advanceClemencyPetition(result.world, initial.petition.id);
    const answer = answersTo(answered, initial.petition.id).find(
      (row) => row.bodyKey === initial.profile.bodyKey,
    )!;
    expect(answer).toBeDefined();
    expect(
      answer.event.tags.filter((tag) => tag.startsWith("board-vote:")),
    ).toHaveLength(initial.profile.minimumFavorableVotes!);
    const restored = deserializeWorld(serializeWorld(answered));
    const repeated = advanceClemencyPetition(restored, initial.petition.id);
    expect(repeated.history.events).toEqual(answered.history.events);
    expect(repeated.history.decisionTraces).toEqual(
      answered.history.decisionTraces,
    );
    assertWorldIntegrity(repeated);
  }, 30_000);
});
