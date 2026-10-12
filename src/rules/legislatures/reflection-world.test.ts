import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { lawInForce } from "../../simulation/governing/law-in-force";
import { recordWorldEvent } from "../../simulation/world";
import {
  recordLawExposure,
  recordHeardExposure,
  officialViewReflectionKey,
  scheduleLivedOutcomeReflection,
  livedOutcomeReflectionKey,
} from "../../simulation/law-exposure";
import * as native from "../../simulation/living-world/official-views";
import * as formation from "../../simulation/political-belief-formation";
import { viewOfOfficial } from "../../simulation/official-view-reads";
import { affiliationAt } from "../../simulation/living-world/party-evolution";
import { latestPersonalityTendency } from "../../simulation/queries";
import { SYNTHETIC_MIND_IDS } from "../../simulation/mind-catalog";
import { readRelationshipStanding } from "../../simulation/relationship-standing";
import { LIVED_OUTCOME_SUMMARY } from "../../simulation/living-world/lived-outcomes";
import * as outcomes from "../../simulation/living-world/lived-outcomes";
import { createStableId } from "../../simulation/ids";
import {
  lawFactor,
  outcomeFactor,
  legacyFactor,
  salienceFor,
  reactionLens,
  heardShare,
  type OfficialFactorFacts,
} from "./official-factors";
import type { World } from "../../simulation/types";

function facts(world: World): OfficialFactorFacts {
  return {
    onDate: world.currentDate,
    publicPositions: world.history.publicPositions,
    actions: world.history.legislativeActions ?? [],
    votes: world.history.legislativeVotes ?? [],
    measures: world.history.legislativeMeasures ?? [],
    legacyViews: world.history.officialViews ?? [],
    events: world.history.events,
    knowledge: world.history.knowledge,
    parties: new Map(
      world.personOrder.map((id) => [
        id,
        affiliationAt(world, id).partyOrganizationId,
      ]),
    ),
    warmth: new Map(
      world.personOrder.flatMap((a) =>
        world.personOrder
          .filter((b) => a !== b)
          .map(
            (b) =>
              [
                `${a}:${b}`,
                readRelationshipStanding(world, a, b).readings.warmth.band,
              ] as const,
          ),
      ),
    ),
    tempo: new Map(
      world.personOrder.flatMap((id) => {
        const row = latestPersonalityTendency(
          world,
          id,
          SYNTHETIC_MIND_IDS.tendencies.responseTempo,
        );
        return row ? [[id, row] as const] : [];
      }),
    ),
    conflict: new Map(
      world.personOrder.flatMap((id) => {
        const row = latestPersonalityTendency(
          world,
          id,
          SYNTHETIC_MIND_IDS.tendencies.conflictApproach,
        );
        return row ? [[id, row] as const] : [];
      }),
    ),
    outcomeSummaries: LIVED_OUTCOME_SUMMARY,
    resourcePositions: world.history.resourcePositions,
    resourceFlows: world.history.resourceFlows,
    transferOutcomes: world.history.resourceTransferOutcomes,
  };
}
describe("legislatures: official factors through the native belief pipeline", () => {
  let reflected = 0;
  afterAll(() => expect(reflected).toBeGreaterThan(0));
  it.each(Object.keys(STATES))(
    "matches law factor and held-view salience from the same World in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-reflection:${place}`,
        offices: ["governor"],
      });
      let world: World = { ...base.world, control: { kind: "observer" } };
      const law = world.policyCatalog.propositionOrder
        .map((id) =>
          lawInForce(world, stateJurisdictionForKey(`US-${place}`)!.id, id),
        )
        .find((row) => row?.origin === "in-force-at-start");
      expect(law).toBeDefined();
      const personId = base.personId;
      // The event and exposure are explicit effect-edge controls. Existing native
      // writers supply records; no ordinary law effect or new outcome producer is claimed.
      world = recordWorldEvent(world, {
        stableKey: `rules2:${place}:reflection-source`,
        type: "fixture.law-effect",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: base.jurisdictionId,
        involvedEntityIds: [personId],
        participants: [{ personId, role: "focus:subject", detail: null }],
        personFactConstraints: [],
        visibility: "private",
        tags: ["authored-effect-edge"],
        summary: "Authored non-money effect",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const sourceRecordId = world.history.events.at(-1)!.id;
      world = recordLawExposure(world, {
        stableKey: `rules2:${place}:reflection-exposure`,
        personId,
        measureId: law!.measureId,
        channel: "job-rule",
        direction: "cost",
        amount: null,
        cadence: null,
        sourceRecordId,
        includeFamily: false,
      });
      const own = world.history.lawExposures!.at(-1)!;
      world = recordHeardExposure(
        world,
        own,
        world.personOrder.find((id) => id !== personId)!,
      );
      const official = native.officialsBehind(world, law!.measureId)[0]
        ?.officialId;
      if (official) {
        // An explicitly authored old-save row reaches the private legacy factor
        // through the public reflection caller. No producer still writes this table.
        world = {
          ...world,
          history: {
            ...world.history,
            nextSequence: world.history.nextSequence + 1,
            officialViews: [
              ...(world.history.officialViews ?? []),
              {
                id: createStableId(
                  "official-view",
                  `rules2:${place}:legacy-view`,
                ),
                stableKey: `rules2:${place}:legacy-view`,
                sequence: world.history.nextSequence,
                recordedAt: world.currentDate,
                personId,
                officialId: official,
                measureId: law!.measureId,
                exposureId: own.id,
                act: "signed",
                points: -20,
                reasons: [{ kind: "personal", points: -20 }],
              },
            ],
          },
        };
      }
      const snapshot = world;
      for (const id of world.personOrder)
        expect(reactionLens(facts(world), id)).toBe(
          native.reactionLens(world, id),
        );
      for (const exposure of snapshot.history.lawExposures ?? []) {
        expect(heardShare(facts(world), exposure)).toBe(
          native.heardShare(world, exposure),
        );
        const due = world.history.futureDueItems.find(
          (row) => row.stableKey === officialViewReflectionKey(exposure),
        );
        if (!due) continue;
        const at = {
          ...world,
          currentDate: due.dueAt,
          currentMoment: { ...world.currentMoment, date: due.dueAt },
        };
        const original = formation.evaluatePoliticalBeliefFormation;
        const capture = vi
          .spyOn(formation, "evaluatePoliticalBeliefFormation")
          .mockImplementation((before, input) => {
            if (input.stableKey.startsWith(`official-view:${exposure.id}:`)) {
              const act = native
                .officialsBehind(before, exposure.measureId)
                .find((row) => input.stableKey.endsWith(`:${row.officialId}`))!;
              expect(act).toBeDefined();
              const event = before.history.events.at(-1)!;
              const reason = lawFactor(facts(before), exposure, act, event.id)!;
              expect(input.factors![0]).toEqual(reason.factor);
              const prior = viewOfOfficial(
                before,
                exposure.personId,
                act.officialId,
              ).belief;
              const legacy = legacyFactor(
                facts(before),
                exposure.personId,
                act.officialId,
              );
              if (!prior && legacy)
                expect(input.factors).toContainEqual(legacy);
              expect(input.beliefDimensionsByOutcome?.support?.salience).toBe(
                salienceFor(
                  reason.felt,
                  prior,
                  reason.factor.favors === "support",
                ),
              );
              reflected++;
            }
            return original(before, input);
          });
        try {
          world = native.officialViewReflectionHandler(at, due).world;
        } finally {
          capture.mockRestore();
        }
      }
      if (official)
        for (const direction of ["gain", "cost"] as const)
          for (const felt of [
            "unmeasured",
            { share: 0.001, estimated: true },
            { share: 0.1, estimated: false },
          ] as const) {
            // A labeled outcome-reader receipt tests this consumer's arithmetic.
            // It is not an ordinary job-loss event or a new outcome/court producer.
            const outcome: outcomes.LivedOutcome = {
              kind: "job-lost",
              at: snapshot.currentDate,
              sourceRecordId,
              direction,
              felt,
              answeringPersonId: official,
            };
            const scheduled = scheduleLivedOutcomeReflection(
              snapshot,
              personId,
              sourceRecordId,
            );
            const due = scheduled.history.futureDueItems.find(
              (row) =>
                row.stableKey ===
                livedOutcomeReflectionKey(personId, sourceRecordId),
            )!;
            const at = {
              ...scheduled,
              currentDate: due.dueAt,
              currentMoment: { ...scheduled.currentMoment, date: due.dueAt },
            };
            const reader = vi
              .spyOn(outcomes, "livedOutcomesOf")
              .mockReturnValue([outcome]);
            const original = formation.evaluatePoliticalBeliefFormation;
            let calls = 0;
            const capture = vi
              .spyOn(formation, "evaluatePoliticalBeliefFormation")
              .mockImplementation((before, input) => {
                if (
                  input.stableKey.startsWith(
                    `official-view:lived-outcome:${sourceRecordId}:`,
                  )
                ) {
                  const event = before.history.events.at(-1)!;
                  const reason = outcomeFactor(
                    facts(before),
                    personId,
                    official,
                    outcome,
                    event.id,
                  )!;
                  expect(input.factors![0]).toEqual(reason.factor);
                  const prior = viewOfOfficial(
                    before,
                    personId,
                    official,
                  ).belief;
                  const legacy = legacyFactor(
                    facts(before),
                    personId,
                    official,
                  );
                  if (!prior && legacy)
                    expect(input.factors).toContainEqual(legacy);
                  expect(
                    input.beliefDimensionsByOutcome?.support?.salience,
                  ).toBe(salienceFor(reason.felt, prior, direction === "gain"));
                  calls++;
                }
                return original(before, input);
              });
            try {
              try {
                native.officialViewReflectionHandler(at, due);
              } catch (error) {
                // The unchanged shared chooser can reject these authored competing
                // receipts after the consumer supplies its factor. Compare that math
                // before the rejection; never fabricate a selected belief outcome.
                expect((error as Error).message).toBe(
                  "Political belief formation produced no available outcome.",
                );
              }
              expect(calls).toBe(1);
            } finally {
              capture.mockRestore();
              reader.mockRestore();
            }
          }
    },
    30000,
  );
});
