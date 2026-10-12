import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { currentStateExecutiveHolders } from "../../simulation/nationwide-world/state-executives";
import { activeCareResponsibilitiesAt } from "../../simulation/life-queries";
import { createCareResponsibility } from "../../simulation/life";
import { recordWorldEvent } from "../../simulation/world";
import {
  appendCrisisRecord,
  crisisRecords,
  assertCrisisIntegrity,
} from "../../simulation/crisis/records";
import {
  mortalityCalibrationOf,
  hazardMultipliersOf,
} from "../../simulation/crisis/mortality";
import table from "../../simulation/crisis/ssa-2023-period-life-table.json";
import {
  ensurePeopleTraitCatalog,
  ensurePeopleTraits,
} from "../../simulation/people-traits";
import { registeredTraitConsiderations } from "../../simulation/trait-readings";
import { traitRegistryFor } from "../../simulation/trait-registry";
import { ANOTHER_TERM_DECISION } from "../../simulation/careers/another-term-decision";
import * as native from "../../simulation/careers/another-term";
import {
  evaluateDecision,
  recordDurableDecisionTrace,
} from "../../simulation/decisions";
import {
  chanceOfDyingBefore,
  lifeWeighsAgainstOffice,
  careReceiptKey,
  type OfficeLifeFacts,
} from "./office-life";
import {
  prepareAnotherTerm,
  completeAnotherTerm,
  anotherTermReceiptKey,
  type AnotherTermFacts,
} from "./another-term";
import type {
  World,
  EntityId,
  IsoDate,
  DecisionConsideration,
} from "../../simulation/types";
function lifeFacts(world: World, dates: readonly IsoDate[]): OfficeLifeFacts {
  return {
    people: world.people,
    nextSequence: world.history.nextSequence,
    crisisRecords: crisisRecords(world),
    table: table.rows,
    categories: new Map(
      world.personOrder.map((id) => [id, mortalityCalibrationOf(world, id)]),
    ),
    multipliers: new Map(
      world.personOrder.map((id) => [id, hazardMultipliersOf(world, id)]),
    ),
    care: new Map(
      world.personOrder.flatMap((id) =>
        dates.map((asOfDate) => {
          const cutoff = {
            asOfDate,
            historySequenceExclusive: world.history.nextSequence,
          };
          return [
            careReceiptKey(id, cutoff),
            activeCareResponsibilitiesAt(world, id, cutoff),
          ] as const;
        }),
      ),
    ),
  };
}
const provenance = {
  kind: "authored" as const,
  note: "Labeled saved health/care and office-decision control; not ordinary illness or political play.",
};
function episode(
  world: World,
  personId: EntityId,
  severity: "acute" | "serious" | "chronic",
  micros: number,
) {
  let next = recordWorldEvent(world, {
    stableKey: "rules2:life:event:" + severity,
    type: "health.saved-control",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:patient", detail: null }],
    tags: ["authored:rules2-life-control"],
    summary: "Saved health-reader control.",
    visibility: "public",
    personFactConstraints: [],
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = appendCrisisRecord(next, {
    kind: "health-episode",
    stableKey: "rules2:life:episode:" + severity,
    effectiveAt: next.currentDate,
    causalParentIds: [],
    visibility: "public",
    eventId: next.history.events.at(-1)!.id,
    personId,
    label: "simulation-episode",
    conditionKey: null,
    severity,
    origin: { kind: "authored", note: provenance.note },
    hazardMultiplierMicros: micros,
    hazardBasis: "Explicit saved multiplier control",
    course: [],
  });
  assertCrisisIntegrity(next);
  return next;
}
describe("economy private health/aging/reason rank through native public life and another-term owners", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        offices: ["governor"],
        seed: "rules2:economy:life:" + usps,
      });
      const holder = currentStateExecutiveHolders(base.world).find(
        (h) => h.stateUsps === usps,
      );
      const personId = holder?.personId ?? base.personId;
      const dates = [
        addDays(base.world.currentDate, -1),
        base.world.currentDate,
      ];
      const untils = [
        base.world.currentDate,
        addDays(base.world.currentDate, 1),
        addDays(base.world.currentDate, 366),
        addDays(base.world.currentDate, 1461),
      ];
      const checkLife = (world: World) => {
        const facts = lifeFacts(world, dates);
        for (const from of dates)
          for (const until of untils) {
            expect(chanceOfDyingBefore(facts, personId, from, until)).toEqual(
              native.chanceOfDyingBefore(world, personId, from, until),
            );
            const input = {
              personId,
              keyPrefix: "rules2:life:reader",
              onDate: from,
              termEnds: until,
              optionKey: "step-down",
            };
            expect(lifeWeighsAgainstOffice(facts, input)).toEqual(
              native.lifeWeighsAgainstOffice(world, input),
            );
          }
      };
      checkLife(base.world);
      for (const age of [55, 80, 95, 125]) {
        // Read-only saved-age boundary; never used as ordinary governor biology or committed through a World writer.
        const world = {
          ...base.world,
          people: {
            ...base.world.people,
            [personId]: {
              ...base.world.people[personId]!,
              birthDate: makeIsoDate(`${2026 - age}-01-05`),
            },
          },
        };
        checkLife(world);
      }
      for (const category of ["male", "female", "equal-mixture"] as const) {
        const world = appendCrisisRecord(base.world, {
          kind: "mortality-calibration",
          stableKey: "rules2:life:category:" + category,
          effectiveAt: base.world.currentDate,
          causalParentIds: [],
          visibility: "public",
          eventId: null,
          personId,
          category,
          basis: "Labeled source-category control",
        });
        checkLife(world);
      }
      const recipient = base.world.personOrder.find((id) => id !== personId)!;
      let world = createCareResponsibility(base.world, {
        stableKey: "rules2:life:care",
        caregiverPersonId: personId,
        recipientPersonId: recipient,
        startedAt: base.world.currentDate,
        kind: "personal:family",
        share: "primary",
        context: "Saved care control",
        timeDemand: {
          expectedWeekly: { minimumHours: 5, maximumHours: 10 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: base.jurisdictionId,
        },
        provenance,
      });
      world = episode(world, personId, "chronic", 2000000);
      checkLife(world);
      const episodeId = crisisRecords(world).at(-1)!.id;
      for (const state of [
        "serious",
        "temporarily-incapacitated",
        "prognosis-limited",
        "recovering",
        "recovered",
      ] as const) {
        world = appendCrisisRecord(world, {
          kind: "health-state",
          stableKey: "rules2:life:state:" + state,
          effectiveAt: world.currentDate,
          causalParentIds: [episodeId],
          visibility: "public",
          eventId: null,
          episodeId,
          personId,
          state,
          functionalLimitation: "none",
          capacityRecordId: null,
        });
        assertCrisisIntegrity(world);
        checkLife(world);
      }
      // Common actor-profile and trace writers stay native; the entire owned decision context and private reason rank are compared.
      const preparedWorld = ensurePeopleTraits(
        ensurePeopleTraitCatalog(world),
        [personId],
        world.currentDate,
      );
      const serving: DecisionConsideration[] = [
        {
          stableKey: "rules2:life:serving",
          optionKey: "seek",
          sourceType: "context:office",
          direction: "supports",
          importance: "moderate",
          confidence: "high",
          explanation: "Saved current-office consideration.",
          sourceRefs: [],
        },
      ];
      const input = {
        personId,
        traitsPrepared: true,
        stableKey: "rules2:life:decision",
        subjectKey: holder?.termId ?? personId,
        onDate: preparedWorld.currentDate,
        termEnds: addDays(preparedWorld.currentDate, 1461),
        serving,
        decisionType: ANOTHER_TERM_DECISION.id,
      };
      const key = anotherTermReceiptKey(input);
      const facts: AnotherTermFacts = {
        life: lifeFacts(preparedWorld, dates),
        traces: preparedWorld.history.decisionTraces,
        pressReceipts: new Map([
          [
            key,
            native.resignationPressureConsiderations(preparedWorld, {
              personId,
              keyPrefix: input.stableKey,
              onDate: input.onDate,
            }),
          ],
        ]),
        traitReceipts: new Map([
          [
            key,
            registeredTraitConsiderations(
              preparedWorld,
              traitRegistryFor(preparedWorld),
              personId,
              input.stableKey,
              ANOTHER_TERM_DECISION.id,
            ),
          ],
        ]),
      };
      const prepared = prepareAnotherTerm(facts, input);
      expect(prepared.status).toBe("decision");
      if (prepared.status !== "decision")
        throw Error("Missing decision control");
      const evaluation = evaluateDecision(preparedWorld, prepared.context);
      const ownWorld = recordDurableDecisionTrace(preparedWorld, evaluation);
      const actual = native.decideAnotherTerm(preparedWorld, input);
      expect(ownWorld.history.decisionTraces).toEqual(
        actual.world.history.decisionTraces,
      );
      expect(
        completeAnotherTerm(
          prepared,
          evaluation.selectedOptionKey,
          ownWorld.history.decisionTraces.at(-1)!.id,
        ),
      ).toEqual({
        seeks: actual.seeks,
        decisionTraceId: actual.decisionTraceId,
        reason: actual.reason,
      });
      expect(
        prepareAnotherTerm(
          {
            ...facts,
            life: lifeFacts(actual.world, dates),
            traces: actual.world.history.decisionTraces,
          },
          input,
        ),
      ).toEqual({
        status: "already-decided",
        seeks: actual.seeks,
        decisionTraceId: actual.decisionTraceId,
        reason: actual.reason,
      });
    });
});
