import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { recordWorldEvent } from "../world";
import {
  CONSTITUENT_CASE_REFLECTION_PREFIX,
  OFFICIAL_VIEW_TRANSITION_KEY,
  scheduleConstituentCaseReflection,
} from "../law-exposure";
import {
  officialViewReflectionHandler,
  viewOfOfficial,
} from "./official-views";

const SEED = "b06-constituent-reflection-identities";
const PLACE = drawRandomPlace(SEED);

describe(`constituent case reflection in a new ${PLACE.displayName} game`, () => {
  it("records the resident's actual case knowledge in their view formation", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const nonPlayerIds = game.world.personOrder.filter(
      (personId) => personId !== game.playerPersonId,
    );
    const residentId = nonPlayerIds[0]!;
    const officialId = nonPlayerIds[1]!;
    expect(residentId).toBeDefined();
    expect(officialId).toBeDefined();

    for (const answer of ["help", "ignore"] as const) {
      const closedWorld = recordWorldEvent(game.world, {
        stableKey: "fixture:constituent-case-closed:" + answer,
        type: "office.case-closed",
        occurredAt: game.world.currentDate,
        recordedAt: game.world.currentDate,
        jurisdictionId: game.world.people[residentId]!.homeJurisdictionId,
        involvedEntityIds: [residentId, officialId],
        participants: [
          { personId: residentId, role: "focus:subject", detail: null },
          { personId: officialId, role: "focus:object", detail: null },
        ],
        personFactConstraints: [],
        visibility: "limited",
        tags: ["answer:" + answer],
        summary: "The office recorded " + answer + " for the resident's case.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const closed = closedWorld.history.events.at(-1)!;
      const scheduled = scheduleConstituentCaseReflection(
        closedWorld,
        residentId,
        officialId,
        closed.id,
      );
      const stableKey = CONSTITUENT_CASE_REFLECTION_PREFIX + closed.id;
      const dueItem = scheduled.history.futureDueItems.find(
        (item) => item.stableKey === stableKey,
      )!;
      expect(dueItem.transitionKey).toBe(OFFICIAL_VIEW_TRANSITION_KEY);

      const reflected = officialViewReflectionHandler(scheduled, dueItem).world;
      const knowledge = reflected.history.knowledge.find(
        (item) => item.personId === residentId && item.eventId === closed.id,
      );
      const belief = viewOfOfficial(reflected, residentId, officialId).belief;
      const reflection = reflected.history.events.find(
        (event) =>
          event.stableKey ===
          "official-view:constituent-case-reflection:" + closed.id,
      );

      expect(knowledge).toBeDefined();
      expect(reflection).toBeDefined();
      expect(belief?.formation.eventKnowledgeIds).toContain(knowledge!.id);
      expect(belief?.formation.relevantEventIds).toContain(closed.id);
      expect(belief?.formation.relevantEventIds).toContain(reflection!.id);
      expect(belief?.position).toBe(answer === "help" ? "support" : "oppose");
      process.stdout.write(
        JSON.stringify({
          receipt: "P1 constituent reflection knowledge identity",
          seed: SEED,
          place: PLACE.displayName,
          answer,
          residentId,
          officialId,
          closedCaseEventId: closed.id,
          reflectionEventId: reflection!.id,
          knowledgeId: knowledge!.id,
          eventKnowledgeIds: belief!.formation.eventKnowledgeIds,
          view: belief!.position,
        }) + "\n",
      );
    }
  }, 240_000);
});
