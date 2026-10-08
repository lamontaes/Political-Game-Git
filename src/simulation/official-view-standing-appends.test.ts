import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "./life-places";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { officialOpinionSubject } from "./political-opinion-subjects";
import { viewOfOfficial } from "./official-view-reads";
import type { PrivateBeliefRecord, World } from "./types";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
} from "./political-belief-formation";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { createStableId } from "./ids";

describe("official standing follows appends without changing older worlds", () => {
  const places = lifePlaceStateIdentities();
  it("covers all 56 jurisdictions", () => expect(places).toHaveLength(56));
  it.each(places)(
    "keeps branches and historical cutoffs in $jurisdictionKey",
    (place) => {
      const initial = smallWorld({ place: place.jurisdictionKey }).world;
      const [, personId, officialId] = initial.personOrder;
      const input = {
        stableKey: "standing-append:first",
        personId: personId!,
        propositionId: null,
        subject: officialOpinionSubject(officialId!),
        formedAt: initial.currentDate,
        position: "support" as const,
        conviction: "moderate" as const,
        salience: "high" as const,
        flexibility: "open" as const,
        rationale: null,
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      };
      const read = (world: World) =>
        viewOfOfficial(world, personId!, officialId!);
      expect(read(initial).belief).toBeNull();
      const first = recordPrivateBelief(initial, input);
      const prior = read(first).belief!;
      const continuation = { ...input, supersedesBeliefId: prior.id };
      const left = recordPrivateBelief(first, {
        ...continuation,
        stableKey: "standing-append:left",
        position: "oppose",
      });
      const leftBelief = read(left).belief!;
      const right = recordPrivateBelief(first, {
        ...continuation,
        stableKey: "standing-append:right",
        position: "conflicted",
      });
      const rightBelief = read(right).belief!;
      for (const [world, belief, points] of [
        [left, leftBelief, -20],
        [right, rightBelief, 0],
        [first, prior, 20],
      ] as const) {
        expect(read(world)).toMatchObject({ belief, points });
        expect(
          viewOfOfficial(world, personId!, officialId!, {
            asOfDate: world.currentDate,
            historySequenceExclusive: belief.sequence,
          }).belief,
        ).toBe(world === first ? null : prior);
      }
      expect(read(initial).belief).toBeNull();
      expect(() =>
        recordPrivateBelief(left, {
          ...continuation,
          stableKey: "standing-append:stale",
        }),
      ).toThrow(/supersession/i);
      const expected = (world: World): PrivateBeliefRecord | null =>
        world.history.privateBeliefs
          .filter(
            (row) =>
              row.personId === personId &&
              row.subject?.kind === "official" &&
              row.subject.personId === officialId,
          )
          .at(-1) ?? null;
      for (const world of [right, first, left, initial])
        expect(read(world).belief).toBe(expected(world));
      const observed = recordWorldEvent(initial, {
        stableKey: "standing-append:observed",
        type: "people.law-reflection",
        occurredAt: initial.currentDate,
        recordedAt: initial.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [personId!, officialId!],
        participants: [
          { personId: personId!, role: "focus:subject", detail: null },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: ["people.official-view"],
        summary: "An explicit recorded reflection for this integrity case.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const event = observed.history.events.at(-1)!;
      const proposal = evaluatePoliticalBeliefFormation(observed, {
        stableKey: "standing-append:formed",
        personId: personId!,
        subject: officialOpinionSubject(officialId!),
        randomness: "none",
        beliefDimensions: {
          conviction: "moderate",
          salience: "high",
          flexibility: "open",
        },
        factors: [
          {
            stableKey: "standing-append:authored-reason",
            favors: "support",
            sourceType: "information:lived-outcome",
            importance: "strong",
            confidence: "high",
            explanation: "An explicit authored reason for this integrity case.",
            sourceRefs: [{ kind: "historical-event", eventId: event.id }],
          },
        ],
      });
      const formed = applyNpcPoliticalBeliefFormation(observed, proposal);
      const formedBelief = read(formed).belief!;
      expect(formedBelief.position).toBe("support");
      const trace = formed.history.decisionTraces.at(-1)!;
      expect(formedBelief.formation.decisionTraceIds).toEqual([trace.id]);
      expect(trace.context.actorPersonId).toBe(personId);
      expect(() => assertWorldIntegrity(formed)).not.toThrow();
      const missingTrace = createStableId(
        "decision-trace",
        "standing-append:missing",
      );
      const invalid: World = {
        ...formed,
        history: {
          ...formed.history,
          privateBeliefs: formed.history.privateBeliefs.map((belief) =>
            belief === formedBelief
              ? {
                  ...belief,
                  formation: {
                    ...belief.formation,
                    decisionTraceIds: [missingTrace],
                  },
                }
              : belief,
          ),
        },
      };
      expect(() => assertWorldIntegrity(invalid)).toThrow(
        /unavailable decision trace/,
      );
    },
  );
});
