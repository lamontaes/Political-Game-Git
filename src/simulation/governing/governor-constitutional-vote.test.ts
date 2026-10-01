import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { considerationScore } from "../decisions";
import type { DecisionConsideration } from "../types";
import { stateCandidacyPack } from "../candidacy-packs";
import {
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  stateAmendmentProfile,
} from "../constitutional-process";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import {
  ensureStateLegislatureOpening,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import { introduceMeasure } from "../legislation";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { deriveMemberDisposition } from "../legislative-member-decisions";
import { jointAssemblyCandidates, jointAssemblyVote } from "./joint-assembly";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
  stateExecutiveOffice,
} from "../nationwide-world/state-executives";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { decideChamberVote, stateConstitutionalBody } from "./chamber-votes";
import {
  termLimitBallot,
  termLimitConsiderations,
} from "../living-world/federal-reform";
import { recordStateGovernorTermLimitProposalVotes } from "../living-world/constitutional-reform";

// Supplied proposal and cause on an actual generated governor and legislature.
// This is not an ordinary multi-year amendment or statewide ratification proof.
const seed = "A79-governor-actual-rollcall";
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
const governorReasons = {
  title: "governor",
  decisionType: "governing.governor-term-limit-vote",
  keyWord: "governor",
};
let world: World;
let playerId: EntityId;
let governorId: EntityId;
beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  playerId = game.playerPersonId;
  world = ensureStateLegislatureOpening(
    game.world,
    playerId,
    state.jurisdictionKey.slice(3),
  );
  world = ensureStateExecutiveIncumbent(
    world,
    playerId,
    state.jurisdictionKey.slice(3),
  );
  governorId = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === state.jurisdictionKey.slice(3),
  )!.personId;
});
function proposal(direction: "extend" | "restore" = "restore") {
  const cause = {
    direction,
    holderPersonId: governorId,
    value: {
      maxConsecutiveTerms: direction === "restore" ? 2 : 4,
      maxLifetimeTerms: null,
      lookbackYears: null,
    },
    reason:
      "Supplied direction for unchanged governor-term-limit consideration parity.",
  };
  const next = proposeConstitutionalMeasure(world, {
    stableKey: `a79:actual-governor:${direction}`,
    jurisdictionId: jurisdiction.id,
    jurisdictionKey: `US-${state.jurisdictionKey.slice(3)}`,
    processKind: "state-amendment",
    designation: "Supplied Governor Amendment",
    shortTitle: "The governor's term limit",
    text: "Supplied term-limit change for the actual-member recording test.",
    textVersion: "v1",
    sponsoringAuthority: `The ${jurisdiction.name} Legislature`,
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: stateExecutiveOffice(state.jurisdictionKey.slice(3))!
        .officeKey,
      field: "executive.term.limit",
      value: cause.value,
      applicability: {
        appliesTo: "terms-beginning-after",
        countsPriorService: false,
      },
    },
    ordinaryMeasureId: null,
  });
  return {
    world: next,
    cause,
    measureId: next.history.constitutionalMeasures!.at(-1)!.id,
  };
}
function bodies(at: World, measureId: EntityId) {
  return stateAmendmentProfile(state.jurisdictionKey)!.bodies.map((body) => ({
    body,
    ...stateConstitutionalBody(at, measureId, body.bodyKey),
  }));
}
describe("A79 governor term-limit actual-member rollcall", () => {
  it("preserves legacy reason magnitudes for every supported importance, confidence and direction", () => {
    // Retained former reason-only arithmetic; the decision engine stays unchanged.
    const oldImportance = { slight: 1, moderate: 2, strong: 4, decisive: 6 };
    const oldConfidence = { low: 1, medium: 2, high: 3 };
    const reasons: DecisionConsideration[] = [];
    for (const importance of Object.keys(
      oldImportance,
    ) as (keyof typeof oldImportance)[])
      for (const confidence of Object.keys(
        oldConfidence,
      ) as (keyof typeof oldConfidence)[])
        for (const direction of ["supports", "opposes"] as const)
          reasons.push({
            stableKey: `member:principle:${importance}:${confidence}:${direction}`,
            optionKey: "vote-yea",
            sourceType: "context:reason-parity",
            direction,
            importance,
            confidence,
            explanation:
              "Supplied reason for complete legacy weight equivalence.",
            sourceRefs: [],
          });
    const oldMagnitude = (reason: DecisionConsideration) =>
      oldImportance[reason.importance] * oldConfidence[reason.confidence];
    expect(reasons).toHaveLength(24);
    for (const reason of reasons)
      expect(Math.abs(considerationScore(reason))).toBe(oldMagnitude(reason));
    // Every ordered pair includes unequal magnitudes, opposite signs and ties.
    for (const left of reasons)
      for (const right of reasons)
        expect(
          Math.abs(considerationScore(right)) -
            Math.abs(considerationScore(left)),
        ).toBe(oldMagnitude(right) - oldMagnitude(left));
    expect(
      [...reasons].sort(
        (a, b) =>
          Math.abs(considerationScore(b)) - Math.abs(considerationScore(a)),
      ),
    ).toEqual([...reasons].sort((a, b) => oldMagnitude(b) - oldMagnitude(a)));
  });

  function suppliedReason(
    key: string,
    direction: "supports" | "opposes" = "supports",
  ): DecisionConsideration {
    return {
      stableKey: `member:principle:${key}`,
      optionKey: "vote-yea",
      sourceType: "context:reason-parity",
      direction,
      importance: "decisive",
      confidence: "high",
      explanation: "Supplied equal-weight reason on an actual seated member.",
      sourceRefs: [],
    };
  }
  function actualMemberReason(extra: readonly DecisionConsideration[]) {
    const fixture = proposal();
    const { body, seated } = bodies(fixture.world, fixture.measureId)[0]!;
    const member = seated.body.members[0]!;
    const voter = { memberKey: member.memberKey, personId: member.personId! };
    const ballot = termLimitBallot(
      fixture.world,
      "a79:reason-parity",
      voter,
      fixture.cause,
      governorReasons,
      extra,
    );
    const [shared] = decideChamberVote(fixture.world, {
      kind: "constitutional",
      stableKey: "a79:reason-parity",
      constitutionalMeasureId: fixture.measureId,
      bodyKey: body.bodyKey,
      purpose: "proposal",
      members: seated.body.members,
      playerPersonId: playerId,
      considerationsByMember: new Map([
        [
          member.memberKey,
          termLimitConsiderations(
            fixture.world,
            voter,
            fixture.cause,
            governorReasons,
            extra,
          ),
        ],
      ]),
    });
    expect(shared!.disposition).toBe(ballot.ballot);
    expect(shared!.reason).toBe(ballot.reason);
    expect(ballot.ballot).toBe("yea");
    return ballot.reason;
  }
  it("keeps input order when equally weighted reasons tie in both callers", () => {
    const first = suppliedReason("z-first");
    const second = suppliedReason("a-second");
    expect(actualMemberReason([first, second])).toBe(first.stableKey);
    expect(actualMemberReason([second, first])).toBe(second.stableKey);
  });
  it("keeps an opposing reason's full magnitude and tie position in both callers", () => {
    const negative = suppliedReason("z-negative-first", "opposes");
    expect(considerationScore(negative)).toBe(-18);
    expect(
      actualMemberReason([
        negative,
        suppliedReason("a-positive"),
        suppliedReason("b-positive"),
      ]),
    ).toBe(negative.stableKey);
  });
  it("records the ordinary member caller's exact decisions, accounts and durable traces", () => {
    const members = bodies(
      proposal().world,
      proposal().measureId,
    )[0]!.seated.body.members.slice(0, 3);
    const pack = legislativePackForJurisdiction(jurisdiction.id)!;
    const propositionId = world.policyCatalog.propositionOrder.find((id) => {
      const proposition = world.policyCatalog.propositions[id]!;
      return world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
        "state",
      );
    })!;
    expect(propositionId).toBeDefined();
    let inputWorld = introduceMeasure(world, {
      stableKey: "a79:reason-weight:ordinary-bill",
      jurisdictionId: jurisdiction.id,
      rulePackId: pack.packId,
      designation: "Supplied A79 Bill",
      shortTitle: "Recorded ordinary member reason comparison",
      summary:
        "Controlled explicit bill answer on the existing actual state chamber.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: members[0]!.personId,
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    });
    const measureId = inputWorld.history.legislativeMeasures!.at(-1)!.id;
    for (const [index, position] of ["support", "oppose"].entries())
      inputWorld = recordPrivateBelief(inputWorld, {
        stableKey: `a79:reason-weight:authored-belief:${index}`,
        personId: members[index]!.personId!,
        propositionId,
        formedAt: inputWorld.currentDate,
        position: position as "support" | "oppose",
        conviction: "strong",
        salience: "high",
        flexibility: "firm",
        rationale:
          "Controlled belief for the old/new reason-ranking comparison.",
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });
    const rows = members.map((member) => {
      const result = deriveMemberDisposition(inputWorld, {
        stableKey: `a79:reason-weight:${member.memberKey}`,
        personId: member.personId!,
        question: {
          question: {
            measureId,
            purpose: "floor-stage",
            forumKey: "house",
            floorStageKey: null,
            amendmentStableKey: null,
            provisionKey: null,
          },
          questionLabel: "Pass the supplied bill?",
        },
      });
      expect(result.account.length).toBeGreaterThan(0);
      expect(result.world.history.decisionTraces.length).toBeGreaterThan(
        inputWorld.history.decisionTraces.length,
      );
      return {
        personId: member.personId,
        disposition: result.disposition,
        account: result.account,
        selectedOptionKey: result.evaluation.selectedOptionKey,
        trace: result.world.history.decisionTraces.at(-1),
      };
    });
    expect(rows[0]!.disposition).toBe("yea");
    expect(rows[1]!.disposition).toBe("nay");
    expect(rows[2]!.disposition).toBe("present-not-voting");
    console.info(
      "A79 ordinary reason receipt",
      JSON.stringify({
        seed,
        place: place.displayName,
        measureId,
        members: rows.length,
        rows,
      }),
    );
  });
  it("records the joint assembly caller's exact ballots and reasons on actual state members", () => {
    const members = stateLegislators(
      world,
      stateCandidacyPack(state.jurisdictionKey)!.packId,
    );
    expect(members.length).toBeGreaterThan(0);
    const candidates = jointAssemblyCandidates(members, null);
    expect(candidates.length).toBeGreaterThan(0);
    const vote = jointAssemblyVote(world, {
      stableKey: "a79:reason-weight:joint-assembly",
      members,
      candidates,
    });
    expect(vote.ballots).toHaveLength(members.length);
    console.info(
      "A79 joint reason receipt",
      JSON.stringify({
        seed,
        place: place.displayName,
        members: members.length,
        vote,
      }),
    );
  });
  it("preserves both legacy directions for the same saved people and consideration weights", () => {
    let compared = 0;
    const examples: unknown[] = [];
    for (const direction of ["extend", "restore"] as const) {
      const fixture = proposal(direction);
      const tallies: {
        body: string;
        seats: number;
        yea: number;
        cast: number;
        example: string;
        ballot: string;
        reason: string | undefined;
      }[] = [];
      for (const { body, seated } of bodies(fixture.world, fixture.measureId)) {
        const rows = decideChamberVote(fixture.world, {
          kind: "constitutional",
          stableKey: `parity:${direction}`,
          constitutionalMeasureId: fixture.measureId,
          bodyKey: body.bodyKey,
          purpose: "proposal",
          members: seated.body.members,
          playerPersonId: playerId,
          considerationsByMember: new Map(
            seated.body.members.map((member) => [
              member.memberKey,
              member.personId
                ? termLimitConsiderations(
                    fixture.world,
                    { memberKey: member.memberKey, personId: member.personId },
                    fixture.cause,
                    governorReasons,
                  )
                : [],
            ]),
          ),
        });
        for (const row of rows) {
          expect(row.personId).not.toBeNull();
          const old = termLimitBallot(
            fixture.world,
            `old:${direction}:${row.memberKey}`,
            { memberKey: row.memberKey, personId: row.personId! },
            fixture.cause,
            governorReasons,
          );
          expect(row.disposition).toBe(old.ballot);
          expect(row.reason).toBe(old.reason);
          compared++;
        }
        tallies.push({
          body: body.bodyKey,
          seats: seated.seats,
          yea: rows.filter((row) => row.disposition === "yea").length,
          cast: rows.filter((row) => row.disposition !== "absent").length,
          example: seated.body.members[0]!.name,
          ballot: rows[0]!.disposition,
          reason: rows[0]!.reason,
        });
      }
      const totalYes = tallies.reduce((sum, row) => sum + row.yea, 0);
      const totalCast = tallies.reduce((sum, row) => sum + row.cast, 0);
      const comparison = tallies.map((row) => ({
        ...row,
        direction,
        oldProjectedYea: Math.round((row.seats * totalYes) / totalCast),
      }));
      expect(comparison.some((row) => row.oldProjectedYea !== row.yea)).toBe(
        true,
      );
      examples.push(...comparison);
    }
    console.info(
      "A79 governor parity",
      JSON.stringify({
        seed,
        place: place.displayName,
        state: state.jurisdictionKey,
        fullIdentityPool: identities.length,
        admittedPool: supported.length,
        governorId,
        compared,
        directionChanges: 0,
        examples,
      }),
    );
  });
  it("records actual chamber identities and unchanged terms instead of anonymous scaled seats", () => {
    const fixture = proposal();
    const saved = recordStateGovernorTermLimitProposalVotes(
      fixture.world,
      fixture.measureId,
      fixture.cause,
    );
    const actions = constitutionalActions(saved, fixture.measureId).filter(
      (row) => row.detail.kind === "proposal-vote",
    );
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      if (action.detail.kind !== "proposal-vote")
        throw Error("Rollcall missing.");
      const bodyKey = action.detail.bodyKey;
      const { seated, sourceRecordIds } = bodies(
        fixture.world,
        fixture.measureId,
      ).find((row) => row.body.bodyKey === bodyKey)!;
      expect(
        action.detail.vote.dispositions.map((row) => [
          row.memberKey,
          row.personId,
        ]),
      ).toEqual(
        seated.body.members.map((row) => [row.memberKey, row.personId]),
      );
      expect(action.detail.vote.eligibleMembers).toBe(seated.seats);
      expect(action.detail.vote.provenance.method).toBe("member-decisions");
      expect(action.detail.vote.provenance.sourceEntityIds).toEqual(
        expect.arrayContaining([...sourceRecordIds]),
      );
    }
    expect(saved.history.constitutionalMeasures).toEqual(
      fixture.world.history.constitutionalMeasures,
    );
    console.info(
      "A79 governor recorded",
      JSON.stringify({
        seed,
        measureId: fixture.measureId,
        phase: constitutionalPosition(saved, fixture.measureId).phase,
        bodies: actions.map((row) =>
          row.detail.kind === "proposal-vote"
            ? {
                body: row.detail.bodyKey,
                outcome: row.detail.vote.outcome,
                dispositions: row.detail.vote.dispositions.length,
              }
            : null,
        ),
      }),
    );
  });
  it("preserves the recorded rejection, repeat IDs and canonical Save/Continue", () => {
    const fixture = proposal();
    const saved = recordStateGovernorTermLimitProposalVotes(
      fixture.world,
      fixture.measureId,
      fixture.cause,
    );
    expect(constitutionalPosition(saved, fixture.measureId).phase).toBe(
      "rejected",
    );
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(constitutionalActions(loaded, fixture.measureId)).toEqual(
      constitutionalActions(saved, fixture.measureId),
    );
    expect(
      recordStateGovernorTermLimitProposalVotes(
        loaded,
        fixture.measureId,
        fixture.cause,
      ),
    ).toBe(loaded);
  });
  it("keeps a controlled actual member absent without inventing their vote", () => {
    const fixture = proposal();
    const first = bodies(fixture.world, fixture.measureId)[0]!.seated.body
      .members[0]!;
    const at: World = {
      ...fixture.world,
      control: { kind: "person", personId: first.personId! },
    };
    const saved = recordStateGovernorTermLimitProposalVotes(
      at,
      fixture.measureId,
      fixture.cause,
    );
    const action = constitutionalActions(saved, fixture.measureId).find(
      (row) => row.detail.kind === "proposal-vote",
    )!;
    if (action.detail.kind !== "proposal-vote")
      throw Error("Rollcall missing.");
    expect(
      action.detail.vote.dispositions.find(
        (row) => row.personId === first.personId,
      )?.disposition,
    ).toBe("absent");
  });
  it("refuses missing body bindings, an unrecorded holder and mismatched terms", () => {
    const fixture = proposal();
    const missing: World = {
      ...fixture.world,
      history: { ...fixture.world.history, ruleChangeConsequenceBindings: [] },
    };
    expect(() =>
      recordStateGovernorTermLimitProposalVotes(
        missing,
        fixture.measureId,
        fixture.cause,
      ),
    ).toThrow(/dated institution binding/);
    expect(() =>
      recordStateGovernorTermLimitProposalVotes(
        fixture.world,
        fixture.measureId,
        { ...fixture.cause, holderPersonId: playerId },
      ),
    ).toThrow(/matching cause terms/);
    expect(() =>
      recordStateGovernorTermLimitProposalVotes(
        fixture.world,
        fixture.measureId,
        {
          ...fixture.cause,
          value: { ...fixture.cause.value, maxConsecutiveTerms: 5 },
        },
      ),
    ).toThrow(/matching cause terms/);
    expect(
      constitutionalActions(fixture.world, fixture.measureId),
    ).toHaveLength(1);
  });
});
