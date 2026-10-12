import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";

import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";

import * as native from "../../simulation/governing/law-in-force";

import { measureAnswersAt as oldAnswers } from "../../simulation/vote-bundle";
import { makeIsoDate } from "../../simulation/dates";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";

import {
  lawInForce,
  startingLawInForce,
  startingLawTerms,
  startingLawScope,
  startingLawCategories,
  startingLawSchedules,
  ownLawLevel,
} from "./dated-law";
import { measureAnswersAt } from "./bill-answers";
import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../../simulation/types";

import { lawFacts } from "./test-support/law-facts";

const watchedPlace =
  Object.keys(STATES)[randomInt(Object.keys(STATES).length)]!;
function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
describe("laws: full dated selector and native public starting-row callers", () => {
  it.each(Object.keys(STATES))(
    "matches hierarchy, source phases and saved law chronology in %s",
    (usps) => {
      const generated = smallWorld({
        place: `US-${usps}`,
        seed: `rules2-laws-dated:${usps}`,
      });
      const { world } = generated;
      const keys = Object.keys(startingLaw.questions);
      const questions = Object.values(world.policyCatalog.propositions).filter(
        (q) => keys.includes(q.stableKey),
      );
      const dates = [
        "2025-12-31",
        "2026-01-01",
        "2026-07-01",
        "2027-01-01",
        "2028-01-01",
        "2029-01-01",
      ].map(makeIsoDate);
      const jurisdictions = [
        generated.jurisdictionId,
        generated.stateJurisdictionId,
        NATIONAL_ELECTION_JURISDICTION.id,
      ];
      // With no enacted/constitutional law no authority receipt is consulted. Source tables are the actual frozen corpus.
      const facts = lawFacts(world, [], [], []);
      for (const jurisdiction of jurisdictions) {
        expect(ownLawLevel(facts, jurisdiction)).toEqual(
          native.ownLawLevel(jurisdiction),
        );
        for (const question of questions)
          for (const date of dates) {
            for (const scope of ["all", "enacted-only"] as const)
              expect(
                result(() =>
                  lawInForce(facts, jurisdiction, question.id, date, scope),
                ),
              ).toEqual(
                result(() =>
                  native.lawInForce(
                    world,
                    jurisdiction,
                    question.id,
                    date,
                    scope,
                  ),
                ),
              );
            const law = startingLawInForce(
              facts,
              jurisdiction,
              question.id,
              date,
            );
            expect(law).toEqual(
              native.startingLawInForce(world, jurisdiction, question.id, date),
            );
            if (law) {
              for (const workplace of [undefined, "fixture:missing-workplace"])
                expect(
                  startingLawTerms(
                    facts,
                    law,
                    question.stableKey,
                    date,
                    workplace,
                  ),
                ).toEqual(
                  native.startingLawTerms(
                    law,
                    question.stableKey,
                    date,
                    workplace,
                  ),
                );
              expect(
                startingLawScope(facts, law, question.stableKey, date),
              ).toEqual(native.startingLawScope(law, question.stableKey, date));
              expect(
                startingLawCategories(facts, law, question.stableKey, date),
              ).toEqual(
                native.startingLawCategories(law, question.stableKey, date),
              );
              expect(
                startingLawSchedules(facts, law, question.stableKey, date),
              ).toEqual(
                native.startingLawSchedules(law, question.stableKey, date),
              );
            }
          }
      }
      if (usps === watchedPlace)
        writeFileSync(
          "/tmp/rules2-laws-watch.json",
          JSON.stringify(
            {
              place: `US-${usps}`,
              seed: `rules2-laws-dated:${usps}`,
              worldId: world.id,
              onDate: world.currentDate,
              jurisdictionId: generated.jurisdictionId,
              stateJurisdictionId: generated.stateJurisdictionId,
              scope:
                "Read-only dated laws from generated native World/source corpus; not ordinary NPC enactment or playable core2 proof.",
              laws: jurisdictions.map((id) => ({
                jurisdictionId: id,
                readings: questions.slice(0, 3).map((q) => ({
                  questionKey: q.stableKey,
                  law: lawInForce(facts, id, q.id, world.currentDate),
                })),
              })),
              time: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
      const question = Object.values(world.policyCatalog.propositions).find(
        (q) =>
          q.stableKey ===
          "us-federal-positions:budget.pay-for-a-higher-debt-limit",
      )!;
      expect(question).toBeDefined();
      // Authored saved-law edge, read by unchanged native public selectors; not spontaneous enactment proof.
      const seq = world.history.nextSequence;
      const measure = {
        id: `fixture:${usps}:measure` as EntityId,
        stableKey: `fixture:${usps}:measure`,
        sequence: seq,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: "US:congress",
        designation: "HR 905",
        shortTitle: "Authored saved law",
        summary: "Authored law chronology control",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: makeIsoDate("2026-01-01"),
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [question.id],
        propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
      } as LegislativeMeasureRecord;
      const enactment = {
        id: `fixture:${usps}:enactment` as EntityId,
        stableKey: `fixture:${usps}:enactment`,
        sequence: seq + 1,
        measureId: measure.id,
        resolvedAt: makeIsoDate("2026-01-02"),
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: makeIsoDate("2026-02-01"),
        outcomeEventId: `fixture:${usps}:event` as EntityId,
      } as LegislativeEnactmentRecord;
      const saved = {
        ...world,
        history: {
          ...world.history,
          nextSequence: seq + 2,
          legislativeMeasures: [
            ...(world.history.legislativeMeasures ?? []),
            measure,
          ],
          legislativeEnactments: [
            ...(world.history.legislativeEnactments ?? []),
            enactment,
          ],
        },
      };
      const cutoffs = [
        undefined,
        { asOfDate: world.currentDate, historySequenceExclusive: seq + 1 },
        { asOfDate: world.currentDate, historySequenceExclusive: seq + 2 },
      ];
      const controls = lawFacts(saved, [question.id], dates, cutoffs);
      for (const date of dates)
        for (const cutoff of cutoffs)
          for (const scope of ["all", "enacted-only"] as const)
            expect(
              lawInForce(
                controls,
                generated.jurisdictionId,
                question.id,
                date,
                scope,
                cutoff,
              ),
            ).toEqual(
              native.lawInForce(
                saved,
                generated.jurisdictionId,
                question.id,
                date,
                scope,
                cutoff,
              ),
            );
      for (const cutoff of [seq, seq + 1, seq + 2])
        expect(measureAnswersAt(controls, measure.id, cutoff)).toEqual(
          oldAnswers(saved, measure.id, cutoff),
        );
    },
  );
});
