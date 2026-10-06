import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { ensurePressMediaOpening, mediaOutlets } from "./outlets";
import { outletCovers, recordedScale } from "./desk";
import { recordWorldEvent } from "../world";
import type { World } from "../types";

describe("recorded scale at national outlets", () => {
  it("carries a recorded governor change nationally and leaves routine updates local", () => {
    const created = createScenarioWorld(
      "outlet-scale-governor-change",
      KENTUCKY_CONTEXT,
      {
        peopleCount: 3,
      },
    );
    const personId = created.personOrder[0]!;
    let world: World = { ...created, control: { kind: "person", personId } };
    world = ensurePressMediaOpening(world, personId);
    const national = mediaOutlets(world).find(
      (outlet) => outlet.scope === "national",
    )!;
    const major = recordWorldEvent(world, {
      stableKey: "test:governor-change-major",
      type: "office.governor-changed",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      involvedEntityIds: [personId],
      participants: [
        { personId, role: "focus:subject", detail: "Became governor." },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["office:US-KY-governor", "importance:major"],
      summary: "A new governor took office.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    }).history.events.at(-1)!;
    const routine = recordWorldEvent(world, {
      stableKey: "test:governor-routine",
      type: "office.governor-changed",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      involvedEntityIds: [personId],
      participants: [
        { personId, role: "focus:subject", detail: "Routine update." },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["office:US-KY-governor"],
      summary: "A routine office update.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    }).history.events.at(-1)!;

    expect(recordedScale(major)).toBe(3);
    expect(outletCovers(world, national, major)).toBe(true);
    expect(recordedScale(routine)).toBe(0);
    expect(outletCovers(world, national, routine)).toBe(false);
  });
});
