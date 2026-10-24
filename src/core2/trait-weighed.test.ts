/**
 * A two-way decision weighed by the shared formula (`leanedYes`) leaves a
 * `person.weighed` record for the player and anyone in focus, yes or no, with
 * the case and the trait term as its reasons; anyone else leaves none
 * (why-kept). Built on a drawn place's opening world.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import {
  decisionLean,
  decisionTraitWeight,
  leanedYes,
} from "./trait-decisions";
import type { DecisionResult } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const where = `${world.place.displayName} (seed ${seed})`;
const DECISION = "campaigns.open-door";

const weighedBy = (personId: string) =>
  [...(core.logByPerson.get(personId) ?? [])]
    .map((id) => core.durableLog.get(id))
    .filter((row) => row?.kind === "person.weighed");

describe(`weighed decisions keep their reasons for people in focus: ${where}`, () => {
  it("records a yes and a no for someone in focus, and nothing for anyone else", () => {
    const [stranger, followed] = [...core.people.values()].filter(
      (p) =>
        p.alive && p.id !== core.playerId && !core.focusPersonIds.has(p.id),
    );
    expect(followed, where).toBeDefined();

    leanedYes(core, stranger!, DECISION, "open", "ignore", 1);
    expect(weighedBy(stranger!.id), where).toEqual([]);

    core.focusPersonIds.add(followed!.id);
    const term =
      decisionLean(core, followed!, DECISION, "open", "ignore") *
      decisionTraitWeight(core, DECISION);
    expect(leanedYes(core, followed!, DECISION, "open", "ignore", 5)).toBe(
      true,
    );
    expect(leanedYes(core, followed!, DECISION, "open", "ignore", -5)).toBe(
      false,
    );
    const rows = weighedBy(followed!.id);
    expect(
      rows.map((r) => r!.actionId),
      where,
    ).toEqual([`${DECISION}:yes`, `${DECISION}:no`]);
    expect(new Set(rows.map((r) => r!.id)).size).toBe(2);
    for (const [row, bare] of [
      [rows[0]!, 5],
      [rows[1]!, -5],
    ] as const) {
      const scores = (row.decision as DecisionResult).scores!;
      expect(scores[0]!.reasons.trait).toBeCloseTo(term, 9);
      expect(scores[0]!.reasons.module).toBe(bare);
      expect(scores[0]!.score).toBeCloseTo(bare + term, 9);
      expect(scores[1]!.score).toBe(0);
    }
  }, 240_000);
});
