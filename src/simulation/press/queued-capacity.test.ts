import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createWorkItem, lapseWorkItem } from "../time-work";
import { recordWorldEvent, assertWorldIntegrity } from "../world";
import {
  assignStory,
  ensurePressDeskSchedule,
  latestDisposition,
  pressDeskSweepHandler,
  recordStoryLead,
  PRESS_DESK_SWEEP_TRANSITION_KEY,
} from "./desk";
import {
  ensurePressMediaOpening,
  mediaOutlets,
  reporterRoles,
} from "./outlets";
import { reporterWorkBudget, storyWorkItem } from "./story-work";
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `overflow5-a154-queued-all56:${index}`;
  return { seed, place: drawRandomPlace(seed) };
});
describe.each(samples)(
  "queued recorded capacity in $place.displayName ($seed)",
  ({ seed, place }) => {
    function fixture() {
      const small = smallWorld({ place: place.key, seed });
      let world = ensurePressMediaOpening(small.world, small.personId);
      const outlet = mediaOutlets(world)[0]!;
      const reporter = reporterRoles(world, outlet.id)[0]!;
      if (!outlet || !reporter)
        throw new Error("No saved opening outlet/reporter.");
      world = recordWorldEvent(world, {
        stableKey: `${seed}:public-source`,
        type: "fixture.public-reporting-source",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: small.jurisdictionId,
        involvedEntityIds: [small.personId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: ["fixture"],
        summary: "Controlled public event for a recorded reporting lead.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const source = world.history.events.at(-1)!;
      const recorded = recordStoryLead(world, {
        stableKey: `${seed}:lead`,
        outletId: outlet.id,
        family: "scheduled-beat",
        route: "public-record",
        basisEventIds: [source.id],
        subjectPersonIds: [small.personId],
        jurisdictionId: small.jurisdictionId,
        matterId: null,
        followsPublicationId: null,
      });
      return {
        ...small,
        world: recorded.world,
        reporter,
        lead: recorded.lead,
        source,
      };
    }

    it("retries the saved lead after canonical reservations lapse, including reload", () => {
      const f = fixture();
      let world = f.world;
      const reservations = [];
      for (const reporter of reporterRoles(world, f.lead.outletId)) {
        const budget = reporterWorkBudget(world, reporter)!;
        world = createWorkItem(world, {
          stableKey: `${seed}:reserved:${reporter.id}`,
          title: "Existing reporting task",
          summary: "Authored open task reserves recorded job hours.",
          jurisdictionId: f.jurisdictionId,
          sourceEntityIds: [f.source.id, reporter.workRelationshipId],
          focus: {
            kind: "other",
            targetKey: "fixture:reporting",
            sourceEntityId: f.source.id,
          },
          effort: {
            kind: "authored-duration",
            requiredMinutes: budget.availableMinutes.minimum,
          },
          access: { kind: "private", personIds: [reporter.personId] },
          assignedPersonIds: [reporter.personId],
          playerRequirement: "none",
          waitingOnPersonIds: [],
          blocker: null,
          scheduledActivityId: null,
        });
        reservations.push(world.history.workItems.at(-1)!);
      }
      world = assignStory(world, f.lead.id);
      expect(latestDisposition(world, f.lead.id)?.decision).toBe("queued");
      expect(storyWorkItem(world, f.lead.id)).toBeNull();
      world = ensurePressDeskSchedule(world);
      const due = world.history.futureDueItems.find(
        (item) => item.transitionKey === PRESS_DESK_SWEEP_TRANSITION_KEY,
      )!;
      const blocked = pressDeskSweepHandler(world, due).world;
      expect(latestDisposition(blocked, f.lead.id)?.decision).toBe("queued");
      expect(storyWorkItem(blocked, f.lead.id)).toBeNull();
      // The next canonically scheduled sweep excludes the original event.
      const later = blocked.history.futureDueItems.find(
        (item) => item.stableKey === "press46:desk-sweep:1",
      )!;
      world = blocked;
      for (const item of reservations)
        world = lapseWorkItem(world, {
          workItemId: item.id,
          stableKey: `${item.stableKey}:lapsed`,
          summary: "The fixture task window ended without work.",
        });
      const loaded = deserializeWorld(serializeWorld(world));
      const beforeStaff = loaded.history.workRelationships;
      const after = pressDeskSweepHandler(loaded, later).world;
      expect(latestDisposition(after, f.lead.id)?.decision).not.toBe("queued");
      expect(storyWorkItem(after, f.lead.id)).not.toBeNull();
      expect(after.history.workRelationships).toBe(beforeStaff);
      expect(after.people).toEqual(loaded.people);
      assertWorldIntegrity(after);
      const saved = deserializeWorld(serializeWorld(after));
      const nextSweep = saved.history.futureDueItems.find(
        (item) => item.stableKey === "press46:desk-sweep:2",
      )!;
      const repeated = pressDeskSweepHandler(saved, nextSweep).world;
      expect(storyWorkItem(repeated, f.lead.id)?.id).toBe(
        storyWorkItem(saved, f.lead.id)?.id,
      );
      expect(repeated.history.workItems.length).toBe(
        saved.history.workItems.length,
      );
    });
  },
);
