import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  STATES,
  isFederalDistrictJurisdictionKey,
} from "../../simulation/state-reference";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import * as native from "../../simulation/governing/question-authority";
import { lawInForce } from "../../simulation/governing/law-in-force";
import catalog from "../../../data/research/powers-catalog/catalog.json";
import questionPowers from "../../../data/research/powers-catalog/question-powers.json";
import {
  questionAuthority,
  mayAnswerQuestion,
  jurisdictionPowersLevels,
  type QuestionAuthorityFacts,
} from "./question-authority";
import type { EntityId } from "../../simulation/types";

describe("legislatures: question authority from raw catalog and dated law outputs", () => {
  it.each(Object.keys(STATES))(
    "matches every catalog question's public authority in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-authority:${place}`,
      });
      const world = base.world;
      const jurisdictions = [
        ...new Set([
          ...world.jurisdictionOrder,
          stateJurisdictionForKey(`US-${place}`)!.id,
          NATIONAL_ELECTION_JURISDICTION.id,
          "fixture:missing-jurisdiction" as EntityId,
        ]),
      ];
      const states = new Map(
        Object.keys(STATES).flatMap((key) => {
          const row = stateJurisdictionForKey(`US-${key}`);
          return row ? [[`US-${key}`, row] as const] : [];
        }),
      );
      const contexts = new Map(
        jurisdictions.flatMap((id) => {
          const row = lifePlaceByJurisdictionId(id);
          return row
            ? [
                [
                  id,
                  {
                    stateJurisdictionKey: row.stateJurisdictionKey,
                    kind: row.context.jurisdiction.kind,
                  },
                ] as const,
              ]
            : [];
        }),
      );
      const lawKeys = new Set([
        native.HOME_RULE_QUESTION,
        ...Object.values(questionPowers.questions).flatMap((row) =>
          "gate" in row ? [row.gate.question] : [],
        ),
      ]);
      const cutoff = {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      };
      const laws: QuestionAuthorityFacts["laws"] = new Map(
        [...states.values()].flatMap((state) =>
          world.policyCatalog.propositionOrder.flatMap((id) => {
            if (!lawKeys.has(world.policyCatalog.propositions[id]!.stableKey))
              return [];
            const law = lawInForce(
              world,
              state.id,
              id,
              world.currentDate,
              "all",
              cutoff,
            );
            return law ? [[`${state.id}:${id}`, law] as const] : [];
          }),
        ),
      );
      const facts: QuestionAuthorityFacts = {
        onDate: world.currentDate,
        policyCatalog: world.policyCatalog,
        questions:
          questionPowers.questions as unknown as QuestionAuthorityFacts["questions"],
        dials: new Map(catalog.dials.map((row) => [row.id, row.levels])),
        federalJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        stateKinds: new Map(
          Object.entries(STATES).flatMap(([key, row]) => {
            const state = states.get(`US-${key}`);
            return state ? [[state.id, row.jurisdictionKind] as const] : [];
          }),
        ),
        placeContexts: contexts,
        federalDistrictStateKeys: new Set(
          [...states.keys()].filter(isFederalDistrictJurisdictionKey),
        ),
        jurisdictionKinds: new Map(
          world.jurisdictionOrder.map((id) => [
            id,
            world.jurisdictions[id]!.kind,
          ]),
        ),
        cachedLevels: new Map(),
        stateKeys: new Map(
          [...contexts].flatMap(([id, row]) =>
            row.stateJurisdictionKey
              ? [[id, row.stateJurisdictionKey] as const]
              : [],
          ),
        ),
        states,
        laws,
      };
      for (const jurisdictionId of jurisdictions) {
        expect(jurisdictionPowersLevels(facts, jurisdictionId)).toEqual(
          native.jurisdictionPowersLevels(world, jurisdictionId),
        );
        for (const id of [
          ...world.policyCatalog.propositionOrder,
          "fixture:missing-question" as EntityId,
        ]) {
          expect(
            questionAuthority(
              facts,
              jurisdictionId,
              id,
              world.currentDate,
              cutoff,
            ),
          ).toEqual(
            native.questionAuthority(
              world,
              jurisdictionId,
              id,
              world.currentDate,
              cutoff,
            ),
          );
          expect(
            mayAnswerQuestion(
              facts,
              jurisdictionId,
              id,
              world.currentDate,
              cutoff,
            ),
          ).toBe(
            native.mayAnswerQuestion(
              world,
              jurisdictionId,
              id,
              world.currentDate,
              cutoff,
            ),
          );
        }
      }
    },
    30000,
  );
});
