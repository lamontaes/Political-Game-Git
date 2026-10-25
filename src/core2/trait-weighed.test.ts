/**
 * A two-way decision weighed by the shared formula (`leanedYes`) leaves a
 * `person.weighed` record for the player and anyone in focus, yes or no, with
 * the case and the trait term as its reasons, and so does a choice among
 * options by the shared chooser; anyone else leaves none (why-kept). Built on
 * a drawn place's opening world.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { chooseAct } from "./choice";
import { gameStartDate } from "./game-start";
import { availableActs } from "./life";
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

  it("records a choice among options for someone in focus, unless the caller commits it as an act", () => {
    const person = [...core.people.values()].find(
      (p) =>
        p.alive &&
        p.id !== core.playerId &&
        !core.focusPersonIds.has(p.id) &&
        availableActs(core, p.id).length >= 2,
    );
    expect(person, where).toBeDefined();
    const offers = availableActs(core, person!.id);
    chooseAct(core, person!.id, offers);
    expect(weighedBy(person!.id), where).toEqual([]);

    core.focusPersonIds.add(person!.id);
    chooseAct(core, person!.id, offers, undefined, false, false);
    expect(weighedBy(person!.id), where).toEqual([]);
    const decision = chooseAct(core, person!.id, offers);
    const [row] = weighedBy(person!.id);
    expect(row?.actionId, where).toBe(decision.selected!.definition.id);
    expect(
      (row!.decision as DecisionResult).scores!.map((s) => s.actionId),
    ).toEqual(offers.map((o) => o.definition.id));
  }, 240_000);
});
