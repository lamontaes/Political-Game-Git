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
import { decideChamberVote } from "./chamber-votes";
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
      const rows = decideChamberVote(world, chamberInput);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.personId).toBe(person.personId);
      expect(rows[0]!.reason).toBeTruthy();
      expect(decideChamberVote(world, chamberInput)).toEqual(rows);
      expect(decideChamberVote(deserializeWorld(before), chamberInput)).toEqual(
        rows,
      );
      expect(serializeWorld(world)).toBe(before);
    },
  );
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
