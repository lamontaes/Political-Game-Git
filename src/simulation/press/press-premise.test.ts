import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import type { World } from "../types";
import {
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
  reporterRoles,
} from "./outlets";

describe("press premise", () => {
  it("records the selected editorial standard on opening and later-founded outlets", () => {
    const scenario = createScenarioWorld("press-premise-49", KENTUCKY_CONTEXT, {
      peopleCount: 5,
    });
    const playerId = scenario.personOrder[0]!;
    let world: World = {
      ...scenario,
      control: { kind: "person" as const, personId: playerId },
      playSettings: {
        challenge: "standard" as const,
        notes: "full" as const,
        saves: "free" as const,
        premises: {
          familyMoney: "ordinary" as const,
          press: "tougher" as const,
          ongoingMoneyCosts: "standard" as const,
        },
      },
    };
    world = ensurePressMediaOpening(world, playerId);
    world = ensurePressStateCoverage(world, KENTUCKY_CONTEXT.jurisdiction.id);
    const outlets = mediaOutlets(world);
    expect(outlets.length).toBeGreaterThan(0);
    expect(
      outlets.every((outlet) => outlet.editorialStandard === "tougher"),
    ).toBe(true);
    const reporters = outlets.flatMap((outlet) =>
      reporterRoles(world, outlet.id),
    );
    expect(reporters.length).toBeGreaterThan(0);
    expect(
      reporters.every((reporter) =>
        ["medium", "high"].includes(reporter.persistence ?? ""),
      ),
    ).toBe(true);
    expect(
      reporters.every((reporter) =>
        ["medium", "high"].includes(reporter.conflict ?? ""),
      ),
    ).toBe(true);
  });
});
