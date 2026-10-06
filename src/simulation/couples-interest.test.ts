import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { dateRefusal, romanticConsiderations } from "./couples";
import { recordRelationshipInteraction } from "./records";
import { ensurePeopleTraits } from "./people-traits";
import type { EntityId, World } from "./types";

function eligiblePair(world: World) {
  const pair = world.personOrder
    .flatMap((answererId) =>
      world.personOrder.map((askerId) => ({ answererId, askerId })),
    )
    .find(
      ({ answererId, askerId }) =>
        answererId !== askerId &&
        dateRefusal(world, answererId, askerId) === null,
    );
  if (!pair) throw new Error("The fixture needs two eligible adults.");
  return pair;
}

function addInteraction(
  world: World,
  answererId: EntityId,
  askerId: EntityId,
  stableKey: string,
  kind: "contact:conversation" | "work:shared-shift",
  tags: readonly string[] = [],
): World {
  return recordRelationshipInteraction(world, {
    stableKey,
    personIds: [answererId, askerId],
    eventId: null,
    occurredAt: world.currentDate,
    kind,
    change: "strengthened",
    significance: "meaningful",
    summary: "They spent time together.",
    tags,
  });
}

describe("romantic interest grows from the pair's recorded life", () => {
  it("uses their interactions and shared work as reasons, without a visible score", () => {
    let world = createDemoWorld("couples-interest-shared-work");
    const { answererId, askerId } = eligiblePair(world);
    world = ensurePeopleTraits(world, [answererId]);
    world = addInteraction(
      world,
      answererId,
      askerId,
      "shared-work",
      "work:shared-shift",
      ["relationship.shared-work"],
    );

    const reasons = romanticConsiderations(
      world,
      "test:romance",
      answererId,
      askerId,
    );

    expect(reasons.map((reason) => reason.stableKey)).toContain(
      "test:romance:time-together",
    );
    expect(reasons.map((reason) => reason.stableKey)).toContain(
      "test:romance:shared-work",
    );
    expect(
      reasons.find(
        (reason) => reason.stableKey === "test:romance:time-together",
      )?.sourceRefs,
    ).toEqual([expect.objectContaining({ kind: "relationship-interaction" })]);
    expect(
      reasons.some((reason) =>
        /\b\d+%|score|compatibility/i.test(reason.explanation),
      ),
    ).toBe(false);
  });

  it("does not create interest when there is no shared history", () => {
    const world = createDemoWorld("couples-interest-no-contact");
    const { answererId, askerId } = eligiblePair(world);
    const reasons = romanticConsiderations(
      world,
      "test:romance",
      answererId,
      askerId,
    );

    expect(
      reasons.some((reason) => reason.stableKey.endsWith(":time-together")),
    ).toBe(false);
  });
});
