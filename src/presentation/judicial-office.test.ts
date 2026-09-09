import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { initializeJudicialOfficePractice } from "../simulation/judicial-office-start";
import {
  completeJudicialOfficeFollowUp,
  judicialOfficeContexts,
  respondToJudicialOfficeWork,
  receiveJudicialOfficeWork,
} from "../simulation/judicial-office-work";
import {
  projectJudicialOffice,
  receiveNextJudicialOfficeWork,
} from "./judicial-office";
import { addSimulationMinutes } from "../simulation/dates";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";

describe("judicial Work feature adapter on a production life", () => {
  it.each(["SEED-41", "SEED-42", "SEED-43", "SEED-50", "SEED-59"] as const)(
    "keeps one generated person and saved World through %s and its follow-up",
    (kernelId) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "jud-work2-production",
        startKind: "custom",
        startAge: 40,
        depth: "summarize-earlier-life",
      });
      const before = serializeWorld(game.world);
      expect(judicialOfficeContexts(game.world)).toEqual([]);
      const start = initializeJudicialOfficePractice(game.world, {
        mode: "custom",
        jurisdictionId: game.place.context.jurisdiction.id,
      });
      if (!start.ok) throw new Error(start.reason);
      expect(serializeWorld(game.world)).toBe(before);
      expect(start.world.people[game.playerPersonId]).toBe(
        game.world.people[game.playerPersonId],
      );
      const courtId = judicialOfficeContexts(start.world)[0]!
        .courtOrganizationId;
      let world = start.world;
      {
        const received = receiveJudicialOfficeWork(
          world,
          courtId,
          kernelId,
          addSimulationMinutes(world.currentMoment, 10),
        );
        if (!received.ok) throw new Error(received.reason);
        world = received.world;
        const snap = serializeWorld(world);
        const view = projectJudicialOffice(world, courtId)!;
        expect(serializeWorld(world)).toBe(snap);
        const assignment = view.assignments.find(
          (a) => a.state.status === "active",
        )!;
        expect(assignment.participants.every((p) => world.people[p.id])).toBe(
          true,
        );
        const response = respondToJudicialOfficeWork(
          world,
          courtId,
          assignment.item.id,
          assignment.content.responses[0]!.key,
        );
        if (!response.ok) throw new Error(response.reason);
        world = deserializeWorld(serializeWorld(response.world));
        const follow = projectJudicialOffice(world, courtId)!.followUps.find(
          (f) => f.state.status === "active",
        )!;
        expect(receiveNextJudicialOfficeWork(world, courtId).ok).toBe(false);
        const preparation = world.history.scheduledActivities.find(
          (a) => a.id === follow.state.scheduledActivityId,
        )!;
        expect(preparation.participantPersonIds).toEqual([game.playerPersonId]);
        const contactsBeforePreparation =
          world.history.relationshipInteractions.length;
        const done = completeJudicialOfficeFollowUp(
          world,
          courtId,
          follow.item.id,
        );
        if (!done.ok) throw new Error(done.reason);
        world = deserializeWorld(serializeWorld(done.world));
        expect(world.history.relationshipInteractions).toHaveLength(
          contactsBeforePreparation,
        );
        const note = world.history.evidenceArtifacts.at(-1)!;
        expect(note.evidenceKind).toBe("record:office-preparation-note");
        expect(world.history.evidenceDiscoveries.at(-1)?.personId).toBe(
          game.playerPersonId,
        );
        expect(
          projectJudicialOffice(world, courtId)!.followUps.find(
            (f) => f.item.id === follow.item.id,
          )!.state.status,
        ).toBe("completed");
        expect(
          completeJudicialOfficeFollowUp(world, courtId, follow.item.id).world,
        ).toBe(world);
      }
      expect(projectJudicialOffice(world, courtId)!.assignments).toHaveLength(
        1,
      );
      expect(world.history.decisionTraces).toEqual(
        game.world.history.decisionTraces,
      );
    },
  );
});
