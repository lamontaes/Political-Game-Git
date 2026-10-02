import { describe, expect, it } from "vitest";
import { romanticConsiderations } from "../couples";
import {
  coupleStageConsent,
  coupleStageOptions,
} from "../couple-stage-contract";
import type { CoupleStage } from "../couple-stage-data";
import { createDemoWorld } from "../demo";
import type { EntityId } from "../types";
import { evaluateTownCoupleActors } from "./town-couple-actor-adapter";

function emptyEvidence() {
  const initial = createDemoWorld("a136-caller-parity");
  const world = {
    ...initial,
    history: {
      ...initial.history,
      personalValues: [],
      partnerships: [],
      relationshipInteractions: [],
    },
  };
  const actors = Object.values(world.people).slice(0, 2);
  expect(actors).toHaveLength(2);
  const personIds: readonly [EntityId, EntityId] = [
    actors[0]!.id,
    actors[1]!.id,
  ];
  return { world, personIds };
}

describe("A136 composed town caller and shared stage contract", () => {
  it("evaluates distinct real actors without adding missing romantic evidence or writes", () => {
    const { world, personIds } = emptyEvidence();
    const history = JSON.stringify(world.history);
    const result = evaluateTownCoupleActors(world, {
      stableKey: "a136-caller:actors",
      personIds,
      stage: "dating",
      startedAt: null,
    });
    expect(result.first.context.actorPersonId).toBe(personIds[0]);
    expect(result.second.context.actorPersonId).toBe(personIds[1]);
    for (const actor of [result.first, result.second]) {
      expect(actor.context.considerations).toEqual([]);
      expect(actor.context.randomness).toBe("none");
    }
    expect(JSON.stringify(world.history)).toBe(history);
  });

  it("uses identical helper options and consent at every stage, omitting missing-duration choices", () => {
    const { world, personIds } = emptyEvidence();
    for (const stage of [
      "dating",
      "cohabiting",
      "married",
    ] satisfies CoupleStage[]) {
      const result = evaluateTownCoupleActors(world, {
        stableKey: `a136-caller:${stage}`,
        personIds,
        stage,
        startedAt: null,
      });
      const options = coupleStageOptions(stage, null, world.currentDate);
      const canonicalOptions = [...options].sort((a, b) =>
        a.key.localeCompare(b.key),
      );
      expect(result.first.context.options).toEqual(canonicalOptions);
      expect(result.second.context.options).toEqual(canonicalOptions);
      expect(result.admittedOptions).toEqual(
        options.filter((option) =>
          coupleStageConsent({
            stage,
            startedAt: null,
            asOfDate: world.currentDate,
            optionKey: option.key,
            first: result.first,
            second: result.second,
          }),
        ),
      );
      expect(options.some((option) => option.key === "move-in")).toBe(false);
      if (stage !== "dating")
        expect(options.some((option) => option.key === "marry")).toBe(false);
      expect(options.some((option) => option.key === "divorce")).toBe(false);
    }
  });

  it("does not authorize a town break-up from two actual true ties (Audit A124)", () => {
    const { world, personIds } = emptyEvidence();
    expect(
      romanticConsiderations(
        world,
        "a136-caller:tie",
        personIds[0],
        personIds[1],
      ),
    ).toEqual([]);
    expect(
      romanticConsiderations(
        world,
        "a136-caller:tie",
        personIds[1],
        personIds[0],
      ),
    ).toEqual([]);
    const result = evaluateTownCoupleActors(world, {
      stableKey: "a136-caller:tie",
      personIds,
      stage: "dating",
      startedAt: null,
    });
    for (const actor of [result.first, result.second]) {
      expect(
        actor.optionEvaluations.every(
          (option) =>
            option.available &&
            option.preference === "mixed" &&
            option.randomContribution === "none",
        ),
      ).toBe(true);
    }
    expect(result.admittedOptions).toEqual([]);
  });
});
