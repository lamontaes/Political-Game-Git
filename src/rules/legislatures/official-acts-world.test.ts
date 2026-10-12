import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { recordWorldEvent } from "../../simulation/world";
import {
  recordPrivateBelief,
  recordPublicPosition,
  createFormationContext,
} from "../../simulation/politics";
import { recordEventKnowledge } from "../../simulation/records";
import { createStableId } from "../../simulation/ids";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
} from "../../simulation/public-information-integrity";
import { recordStoryHeardOfficialViews } from "../../simulation/living-world/official-views";
import * as formation from "../../simulation/political-belief-formation";
import * as press from "../../simulation/press/store";
import {
  officialActsInEvent,
  type OfficialFactorFacts,
} from "./official-factors";
import type { World, PublicationRecord } from "../../simulation/types";
// Press production is parked. Authored publication/lead receipts enter the
// existing consumer; native public positions and knowledge supply the basis.
// No assertion claims that this is a generated story or a press port.
describe("legislatures: private official-act extraction through the story consumer", () => {
  it.each(Object.keys(STATES))(
    "matches the native consumer in %s",
    (place) => {
      let world: World = smallWorld({
        place: `US-${place}`,
        seed: `rules2-official-acts:${place}`,
      }).world;
      const [listener, official, other] = world.personOrder,
        propositionId = world.policyCatalog.propositionOrder[0]!;
      world = recordPrivateBelief(world, {
        stableKey: `rules2:${place}:prior`,
        personId: listener!,
        propositionId,
        formedAt: world.currentDate,
        position: "support",
        conviction: "moderate",
        salience: "moderate",
        flexibility: "open",
        rationale: "Authored consumer view.",
        formation: createFormationContext("experience:life", {
          note: "Explicit consumer edge.",
        }),
        supersedesBeliefId: null,
      });
      world = recordWorldEvent(world, {
        stableKey: `rules2:${place}:basis`,
        type: "fixture.official-acts",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [listener!, official!, other!],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        summary: "Authored act basis.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
        tags: [],
      });
      const event = world.history.events.at(-1)!;
      for (const [index, id] of [official!, other!].entries())
        world = recordPublicPosition(world, {
          stableKey: `rules2:${place}:position:${index}`,
          personId: id,
          propositionId,
          statedAt: world.currentDate,
          stance: index === 0 ? "support" : "oppose",
          statement: "Authored recorded act.",
          audience: "public",
          venue: null,
          sourceEventId: event.id,
          supersedesPublicPositionId: null,
        });
      world = recordEventKnowledge(world, {
        stableKey: `rules2:${place}:knowledge`,
        personId: listener!,
        eventId: event.id,
        learnedAt: world.currentDate,
        believedSummary: "Authored known act.",
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "told-by", sourcePersonId: official!, claimId: null },
      });
      const known = world.history.knowledge.at(-1)!,
        leadId = createStableId("press-record", `rules2:${place}:lead`),
        storyId = createStableId("event", `rules2:${place}:story`),
        publicationId = createStableId(
          "publication",
          `rules2:${place}:edition`,
        );
      const publication: PublicationRecord = {
        id: publicationId,
        stableKey: `rules2:${place}:edition`,
        sequence: known.sequence,
        kind: "press-story",
        sourceEventId: storyId,
        sourceRecordIds: [],
        jurisdictionId: null,
        outletKey: "civic-ledger",
        outletName: "Authored outlet receipt",
        headline: "Authored story receipt",
        body: "Consumer input only.",
        publishedAt: world.currentDate,
        recordedAt: world.currentDate,
        correctsPublicationId: null,
        correctionNote: null,
      };
      const knowledge = {
        ...known,
        id: createStableId("knowledge", `rules2:${place}:media-receipt`),
        stableKey: `rules2:${place}:media-receipt`,
        sequence: known.sequence + 2,
        eventId: storyId,
        source: {
          kind: "media" as const,
          outlet: "Authored outlet receipt",
          reference: publicationId,
        },
      };
      const story = {
        ...event,
        id: storyId,
        sequence: known.sequence + 1,
        type: PRESS_STORY_EVENT_TYPE,
        tags: [`${PRESS_STORY_LEAD_TAG}${leadId}`],
      };
      world = {
        ...world,
        history: {
          ...world.history,
          nextSequence: knowledge.sequence + 1,
          events: [...world.history.events, story],
          publications: [...(world.history.publications ?? []), publication],
          knowledge: [...world.history.knowledge, knowledge],
        },
      };
      const acts = officialActsInEvent(
        {
          publicPositions: world.history.publicPositions,
          actions: world.history.legislativeActions ?? [],
          votes: world.history.legislativeVotes ?? [],
          measures: world.history.legislativeMeasures ?? [],
        } as OfficialFactorFacts,
        event.id,
        knowledge,
      );
      expect(acts).toHaveLength(2);
      const inputReceipts: Parameters<
        typeof formation.evaluatePoliticalBeliefFormation
      >[1][] = [];
      const original = formation.evaluatePoliticalBeliefFormation;
      const selected = vi
        .spyOn(formation, "evaluatePoliticalBeliefFormation")
        .mockImplementation((at, input) => {
          inputReceipts.push(input);
          return original(at, input);
        });
      const noNewBeliefs = vi
        .spyOn(formation, "applyNpcPoliticalBeliefFormation")
        .mockImplementation((at) => at);
      const lead = vi
        .spyOn(press, "pressRecordsOfKind")
        .mockImplementation((_at, kind) =>
          kind === "story-lead"
            ? ([
                { id: leadId, basisEventIds: [event.id] },
              ] as unknown as ReturnType<typeof press.pressRecordsOfKind>)
            : [],
        );
      try {
        recordStoryHeardOfficialViews(world, knowledge.id);
        const nonwitness = {
          ...world,
          history: {
            ...world.history,
            events: world.history.events.map((row) =>
              row.id === event.id
                ? {
                    ...row,
                    involvedEntityIds: row.involvedEntityIds.filter(
                      (id) => id !== listener,
                    ),
                  }
                : row,
            ),
          },
        };
        expect(
          officialActsInEvent(
            {
              publicPositions: nonwitness.history.publicPositions,
              actions: [],
              votes: [],
              measures: [],
            } as unknown as OfficialFactorFacts,
            event.id,
            knowledge,
          ),
        ).toEqual(acts);
        expect(() =>
          recordStoryHeardOfficialViews(nonwitness, knowledge.id),
        ).toThrow(`Unavailable historical-event source: ${event.id}`);
      } finally {
        selected.mockRestore();
        noNewBeliefs.mockRestore();
        lead.mockRestore();
      }
      expect(
        inputReceipts.slice(0, 2).map((input) => ({
          officialId:
            input.subject?.kind === "official" ? input.subject.personId : null,
          favors: input.factors![0]!.favors,
          stableKey: input.factors![0]!.stableKey,
        })),
      ).toEqual(
        acts.map((act) => ({
          officialId: act.officialId,
          favors: act.stance === "support" ? "support" : "opposition",
          stableKey: `story-official-act:${knowledge.id}:${event.id}:${act.officialId}:${act.propositionId}`,
        })),
      );
    },
    30000,
  );
});
