import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stateCandidacyPack } from "../candidacy-packs";
import {
  constitutionalActions,
  constitutionalEntityAvailableAt,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  stateAmendmentProfile,
} from "../constitutional-process";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import {
  ensureStateLegislatureOpening,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { currentHistoricalCutoff } from "../queries";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import {
  decideChamberVote,
  seatedChamberForPack,
  stateConstitutionalBody,
} from "./chamber-votes";
import {
  constitutionalMemberConsiderations,
  memberBallot,
  stateVoice,
} from "./article-v";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";
import {
  recordStatePolicyProposalVotes,
  constitutionalReformReviewHandler,
  CONSTITUTIONAL_REFORM_REVIEW,
} from "../living-world/constitutional-reform";
import { recordOrganizationProfile, recordWorkStatus } from "../life";
import { addDays } from "../dates";
import { resolveRequiredVotes } from "../legislature-rules";
import {
  advanceWorld,
  createWorld,
  writeWithWorldIntegrityOnce,
} from "../world";
import { scheduleFutureDueItem } from "../future-transitions";
import { createFormationContext, recordPrinciples } from "../politics";

// The substrate cases retain authored choices. The A79 migration cases below
// exercise the shared state evaluator and the actual policy recording caller.
const seed = "A79-saved-state-constitutional-body";
const identities = lifePlaceStateIdentities();
const supported = identities.filter(
  (identity) =>
    US_STATE_USPS.includes(
      identity.jurisdictionKey.slice(3) as (typeof US_STATE_USPS)[number],
    ) &&
    stateAmendmentProfile(identity.jurisdictionKey)?.basis === "game-profile" &&
    stateCandidacyPack(identity.jurisdictionKey) !== null,
);
const state = new SeededRng(seed).pick(supported);
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;
const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
let world: World;
let beforeProposal: World;
let personId: EntityId;
let measureId: EntityId;
beforeAll(() => {
  const small = smallWorld({
    place: place.key,
    seed,
    offices: ["state-legislature"],
  });
  personId = small.personId;
  world = ensureStateLegislatureOpening(
    small.world,
    personId,
    state.jurisdictionKey.slice(3),
  );
  const propositionId = world.policyCatalog.propositionOrder.find((id) => {
    const proposition = world.policyCatalog.propositions[id]!;
    return world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
      "state",
    );
  })!;
  expect(propositionId).toBeDefined();
  beforeProposal = world;
  world = proposeConstitutionalMeasure(world, {
    stableKey: "a79:saved-state-proposal",
    jurisdictionId: jurisdiction.id,
    jurisdictionKey: `US-${state.jurisdictionKey.slice(3)}`,
    processKind: "state-amendment",
    designation: "Supplied State Amendment",
    shortTitle: world.policyCatalog.propositions[propositionId]!.name,
    text: "Supplied state constitutional proposal for the saved-body contract fixture.",
    textVersion: "v1",
    sponsoringAuthority: `The ${jurisdiction.name} Legislature`,
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: { kind: "policy-provision", propositionId, stance: "adopt" },
    ordinaryMeasureId: null,
  });
  measureId = world.history.constitutionalMeasures!.at(-1)!.id;
});

function actualBodies(at: World) {
  const pack = legislativePackForJurisdiction(jurisdiction.id)!;
  const profile = stateAmendmentProfile(state.jurisdictionKey)!;
  return profile.bodies.map((body) => {
    const chamber = pack.chambers.find(
      (row) => row.chamberKey === body.bodyKey,
    )!;
    expect(chamber).toBeDefined();
    const seated = seatedChamberForPack(
      at,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!;
    expect(seated).not.toBeNull();
    return { body, seated };
  });
}

describe("A79 actual saved state constitutional body preparation", () => {
  it("joins the state roster to actual saved seat work and institution records", () => {
    const members = stateLegislators(
      world,
      stateCandidacyPack(state.jurisdictionKey)!.packId,
    );
    expect(members.length).toBeGreaterThan(0);
    const bodies = actualBodies(world);
    expect(bodies.flatMap((row) => row.seated.body.members)).toHaveLength(
      members.length,
    );
    for (const { body, seated } of bodies) {
      expect(seated.seats).toBe(body.members);
      expect(seated.body.members).toHaveLength(body.members);
      for (const member of seated.body.members) {
        const actual = members.find((row) => row.personId === member.personId)!;
        expect(actual).toBeDefined();
        const work = world.history.workRelationships.find(
          (row) => row.id === actual.workRelationshipId,
        )!;
        expect(work).toBeDefined();
        expect(work.personId).toBe(member.personId);
        expect(
          world.history.organizations.some(
            (row) => row.id === work.organizationId,
          ),
        ).toBe(true);
        expect(actual.officeKey.endsWith(`:${body.bodyKey}`)).toBe(true);
        expect(world.people[member.personId!]).toBeDefined();
      }
    }
    const cutoff = currentHistoricalCutoff(world);
    expect(
      constitutionalEntityAvailableAt(
        world,
        measureId,
        cutoff.asOfDate,
        cutoff.historySequenceExclusive,
      ),
    ).toBe(true);
    const measure = world.history.constitutionalMeasures!.find(
      (row) => row.id === measureId,
    )!;
    expect(measure).toMatchObject({
      processKind: "state-amendment",
      jurisdictionId: jurisdiction.id,
      jurisdictionKey: `US-${state.jurisdictionKey.slice(3)}`,
    });
    expect(measure.proposalRule).toEqual(
      stateAmendmentProfile(state.jurisdictionKey)!.base,
    );
    console.info(
      "A79 state substrate",
      JSON.stringify({
        seed,
        state: state.jurisdictionKey,
        place: place.displayName,
        fullIdentityPool: identities.length,
        supportedGameProfileStatePool: supported.length,
        measureId,
        members: members.length,
        bodies: bodies.map((row) => ({
          bodyKey: row.body.bodyKey,
          members: row.seated.body.members.length,
          example: row.seated.body.members[0]!.name,
        })),
      }),
    );
  });

  it("preserves an authored actual-member state rejection rollcall through canonical Continue", () => {
    const { body, seated } = actualBodies(world)[0]!;
    const saved = recordConstitutionalProposalVote(
      world,
      measureId,
      body.bodyKey,
      seated.body.members.map((member, index) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: index === 0 ? ("absent" as const) : ("nay" as const),
        reason:
          index === 0
            ? "member:supplied-absence"
            : "member:supplied-state-fixture",
      })),
      seated.seats,
      {
        method: "authored-fixture",
        note: "Supplied dispositions on actual saved state members; no shared-vote migration claimed.",
        sourceEntityIds: seated.body.members.flatMap((member) =>
          member.personId ? [member.personId] : [],
        ),
      },
    );
    expect(constitutionalPosition(saved, measureId).phase).toBe("rejected");
    const action = constitutionalActions(saved, measureId).find(
      (row) => row.detail.kind === "proposal-vote",
    )!;
    if (action.detail.kind !== "proposal-vote")
      throw Error("State rollcall missing.");
    expect(
      action.detail.vote.dispositions.map((row) => [
        row.memberKey,
        row.personId,
      ]),
    ).toEqual(
      seated.body.members.map((member) => [member.memberKey, member.personId]),
    );
    expect(action.detail.vote.dispositions[0]!.disposition).toBe("absent");
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(constitutionalActions(loaded, measureId)).toEqual(
      constitutionalActions(saved, measureId),
    );
    expect(actualBodies(loaded)).toEqual(actualBodies(saved));
    expect(
      ensureStateLegislatureOpening(
        loaded,
        personId,
        state.jurisdictionKey.slice(3),
      ),
    ).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(serializeWorld(saved));
  });
});

function ballotInput(at: World, bodyKey: string) {
  const { seated } = stateConstitutionalBody(at, measureId, bodyKey);
  const measure = at.history.constitutionalMeasures!.find(
    (row) => row.id === measureId,
  )!;
  if (measure.ruleDelta.kind !== "policy-provision")
    throw Error("Policy fixture missing.");
  const propositionId = measure.ruleDelta.propositionId;
  return {
    kind: "constitutional" as const,
    stableKey: measure.stableKey,
    constitutionalMeasureId: measure.id,
    bodyKey,
    purpose: "proposal" as const,
    members: seated.body.members,
    considerationsByMember: new Map(
      seated.body.members
        .filter((member) => member.personId)
        .map((member) => [
          member.memberKey,
          constitutionalMemberConsiderations(
            at,
            member.personId!,
            propositionId,
            "yes",
          ),
        ]),
    ),
  };
}

function authoredViews(
  at: World,
  allSupport = false,
  opposingBody: string | null = null,
): World {
  const measure = world.history.constitutionalMeasures!.find(
    (row) => row.id === measureId,
  )!;
  if (measure.ruleDelta.kind !== "policy-provision")
    throw Error("Policy fixture missing.");
  const bearings =
    at.policyCatalog.propositions[measure.ruleDelta.propositionId]!.principles!;
  const next = at;
  const inputs: Parameters<typeof recordPrinciples>[1][number][] = [];
  for (const { body, seated } of actualBodies(at)) {
    for (const [index, member] of (allSupport
      ? seated.body.members
      : seated.body.members.slice(0, 2)
    ).entries()) {
      inputs.push(
        ...bearings.map((bearing) => ({
          stableKey: `a79-state-authored:${member.personId}:${bearing.principleId}`,
          personId: member.personId!,
          principleId: bearing.principleId,
          formedAt: next.currentDate,
          stance:
            (bearing.bearing === "consistent-with") ===
            (allSupport ? body.bodyKey !== opposingBody : index === 0)
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("other:drawn-before-play", {
            note: "Authored opposed views on actual state legislators for A79 decision parity.",
          }),
          supersedesPrincipleRecordId:
            next.history.principles
              .filter(
                (row) =>
                  row.personId === member.personId &&
                  row.principleId === bearing.principleId,
              )
              .at(-1)?.id ?? null,
        })),
      );
    }
  }
  return recordPrinciples(at, inputs);
}

describe("A79 shared saved state policy proposal votes", () => {
  it("keeps non-neutral individual decisions while retaining each actual chamber and member identity", () => {
    const at = authoredViews(world);
    const measure = at.history.constitutionalMeasures!.find(
      (row) => row.id === measureId,
    )!;
    if (measure.ruleDelta.kind !== "policy-provision")
      throw Error("Policy fixture missing.");
    let comparisons = 0;
    let yea = 0;
    const examples: { name: string; ballot: string }[] = [];
    for (const { body } of actualBodies(at)) {
      const input = ballotInput(at, body.bodyKey);
      const shared = decideChamberVote(at, input);
      expect(shared.map((row) => [row.memberKey, row.personId])).toEqual(
        input.members.map((row) => [row.memberKey, row.personId]),
      );
      for (const [index, member] of input.members.entries()) {
        const old = memberBallot(
          at,
          `${measure.stableKey}:${member.personId}`,
          member.personId!,
          measure.ruleDelta.propositionId,
        );
        expect(shared[index]!.disposition).toBe(old.ballot);
        comparisons++;
        if (old.ballot === "yea") yea++;
      }
      examples.push(
        ...shared.slice(0, 2).map((row, index) => ({
          name: input.members[index]!.name,
          ballot: row.disposition,
        })),
      );
    }
    expect(yea).toBeGreaterThan(0);
    expect(yea).toBeLessThan(comparisons);
    console.info(
      "A79 state shared-vote receipt",
      JSON.stringify({
        seed,
        place: place.displayName,
        state: state.jurisdictionKey,
        comparisons,
        changedDirections: 0,
        yea,
        examples,
        fixture:
          "Authored opposed principles on actual saved state legislators; not natural filing",
      }),
    );
  });

  it("records the saved policy proposal with actual rollcall/source IDs and preserves repeat/Continue", () => {
    const at = authoredViews(world);
    const saved = recordStatePolicyProposalVotes(at, measureId);
    const votes = constitutionalActions(saved, measureId).filter(
      (row) => row.detail.kind === "proposal-vote",
    );
    expect(votes).toHaveLength(1);
    const action = votes[0]!;
    if (action.detail.kind !== "proposal-vote")
      throw Error("Missing state vote.");
    const { seated, sourceRecordIds } = stateConstitutionalBody(
      at,
      measureId,
      action.detail.bodyKey,
    );
    expect(action.detail.vote.dispositions).toEqual(
      decideChamberVote(at, ballotInput(at, action.detail.bodyKey)),
    );
    expect(action.detail.vote.provenance.method).toBe("member-decisions");
    expect(action.detail.vote.provenance.sourceEntityIds).toEqual(
      sourceRecordIds,
    );
    expect(action.detail.vote.provenance.note).toContain("game-profile");
    expect(action.detail.vote.dispositions.map((row) => row.personId)).toEqual(
      seated.body.members.map((row) => row.personId),
    );
    expect(constitutionalPosition(saved, measureId).phase).toBe("rejected");
    expect(recordStatePolicyProposalVotes(saved, measureId)).toBe(saved);
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(constitutionalActions(loaded, measureId)).toEqual(
      constitutionalActions(saved, measureId),
    );
    expect(recordStatePolicyProposalVotes(loaded, measureId)).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(serializeWorld(saved));
  });

  it("refuses a missing institution binding and a mismatched saved roster without substituting Congress", () => {
    const { body } = actualBodies(world)[0]!;
    const input = ballotInput(world, body.bodyKey);
    const missingBinding: World = {
      ...world,
      history: { ...world.history, ruleChangeConsequenceBindings: [] },
    };
    expect(() => decideChamberVote(missingBinding, input)).toThrow(
      /dated institution binding/,
    );
    expect(() =>
      recordStatePolicyProposalVotes(missingBinding, measureId),
    ).toThrow(/dated institution binding/);
    expect(() =>
      decideChamberVote(world, { ...input, members: input.members.slice(1) }),
    ).toThrow(/seated members/);
    expect(() =>
      decideChamberVote(world, {
        ...input,
        members: input.members.map((row, index) =>
          index === 0 ? { ...row, personId } : row,
        ),
      }),
    ).toThrow(/seated members/);
    expect(() =>
      decideChamberVote(world, { ...input, bodyKey: "not-a-recorded-chamber" }),
    ).toThrow(/profile and chamber/);
  });

  it("keeps present-not-voting when an actual member has no deciding consideration", () => {
    const { body } = actualBodies(world)[0]!;
    const input = ballotInput(world, body.bodyKey);
    const votes = decideChamberVote(world, {
      ...input,
      considerationsByMember: new Map(),
    });
    expect(votes).toHaveLength(input.members.length);
    expect(
      votes.every(
        (row) =>
          row.disposition === "present-not-voting" &&
          row.reason === "member:no-reason",
      ),
    ).toBe(true);
  });
  it("rejects when one actual chamber opposes even though the old scaled whole-state tally would carry", () => {
    const bodies = actualBodies(world);
    const opposing = [...bodies].sort(
      (left, right) => left.seated.seats - right.seated.seats,
    )[0]!;
    const at = authoredViews(world, true, opposing.body.bodyKey);
    const votes = bodies.map(({ body }) =>
      decideChamberVote(at, ballotInput(at, body.bodyKey)),
    );
    const cast = votes
      .flat()
      .filter((row) => row.disposition === "yea" || row.disposition === "nay");
    const yes = cast.filter((row) => row.disposition === "yea").length;
    const oldScaledWouldCarry = bodies.every(
      ({ seated }) =>
        Math.round((seated.seats * yes) / cast.length) >=
        resolveRequiredVotes(
          stateAmendmentProfile(state.jurisdictionKey)!.base,
          seated.seats,
        ).requiredVotes,
    );
    expect(oldScaledWouldCarry).toBe(true);
    const saved = recordStatePolicyProposalVotes(at, measureId);
    expect(constitutionalPosition(saved, measureId).phase).toBe("rejected");
    const actual = constitutionalActions(saved, measureId).find(
      (row) =>
        row.detail.kind === "proposal-vote" &&
        row.detail.bodyKey === opposing.body.bodyKey,
    )!;
    if (actual.detail.kind !== "proposal-vote")
      throw Error("Opposing chamber rollcall missing.");
    expect(
      actual.detail.vote.dispositions.every((row) => row.disposition === "nay"),
    ).toBe(true);
    expect(actual.detail.vote.outcome).toBe("failed");
    console.info(
      "A79 intended chamber outcome correction",
      JSON.stringify({
        seed,
        state: state.jurisdictionKey,
        measureId,
        oldScaledWouldCarry,
        newPhase: constitutionalPosition(saved, measureId).phase,
        opposedBody: opposing.body.bodyKey,
        example: opposing.seated.body.members[0]!.name,
        exampleDisposition: actual.detail.vote.dispositions[0]!.disposition,
        fixture:
          "Authored actual chamber disagreement; whole-state scaling counterfactual uses the retained old arithmetic",
      }),
    );
  });

  it("records an actual ended seat as absent with no replacement person", () => {
    const { body, seated } = actualBodies(world)[0]!;
    const member = seated.body.members[0]!;
    const tenure = stateLegislators(
      world,
      stateCandidacyPack(state.jurisdictionKey)!.packId,
    ).find((row) => row.personId === member.personId)!;
    const prior = world.history.workStatuses
      .filter((row) => row.workRelationshipId === tenure.workRelationshipId)
      .at(-1)!;
    const at = recordWorkStatus(world, {
      stableKey: "a79:actual-seat-ended",
      workRelationshipId: tenure.workRelationshipId,
      effectiveAt: world.currentDate,
      status: "ended",
      reason:
        "Authored end of the actual legislative tenure for vacancy proof.",
      provenance: { kind: "generated", generatorKey: "a79:actual-seat-ended" },
      supersedesStatusId: prior.id,
    });
    const input = ballotInput(at, body.bodyKey);
    const vote = decideChamberVote(at, input).find(
      (row) => row.memberKey === member.memberKey,
    )!;
    expect(vote).toMatchObject({ personId: null, disposition: "absent" });
    expect(input.members).toHaveLength(seated.seats);
    expect(input.members.filter((row) => row.personId !== null)).toHaveLength(
      seated.seats - 1,
    );
    const saved = recordStatePolicyProposalVotes(at, measureId);
    const action = constitutionalActions(saved, measureId).find(
      (row) => row.detail.kind === "proposal-vote",
    )!;
    if (action.detail.kind !== "proposal-vote")
      throw Error("Vacancy rollcall missing.");
    expect(action.detail.vote.eligibleMembers).toBe(seated.seats);
    expect(
      action.detail.vote.dispositions.find(
        (row) => row.memberKey === member.memberKey,
      ),
    ).toMatchObject({ personId: null, disposition: "absent" });
    expect(
      deserializeWorld(serializeWorld(saved)).history.constitutionalActions,
    ).toEqual(saved.history.constitutionalActions);
  });

  it("uses the ordinary review caller to save a proposal before actual state rollcalls", () => {
    let at = authoredViews(beforeProposal, true);
    const year = Number(at.currentDate.slice(0, 4));
    const stableKey = `constitutional-reform/v1:${state.jurisdictionKey.slice(3)}:${year}:review`;
    at = scheduleFutureDueItem(at, {
      stableKey,
      dueAt: addDays(at.currentDate, 1),
      transitionKey: CONSTITUTIONAL_REFORM_REVIEW,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Controlled one-day core-clock invocation of the actual scheduled review caller; no ordinary-life/year claim.",
      },
    });
    const advanced = advanceWorld(at, 1, {
      get: (key) =>
        key === CONSTITUTIONAL_REFORM_REVIEW
          ? constitutionalReformReviewHandler
          : undefined,
    });
    const result = { world: advanced };
    const proposal = result.world.history.constitutionalMeasures!.find(
      (row) =>
        row.processKind === "state-amendment" &&
        row.ruleDelta.kind === "policy-provision",
    )!;
    expect(proposal).toBeDefined();
    expect(proposal.ordinaryMeasureId).toBeNull();
    const votes = constitutionalActions(result.world, proposal.id).filter(
      (row) => row.detail.kind === "proposal-vote",
    );
    expect(votes).toHaveLength(
      stateAmendmentProfile(state.jurisdictionKey)!.bodies.length,
    );
    for (const action of votes) {
      if (action.detail.kind !== "proposal-vote")
        throw Error("Missing rollcall.");
      expect(action.sequence).toBeGreaterThan(proposal.sequence);
      expect(action.detail.vote.provenance.method).toBe("member-decisions");
      expect(
        action.detail.vote.dispositions.every((row) => row.personId !== null),
      ).toBe(true);
    }
    expect(constitutionalPosition(result.world, proposal.id).phase).toBe(
      "ratification",
    );
    console.info(
      "A79 actual state policy caller",
      JSON.stringify({
        seed,
        state: state.jurisdictionKey,
        place: place.displayName,
        proposalId: proposal.id,
        phase: constitutionalPosition(result.world, proposal.id).phase,
        voters: votes.reduce(
          (count, row) =>
            count +
            (row.detail.kind === "proposal-vote"
              ? row.detail.vote.dispositions.length
              : 0),
          0,
        ),
        fixture:
          "Authored common support on actual legislators; one-day core-clock saved review callback, not ordinary-life/year",
      }),
    );
    // A valid world without the state opening, rather than deleting indexed
    // history records and then asking the core clock to accept a broken save.
    const unseatedWorld = createWorld({
      seed: `${seed}:no-state-roster`,
      currentDate: beforeProposal.currentDate,
      jurisdictions: [jurisdiction],
      people: [],
    });
    let unseated = scheduleFutureDueItem(unseatedWorld, {
      stableKey,
      dueAt: addDays(unseatedWorld.currentDate, 1),
      transitionKey: CONSTITUTIONAL_REFORM_REVIEW,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Actual scheduled review with no saved state roster.",
      },
    });
    let refusalContext: string | null = null;
    unseated = advanceWorld(unseated, 1, {
      get: (key) =>
        key === CONSTITUTIONAL_REFORM_REVIEW
          ? (at, item) => {
              const refusal = constitutionalReformReviewHandler(at, item);
              refusalContext = refusal.context;
              return refusal;
            }
          : undefined,
    });
    expect(refusalContext).toContain("congressional delegation cannot cast");
    expect(unseated.history.constitutionalMeasures ?? []).toHaveLength(0);
  });

  it("refuses a closed actual body before forming member principles", () => {
    const member = actualBodies(beforeProposal)[0]!.seated.body.members.find(
      (row) => row.personId !== null,
    )!;
    const tenure = stateLegislators(
      beforeProposal,
      stateCandidacyPack(state.jurisdictionKey)!.packId,
    ).find((row) => row.personId === member.personId)!;
    const work = beforeProposal.history.workRelationships.find(
      (row) => row.id === tenure.workRelationshipId,
    )!;
    const prior = beforeProposal.history.organizationProfiles
      .filter((row) => row.organizationId === work.organizationId)
      .at(-1)!;
    const closed = recordOrganizationProfile(beforeProposal, {
      stableKey: "a79:preflight-closed-body",
      organizationId: work.organizationId!,
      effectiveAt: beforeProposal.currentDate,
      name: prior.name,
      classification: prior.classification,
      locationJurisdictionId: prior.locationJurisdictionId,
      provenance: {
        kind: "authored",
        note: "Supplied closed-body refusal fixture.",
      },
      supersedesProfileId: prior.id,
      closed: { reason: "custom:controlled-closed-body" },
    });
    const queued = scheduleFutureDueItem(closed, {
      stableKey: `constitutional-reform/v1:${state.jurisdictionKey.slice(3)}:${closed.currentDate.slice(0, 4)}:review`,
      dueAt: addDays(closed.currentDate, 1),
      transitionKey: CONSTITUTIONAL_REFORM_REVIEW,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Direct saved-handler fixture, not an ordinary clock run.",
      },
    });
    const due = queued.history.futureDueItems.at(-1)!;
    expect(due.transitionKey).toBe(CONSTITUTIONAL_REFORM_REVIEW);
    // Retained legacy entry ordering formed principles before validating the
    // body's dated institution identity. Compare only that exact old step.
    const legacy = ensureOfficeholderPrinciples(
      queued,
      stateVoice(queued, state.jurisdictionKey.slice(3)).personIds,
    );
    expect(legacy.history.principles.length).toBeGreaterThan(
      queued.history.principles.length,
    );
    const result = constitutionalReformReviewHandler(queued, due);
    expect(result.context).toContain("actual state legislature is not seated");
    expect(result.world.history.principles).toEqual(queued.history.principles);
    expect(result.world.history.constitutionalMeasures).toEqual(
      queued.history.constitutionalMeasures,
    );
    expect(result.world.history.constitutionalActions).toEqual(
      queued.history.constitutionalActions,
    );
  });

  it("declines filing for vacant actual state chambers without substituting Congress", () => {
    const tenures = stateLegislators(
      beforeProposal,
      stateCandidacyPack(state.jurisdictionKey)!.packId,
    );
    expect(tenures.length).toBeGreaterThan(0);
    const at = writeWithWorldIntegrityOnce(beforeProposal, () => {
      let next = beforeProposal;
      for (const tenure of tenures) {
        const prior = next.history.workStatuses
          .filter((row) => row.workRelationshipId === tenure.workRelationshipId)
          .at(-1)!;
        next = recordWorkStatus(next, {
          stableKey: `a79:preflight-ended:${tenure.workRelationshipId}`,
          workRelationshipId: tenure.workRelationshipId,
          effectiveAt: next.currentDate,
          status: "ended",
          reason:
            "Supplied end of actual legislative tenures for vacant-body refusal proof.",
          provenance: {
            kind: "generated",
            generatorKey: "a79:preflight-ended",
          },
          supersedesStatusId: prior.id,
        });
      }
      return next;
    });
    const year = Number(at.currentDate.slice(0, 4));
    const stableKey = `constitutional-reform/v1:${state.jurisdictionKey.slice(3)}:${year}:review`;
    const queued = scheduleFutureDueItem(at, {
      stableKey,
      dueAt: addDays(at.currentDate, 1),
      transitionKey: CONSTITUTIONAL_REFORM_REVIEW,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Controlled vacant-body review fixture, not ordinary filing.",
      },
    });
    const due = queued.history.futureDueItems.find(
      (row) => row.stableKey === stableKey,
    )!;
    let beforeReview: World | undefined;
    let afterReview: World | undefined;
    const result = {
      world: advanceWorld(queued, 1, {
        get: (key) =>
          key === CONSTITUTIONAL_REFORM_REVIEW
            ? (world, item) => {
                beforeReview = world;
                const response = constitutionalReformReviewHandler(world, item);
                afterReview = response.world;
                return response;
              }
            : undefined,
      }),
    };
    expect(result.world.history.constitutionalMeasures).toEqual(
      at.history.constitutionalMeasures,
    );
    expect(result.world.history.constitutionalActions).toEqual(
      at.history.constitutionalActions,
    );
    expect(beforeReview).toBeDefined();
    expect(afterReview).toBeDefined();
    if (!beforeReview || !afterReview)
      throw Error("The actual review callback must run.");
    expect(afterReview.history.principles).toEqual(
      beforeReview.history.principles,
    );
    expect(
      result.world.history.futureDueItemStates.find(
        (row) => row.dueItemId === due.id && row.status === "resolved",
      )?.context,
    ).toContain("No policy has most of the legislature behind a change");
    const loaded = deserializeWorld(serializeWorld(result.world));
    expect(loaded.history.constitutionalMeasures).toEqual(
      result.world.history.constitutionalMeasures,
    );
    expect(loaded.history.principles).toEqual(result.world.history.principles);
  });
});
