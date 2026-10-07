import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { makeIsoDate } from "./dates";
import {
  favorStandingBetween,
  inferredProtegeOf,
  recordFavor,
  recordRelationshipInteraction,
  recordWorldEvent,
} from "./index";
import type { EntityId } from "./types";

function fixture() {
  let world = createDemoWorld();
  const people = Object.values(world.people).sort((first, second) =>
    first.birthDate.localeCompare(second.birthDate),
  );
  const elderId = people[0]!.id;
  const youngerId = people.at(-1)!.id;
  const witnessId = people[1]!.id;
  const outsiderId = people[2]!.id;
  const eventIds: EntityId[] = [];
  for (const [index, day] of [2, 1].entries()) {
    const occurredAt = makeIsoDate(
      `${world.currentDate.slice(0, 8)}${day.toString().padStart(2, "0")}`,
    );
    world = recordWorldEvent(world, {
      stableKey: `inferred-protege:occasion:${index}`,
      type: "campaign.shared-event",
      occurredAt,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [elderId, youngerId, witnessId],
      participants: [elderId, youngerId, witnessId].map((personId) => ({
        personId,
        role: "presence:participant" as const,
        detail: null,
      })),
      personFactConstraints: [],
      visibility: "public",
      tags: ["campaign"],
      summary: "The elder brought the younger person along to campaign.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = world.history.events.at(-1)!.id;
    eventIds.push(eventId);
    world = recordRelationshipInteraction(world, {
      stableKey: `inferred-protege:interaction:${index}`,
      personIds: [elderId, youngerId],
      eventId,
      occurredAt,
      kind: "experience:shared-campaign",
      change: "maintained",
      significance: "meaningful",
      summary: "The elder brought the younger person along to campaign.",
      tags: ["campaign-help"],
    });
  }
  world = recordFavor(world, {
    stableKey: "inferred-protege:elder-helped-witness",
    giverPersonId: elderId,
    receiverPersonId: witnessId,
    kind: "political:campaign-help",
    description: "helped with the campaign",
    givenAt: world.currentDate,
    eventId: eventIds[0]!,
    subject: { kind: "none" },
    motive: "kindness",
    weight: "great",
    audience: "public",
    witnessPersonIds: [youngerId],
    inReturnForFavorId: null,
    undertakingId: null,
  });
  return { world, elderId, youngerId, witnessId, outsiderId };
}

describe("implicit protégés", () => {
  it("shares some of an elder's standing with an observed protégé", () => {
    const { world, elderId, youngerId, witnessId } = fixture();
    expect(inferredProtegeOf(world, witnessId, youngerId)?.elderPersonId).toBe(
      elderId,
    );
    expect(favorStandingBetween(world, witnessId, elderId).receiverDebt).toBe(
      "strong",
    );
    expect(favorStandingBetween(world, witnessId, youngerId).receiverDebt).toBe(
      "marked",
    );
  });

  it("does not infer a protégé for somebody who did not witness or hear of it", () => {
    const { world, youngerId, outsiderId } = fixture();
    expect(inferredProtegeOf(world, outsiderId, youngerId)).toBeNull();
    expect(
      favorStandingBetween(world, outsiderId, youngerId).receiverDebt,
    ).toBe("none");
  });
});
