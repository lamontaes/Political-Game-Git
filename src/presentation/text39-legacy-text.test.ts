import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  recordWorldEvent,
  serializeWorld,
  deserializeWorld,
} from "../simulation";
import {
  adultSituation,
  bindRequestSituation,
  buildAdultLifeContext,
} from "../simulation/adult-situations";
import { lifeOpportunityTag } from "../simulation/life-opportunities";

describe("TEXT39 preserves facts in older saved requests", () => {
  it.each([
    [
      "extra-hours-request",
      "adult.work-extra-hours",
      /one (extra )?hour|shift date|pay still/i,
    ],
    ["confidence-disclosed", "adult.friend-in-difficulty", /picnic|guests/i],
    [
      "meeting-agenda-item",
      "adult.local-issue-position",
      /evening opening|public meeting room/i,
    ],
  ] as const)("does not add new details to %s", (kind, key, invented) => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
      seed: "text39-legacy",
    });
    const id = game.playerPersonId;
    const other = game.world.personOrder.find((person) => person !== id)!;
    const people = kind === "meeting-agenda-item" ? [id] : [id, other];
    const world = recordWorldEvent(game.world, {
      stableKey: `legacy:${kind}`,
      type: "life.legacy-request",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId: game.world.people[id]!.homeJurisdictionId,
      involvedEntityIds: people,
      participants: people.map((personId) => ({
        personId,
        role:
          personId === id
            ? ("focus:asked-of" as const)
            : ("agency:asked" as const),
        detail: "Legacy record",
      })),
      personFactConstraints: [],
      visibility: "private",
      tags: [lifeOpportunityTag(kind)],
      summary: "The original request has no detailed terms.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const restored = deserializeWorld(serializeWorld(world));
    const before = serializeWorld(restored);
    const projected = bindRequestSituation(
      buildAdultLifeContext(restored, id),
      adultSituation(key)!,
    );
    expect(projected.prose).toContain(
      "The original request has no detailed terms.",
    );
    expect(
      JSON.stringify({
        prose: projected.prose,
        options: projected.options.map((option) => ({
          label: option.label,
          description: option.description,
          memory: option.memory,
        })),
      }),
    ).not.toMatch(invented);
    expect(serializeWorld(restored)).toBe(before);
  });
});
