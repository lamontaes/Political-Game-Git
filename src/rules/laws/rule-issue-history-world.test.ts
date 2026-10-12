import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ensureNationalElectionJurisdiction } from "../../simulation/national-election-geography";
import { createStableId } from "../../simulation/ids";
import { makeIsoDate } from "../../simulation/dates";
import * as nativeRules from "../../simulation/enacted-rule-changes";
import * as nativeIssue from "../../simulation/issue-record";
import { lawFacts } from "./test-support/law-facts";
import {
  institutionOfficeBindingAt,
  enactedRuleChanges,
  enactedRuleChangeAt,
  type RuleChangeFacts,
} from "./recorded-rule-changes";
import {
  judgeIssueRecord,
  issueRecordFor,
  issueStandingsFor,
  type IssueFacts,
} from "./issue-judgment";
import { stateKeyForJurisdiction } from "../../simulation/life-places";
import {
  stateResidenceSince,
  homeJurisdictionResidenceSince,
} from "../../simulation/nationwide-world/residence-duration";
import { isPersonAliveAt } from "../../simulation/vitality-integrity";
import { governingOfficeForPerson } from "../../simulation/governing/state-governing";
import type {
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  LegislativeVoteRecord,
  PrivateBeliefRecord,
} from "../../simulation/types";
import type {
  RuleChangeProvisionRecord,
  InstitutionOfficeBindingRecord,
} from "../../simulation/enacted-rule-changes";
function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}
function issueFacts(world: World): IssueFacts {
  const date = world.currentDate,
    seq = world.history.nextSequence;
  const stateKeys = new Map(
    world.jurisdictionOrder.map((id) => [
      id,
      stateKeyForJurisdiction(world.jurisdictions[id]!),
    ]),
  );
  return {
    onDate: date,
    nextSequence: seq,
    people: world.people,
    personOrder: world.personOrder,
    jurisdictions: world.jurisdictions,
    measures: world.history.legislativeMeasures ?? [],
    provisions: world.history.legislativeProvisions ?? [],
    itemVetoes: world.history.itemVetoes ?? [],
    legislativeVotes: world.history.legislativeVotes ?? [],
    executiveDispositions: world.history.executiveDispositions ?? [],
    privateBeliefs: world.history.privateBeliefs,
    offices: new Map(
      world.personOrder.map((id) => [id, governingOfficeForPerson(world, id)]),
    ),
    stateKeys,
    alive: new Map(
      world.personOrder.map((id) => [
        JSON.stringify([id, date]),
        isPersonAliveAt(world, id, {
          asOfDate: date,
          historySequenceExclusive: seq,
        }),
      ]),
    ),
    stateResidence: new Map(
      world.personOrder.flatMap((person) =>
        [...stateKeys.values()]
          .filter((k): k is string => k !== null)
          .map(
            (k) =>
              [
                JSON.stringify([person, k, date]),
                stateResidenceSince(world, person, k, date),
              ] as const,
          ),
      ),
    ),
    homeResidence: new Map(
      world.personOrder.flatMap((person) =>
        world.jurisdictionOrder.map(
          (id) =>
            [
              JSON.stringify([person, id, date]),
              homeJurisdictionResidenceSince(world, person, id, date),
            ] as const,
        ),
      ),
    ),
  };
}
describe("laws: saved rule chronology and issue judgment through native public readers", () => {
  it.each(Object.keys(STATES))(
    "matches binding supersession, operative changes and voter record in %s",
    (usps) => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2-law-history:" + usps,
      });
      let world = ensureNationalElectionJurisdiction(base.world);
      const seq = world.history.nextSequence;
      const q = Object.values(world.policyCatalog.propositions)[0]!;
      // Explicit saved-history controls for read-only mathematics, not ordinary enactment or vote-writer claims.
      const measure = {
        id: createStableId(
          "legislative-measure",
          world.id + ":history:measure",
        ),
        stableKey: "fixture:history:measure",
        sequence: seq,
        jurisdictionId: base.stateJurisdictionId,
        rulePackId: "fixture:" + usps,
        designation: "HB 905",
        shortTitle: "Authored saved-history control",
        summary: "Explicit rule and issue-reader input.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: makeIsoDate("2026-01-01"),
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [q.id],
        propositionAnswers: [{ propositionId: q.id, answer: "yes" }],
      } as LegislativeMeasureRecord;
      const enactment = {
        id: createStableId(
          "legislative-enactment",
          world.id + ":history:enactment",
        ),
        stableKey: "fixture:history:enactment",
        sequence: seq + 3,
        measureId: measure.id,
        resolvedAt: makeIsoDate("2026-01-02"),
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: makeIsoDate("2026-01-03"),
        outcomeEventId: createStableId(
          "event",
          world.id + ":history:enactment-event",
        ),
      } as LegislativeEnactmentRecord;
      const rule = {
        id: createStableId("rule-change-provision", world.id + ":history:rule"),
        stableKey: "fixture:history:rule",
        sequence: seq + 1,
        measureId: measure.id,
        filedAt: makeIsoDate("2026-01-01"),
        stateUsps: usps,
        officeKey: nativeRules.laborLawOfficeKey(usps),
        field: "labor.minimumWage.hourlyCents",
        value: 1600,
        applicability: {
          appliesTo: "all-current-and-future",
          ambiguity: "silent",
        },
      } as unknown as RuleChangeProvisionRecord;
      const vote = {
        id: createStableId("legislative-vote", world.id + ":history:vote"),
        stableKey: "fixture:history:vote",
        sequence: seq + 2,
        measureId: measure.id,
        takenAt: world.currentDate,
        purpose: "floor-stage",
        dispositions: [
          {
            memberKey: "fixture:subject",
            personId: base.personId,
            disposition: "yea",
          },
        ],
      } as unknown as LegislativeVoteRecord;
      const beliefs = world.personOrder
        .filter((id) => id !== base.personId)
        .map(
          (personId, index) =>
            ({
              id: createStableId("belief", world.id + ":history:" + personId),
              stableKey: "fixture:belief:" + personId,
              sequence: seq + 4 + index,
              personId,
              propositionId: q.id,
              formedAt: world.currentDate,
              position: index === 0 ? "oppose" : "support",
              salience: index === 0 ? "low" : "central",
            }) as PrivateBeliefRecord,
        );
      world = {
        ...world,
        history: {
          ...world.history,
          nextSequence: seq + 10,
          legislativeMeasures: [measure],
          legislativeEnactments: [enactment],
          ruleChangeProvisions: [rule],
          legislativeVotes: [vote],
          privateBeliefs: [...world.history.privateBeliefs, ...beliefs],
        },
      };
      const binding = {
        id: createStableId(
          "rule-change-consequence-binding",
          world.id + ":history:binding",
        ),
        stableKey: "fixture:history:binding",
        kind: "office-organization",
        sequence: seq + 6,
        recordedAt: world.currentDate,
        effectiveAt: world.currentDate,
        officeKey: rule.officeKey,
        jurisdictionId: base.stateJurisdictionId,
        organizationId: base.personId,
        supersedesBindingId: null,
      } as unknown as InstitutionOfficeBindingRecord;
      const replacement = {
        ...binding,
        id: createStableId(
          "rule-change-consequence-binding",
          world.id + ":history:replacement",
        ),
        sequence: seq + 7,
        supersedesBindingId: binding.id,
      };
      for (const bindings of [
        [],
        [binding],
        [binding, replacement],
        [binding, { ...replacement, supersedesBindingId: null }],
      ]) {
        const saved = {
          ...world,
          history: {
            ...world.history,
            ruleChangeConsequenceBindings: bindings,
          },
        };
        const cutoffs = [
          { asOfDate: world.currentDate, historySequenceExclusive: seq + 3 },
          { asOfDate: world.currentDate, historySequenceExclusive: seq + 7 },
          {
            asOfDate: world.currentDate,
            historySequenceExclusive: saved.history.nextSequence,
          },
        ];
        const facts: RuleChangeFacts = {
          ...lawFacts(saved, [q.id], [world.currentDate], cutoffs),
          bindings,
          ruleProvisions: [rule],
        };
        for (const cutoff of cutoffs) {
          expect(
            result(() =>
              institutionOfficeBindingAt(
                facts,
                rule.officeKey,
                base.stateJurisdictionId,
                cutoff,
              ),
            ),
          ).toEqual(
            result(() =>
              nativeRules.institutionOfficeBindingAt(
                saved,
                rule.officeKey,
                base.stateJurisdictionId,
                cutoff,
              ),
            ),
          );
          expect(enactedRuleChanges(facts, cutoff)).toEqual(
            nativeRules.enactedRuleChanges(saved, cutoff),
          );
          const query = {
            stateUsps: usps,
            officeKey: rule.officeKey,
            field: rule.field,
            onDate: world.currentDate,
            cutoff,
          };
          expect(enactedRuleChangeAt(facts, query)).toEqual(
            nativeRules.enactedRuleChangeAt(saved, query),
          );
        }
      }
      for (const answer of ["yes", "no"] as const)
        for (const disposition of ["yea", "nay"] as const) {
          const saved = {
            ...world,
            history: {
              ...world.history,
              legislativeMeasures: [
                {
                  ...measure,
                  propositionAnswers: [{ propositionId: q.id, answer }],
                },
              ],
              legislativeVotes: [
                {
                  ...vote,
                  dispositions: [
                    {
                      memberKey: "fixture:subject",
                      personId: base.personId,
                      disposition,
                    },
                  ],
                },
              ],
            },
          };
          const facts = issueFacts(saved);
          expect(issueRecordFor(facts, base.personId)).toEqual(
            nativeIssue.issueRecordFor(saved, base.personId),
          );
          expect(issueStandingsFor(facts, base.personId)).toEqual(
            nativeIssue.issueStandingsFor(saved, base.personId),
          );
          expect(
            judgeIssueRecord(facts, base.personId, base.jurisdictionId),
          ).toEqual(
            nativeIssue.judgeIssueRecord(
              saved,
              base.personId,
              base.jurisdictionId,
            ),
          );
        }
    },
  );
});
