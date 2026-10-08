import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import { lifePlaceStateIdentities } from "../life-places";
import { SeededRng } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { ensurePeopleTraits, recordTraitChange } from "../people-traits";
import { introduceMeasure, requireMeasure } from "../legislation";
import {
  deriveMemberDisposition,
  memberVoteConsiderations,
  type DeriveMemberDispositionInput,
} from "../legislative-member-decisions";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { seatedCongressChamber } from "./congress-chambers";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import {
  decideChamberVote,
  type ChamberVoteMemberEvaluation,
} from "./chamber-votes";
import { decideMemberVote } from "./member-vote-decision";
import type { DecisionContext, World } from "../types";

const options = [
  {
    key: "vote-yea",
    label: "Vote yes",
    description: "Vote for the question as the bill now reads.",
  },
  {
    key: "vote-nay",
    label: "Vote no",
    description: "Vote against the question as the bill now reads.",
  },
  {
    key: "withhold",
    label: "Answer present",
    description: "Be recorded present without voting either way.",
  },
] as const;

/** The removed invocation and mapping, kept only as a parity oracle. */
function oldChoice(world: World, context: DecisionContext) {
  const evaluation = evaluateDecision(world, context);
  const selected = evaluation.selectedOptionKey ?? "withhold";
  return {
    evaluation,
    disposition:
      selected === "vote-yea"
        ? "yea"
        : selected === "vote-nay"
          ? "nay"
          : "present-not-voting",
  };
}

const identities = lifePlaceStateIdentities();
const rng = new SeededRng("A79 shared member chooser all56");
const remaining = [...identities];
const order = identities.map(() => {
  const place = rng.pick(remaining);
  remaining.splice(remaining.indexOf(place), 1);
  return place;
});

describe("one extracted member chooser preserves its callers", () => {
  it.each(order)(
    "preserves complete evaluations and every weight category in $jurisdictionKey",
    (place) => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        seed: `A79-choice:${place.jurisdictionKey}`,
      });
      const { world, personId } = fixture;
      const before = serializeWorld(world);
      for (const importance of [
        "slight",
        "moderate",
        "strong",
        "decisive",
      ] as const) {
        for (const confidence of ["low", "medium", "high"] as const) {
          for (const direction of ["supports", "opposes"] as const) {
            const context: DecisionContext = {
              stableKey: `test:member:${importance}:${confidence}:${direction}`,
              decisionType: "legislation.member-vote",
              actorPersonId: personId,
              cutoff: currentHistoricalCutoff(world),
              subject: {
                kind: "context:legislative-question",
                key: "test:member-choice",
                entityId: null,
              },
              options,
              constraints: [],
              considerations: [
                {
                  stableKey: "test:recorded-input",
                  optionKey: "vote-yea",
                  sourceType: "context:test",
                  direction,
                  importance,
                  confidence,
                  explanation: "Supplied member consideration for parity.",
                  sourceRefs: [],
                },
              ],
              perceptionIds: [],
              randomness: "none",
              retention: "ephemeral",
            };
            expect(decideMemberVote(world, context)).toEqual(
              oldChoice(world, context),
            );
          }
        }
      }
      const blocked: DecisionContext = {
        stableKey: "test:member:no-available-option",
        decisionType: "legislation.member-vote",
        actorPersonId: personId,
        cutoff: currentHistoricalCutoff(world),
        subject: {
          kind: "context:legislative-question",
          key: "test:member-choice",
          entityId: null,
        },
        options,
        constraints: options.map((option) => ({
          stableKey: `test:blocked:${option.key}`,
          optionKey: option.key,
          kind: "test:unavailable",
          explanation: "Supplied unavailable option for parity.",
          sourceRefs: [],
        })),
        considerations: [],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      };
      const result = decideMemberVote(world, blocked);
      expect(result).toEqual(oldChoice(world, blocked));
      expect(result.evaluation.outcomeKind).toBe("no-available-option");
      expect(result.disposition).toBe("present-not-voting");
      expect(serializeWorld(world)).toBe(before);
    },
  );

  it.each(order.slice(0, 5))(
    "preserves bargaining traces and actual chamber repeat in a $jurisdictionKey world",
    (place) => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        date: "2026-01-05",
        seed: `A79-bargaining:${place.jurisdictionKey}`,
        offices: ["congress"],
      });
      let world = ensureNationalElectionJurisdiction(fixture.world);
      const house = seatedCongressChamber(world, "house");
      const person = house?.body.members.find(
        (member) =>
          member.personId !== null && member.personId !== fixture.personId,
      );
      if (!house || !person?.personId)
        throw new Error("The actual House member is absent.");
      world = introduceMeasure(world, {
        stableKey: "test:shared-bargaining:measure",
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_RULE_PACK.packId,
        designation: "H.R. 1",
        shortTitle: "Shared chooser fixture",
        summary: "Controlled recorded measure for caller parity.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      const question = {
        question: {
          measureId: measure.id,
          purpose: "floor-stage" as const,
          forumKey: "house",
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Pass the recorded measure?",
      };
      const before = serializeWorld(world);
      for (const mode of ["no-reason", "within-limit", "over-limit"] as const) {
        const input: DeriveMemberDispositionInput = {
          stableKey: `test:bargaining:${mode}`,
          personId: person.personId,
          question:
            mode === "over-limit"
              ? {
                  ...question,
                  pendingChange: {
                    provisionKey: "test:proposed-section",
                    beneficiaryLabels: [],
                    addsExposureMinorUnits: 2,
                  },
                }
              : question,
          ...(mode === "no-reason"
            ? {}
            : { fiscalConcernCeilingMinorUnits: 1 }),
        };
        const recorded = requireMeasure(world, measure.id);
        const considerations = memberVoteConsiderations(world, input);
        const old = oldChoice(world, {
          stableKey: `${input.stableKey}:member-decision`,
          decisionType: "legislation.member-vote",
          actorPersonId: input.personId,
          cutoff: currentHistoricalCutoff(world),
          subject: {
            kind: "context:legislative-question",
            key: `${recorded.stableKey}:${question.question.purpose}`,
            entityId: recorded.id,
          },
          options,
          constraints: [],
          considerations,
          perceptionIds: [],
          randomness: "none",
          retention: "durable",
        });
        const result = deriveMemberDisposition(world, input);
        expect(result.evaluation).toEqual(old.evaluation);
        expect(result.disposition).toBe(old.disposition);
        expect(result.disposition).toBe(
          mode === "no-reason"
            ? "present-not-voting"
            : mode === "within-limit"
              ? "yea"
              : "nay",
        );
        expect(result.account).toContain(considerations[0]!.explanation);
        expect(serializeWorld(result.world)).toBe(
          serializeWorld(recordDurableDecisionTrace(world, old.evaluation)),
        );
        expect(deriveMemberDisposition(world, input)).toEqual(result);
        expect(
          serializeWorld(deserializeWorld(serializeWorld(result.world))),
        ).toBe(serializeWorld(result.world));
        expect(
          deriveMemberDisposition(deserializeWorld(before), input),
        ).toEqual(result);
      }
      const chamberInput = {
        stableKey: "test:shared-bargaining:chamber",
        question,
        members: house.body.members,
        only: new Set([person.memberKey]),
        playerPersonId: fixture.personId,
      };
      const evaluations: ChamberVoteMemberEvaluation[] = [];
      const rows = decideChamberVote(world, chamberInput, {
        onMemberEvaluation: (row) => evaluations.push(row),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.personId).toBe(person.personId);
      expect(rows[0]!.reason).toBeTruthy();
      expect(evaluations).toHaveLength(1);
      expect(evaluations[0]!.disposition).toEqual(rows[0]);
      if (evaluations[0]!.evaluation) {
        expect(evaluations[0]!.sourceRefs).toEqual(
          evaluations[0]!.evaluation!.sourceSnapshots.map(
            (snapshot) => snapshot.reference,
          ),
        );
      } else {
        expect(evaluations[0]!.sourceRefs).toEqual([]);
      }
      expect(decideChamberVote(world, chamberInput)).toEqual(rows);
      expect(decideChamberVote(deserializeWorld(before), chamberInput)).toEqual(
        rows,
      );
      expect(serializeWorld(world)).toBe(before);
    },
  );

  it("lets one recorded deliberation change one named lawmaker's bill vote in a random new game", () => {
    const seed = "session24-t2-deliberation-vote-random-new-game";
    const place = drawRandomPlace(seed);
    const opened = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      }),
    );
    expect(opened.game, `${place.key}/${seed}`).not.toBeNull();
    const game = opened.game!;
    let world = ensureNationalElectionJurisdiction(game.world);
    const house = seatedCongressChamber(world, "house");
    expect(house, `${place.key}/${seed}`).not.toBeNull();
    const member = house!.body.members.find(
      (candidate) =>
        candidate.personId !== null &&
        candidate.personId !== game.playerPersonId &&
        candidate.partyKey !== null,
    );
    expect(
      member,
      `${place.key}/${seed}: named nonplayer House member`,
    ).toBeDefined();
    const memberId = member!.personId!;
    const oppositeParty = house!.body.members.find(
      (candidate) =>
        candidate.personId !== null &&
        candidate.personId !== game.playerPersonId &&
        candidate.partyKey !== null &&
        candidate.partyKey !== member!.partyKey,
    );
    expect(
      oppositeParty,
      `${place.key}/${seed}: opposite-party bill sponsor`,
    ).toBeDefined();

    const proposition = Object.values(world.policyCatalog.propositions).find(
      (candidate) =>
        candidate.stableKey ===
        "us-policy-positions:justice-public-safety.raise-handgun-purchase-age",
    );
    expect(proposition, "the production handgun-age question").toBeDefined();
    world = introduceMeasure(world, {
      stableKey: `${seed}:measure`,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_RULE_PACK.packId,
      designation: "H.R. T2",
      shortTitle: "A recorded bill on handgun purchase age",
      summary: "A controlled new-game bill for the member vote proof.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: oppositeParty!.personId,
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    const question = {
      question: {
        measureId: measure.id,
        purpose: "floor-stage" as const,
        forumKey: "house",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: "Pass the bill raising the handgun purchase age?",
      billAsItWouldRead: [
        { propositionId: proposition!.id, answer: "yes" as const },
      ],
    };
    const cause =
      world.history.events.find(
        (event) => event.id === member!.seatingEventId,
      ) ??
      world.history.events.find((event) =>
        event.involvedEntityIds.includes(memberId),
      );
    expect(
      cause,
      `${member!.name} has a dated life or seating record`,
    ).toBeDefined();

    world = ensurePeopleTraits(world, [memberId]);
    world = recordPrivateBelief(world, {
      stableKey: `${seed}:member-policy-view`,
      personId: memberId,
      propositionId: proposition!.id,
      formedAt: world.currentDate,
      position: "support",
      conviction: "moderate",
      salience: "moderate",
      flexibility: "firm",
      rationale: "A shared recorded view in the controlled comparison.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const neutral = recordTraitChange(world, {
      personId: memberId,
      trait: "deliberation",
      value: 0,
      eventId: cause!.id,
      reason: "The shared recorded cause for the T2 counterfactual.",
    });
    const deliberate = recordTraitChange(neutral, {
      personId: memberId,
      trait: "deliberation",
      value: -2,
      eventId: cause!.id,
      reason: "The shared recorded cause for the T2 counterfactual.",
    });
    const impulsive = recordTraitChange(neutral, {
      personId: memberId,
      trait: "deliberation",
      value: 2,
      eventId: cause!.id,
      reason: "The shared recorded cause for the T2 counterfactual.",
    });
    const commonHistory = (candidate: World) => {
      return {
        ...candidate,
        history: { ...candidate.history, personalityTendencies: [] },
      };
    };
    expect(commonHistory(deliberate)).toEqual(commonHistory(impulsive));
    const deliberateRecords = deliberate.history.personalityTendencies!;
    const impulsiveRecords = impulsive.history.personalityTendencies!;
    expect(deliberateRecords.slice(0, -1)).toEqual(
      impulsiveRecords.slice(0, -1),
    );
    const deliberateTrait = deliberateRecords.at(-1)!;
    const impulsiveTrait = impulsiveRecords.at(-1)!;
    expect(deliberateTrait).toMatchObject({
      personId: memberId,
      strength: "strong",
    });
    expect(impulsiveTrait).toMatchObject({
      personId: memberId,
      strength: "strong",
    });
    expect(deliberateTrait.expressionKey).not.toBe(
      impulsiveTrait.expressionKey,
    );

    const input = {
      stableKey: `${seed}:chamber-vote`,
      question,
      members: house!.body.members,
      only: new Set([member!.memberKey]),
      playerPersonId: game.playerPersonId,
      contested: true,
    };
    const deliberateEvaluations: ChamberVoteMemberEvaluation[] = [];
    const impulsiveEvaluations: typeof deliberateEvaluations = [];
    const deliberateBallot = decideChamberVote(deliberate, input, {
      onMemberEvaluation: (row) => deliberateEvaluations.push(row),
    })[0]!;
    const impulsiveBallot = decideChamberVote(impulsive, input, {
      onMemberEvaluation: (row) => impulsiveEvaluations.push(row),
    })[0]!;
    expect(deliberateBallot.personId).toBe(memberId);
    expect(deliberateBallot.disposition).not.toBe(impulsiveBallot.disposition);
    const deliberateEvaluation = deliberateEvaluations[0]!.evaluation!;
    const impulsiveEvaluation = impulsiveEvaluations[0]!.evaluation!;
    const deliberateBelief = deliberateEvaluation.context.considerations.find(
      (consideration) => consideration.sourceType === "belief:formed-position",
    )!;
    const impulsiveBelief = impulsiveEvaluation.context.considerations.find(
      (consideration) => consideration.sourceType === "belief:formed-position",
    )!;
    expect(deliberateBelief.importance).toBe("decisive");
    expect(impulsiveBelief.importance).toBe("slight");
    expect(deliberateEvaluations[0]!.sourceRefs).toContainEqual({
      kind: "personality-tendency",
      tendencyRecordId: deliberateTrait.id,
    });
    expect(impulsiveEvaluations[0]!.sourceRefs).toContainEqual({
      kind: "personality-tendency",
      tendencyRecordId: impulsiveTrait.id,
    });
    console.log(
      `T2 random new game: ${place.displayName}, ${place.stateJurisdictionKey} (${place.key}); ${member!.name} voted ${deliberateBallot.disposition} after recorded deliberation (-2) and ${impulsiveBallot.disposition} after recorded impulsiveness (+2) on ${measure.designation}; belief weight ${deliberateBelief.importance} versus ${impulsiveBelief.importance}; no dice.`,
    );
  });
});

it("opens a real new game in an all56 drawn place for the received A79 chooser", () => {
  const seed = "overflow8-a79-received-chooser-opening";
  const place = drawRandomPlace(seed);
  console.log("A79 opening", seed, place.key);
  const opened = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
    }),
  );
  expect(opened.game).not.toBeNull();
  expect(
    opened.game!.world.people[opened.game!.playerPersonId]!.homeJurisdictionId,
  ).toBe(place.context.jurisdiction.id);
});
