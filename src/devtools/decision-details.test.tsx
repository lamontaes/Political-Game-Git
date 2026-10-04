import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { canonicalJson } from "../simulation";
import type { DecisionTraceRecord } from "../simulation";
import { decisionConsiderationScore } from "../simulation/decision-scores";
import { projectDecisionTraceDetails } from "./trace-adapters";
import { buildTraceIndex } from "./trace-index";
import { evaluateTownCoupleActors } from "../simulation/living-world/town-couple-actor-adapter";
import { CausalTraceView, DecisionDetails } from "../ui/CausalTraceView";

const game = createNewGameWorld({
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "saved-decision-inspector",
});
// Test preparation only: this opening has no retained decisions. Use the
// existing canonical actor producer on its actual generated people; this is
// an authored dating-review scenario, not passive opening-world coverage.
const openingTraceCount = game.world.history.decisionTraces.length;
const world = evaluateTownCoupleActors(game.world, {
  stableKey: "inspector-fixture:canonical-couple-review",
  personIds: [game.world.personOrder[0]!, game.world.personOrder[1]!],
  stage: "dating",
  startedAt: null,
  retention: "durable",
}).world;
const records = world.history.decisionTraces;

describe("read-only saved decision details", () => {
  it("compares actual recorded generated-world decisions with the shared calculator", () => {
    expect(records.length).toBeGreaterThan(0);
    const before = canonicalJson(world);
    for (const record of records) {
      const details = projectDecisionTraceDetails(record);
      expect(details.saved).toBe(record);
      for (const option of details.currentCodeCalculation.options) {
        const saved = record.context.considerations.filter(
          (row) => row.optionKey === option.optionKey,
        );
        expect(option.sum).toBe(
          saved.reduce((sum, row) => sum + decisionConsiderationScore(row), 0),
        );
        for (const row of option.components) {
          const sign = row.consideration.direction === "supports" ? 1 : -1;
          expect(row.contribution).toBe(
            sign * row.importanceWeight * row.confidenceWeight,
          );
        }
      }
      expect(details.currentCodeCalculation.label).toContain(
        "not a historically stored total",
      );
    }
    expect(canonicalJson(world)).toBe(before);
    console.log(
      JSON.stringify({
        kind: "canonical-producer-scenario-on-generated-world",
        openingTraceCount,
        scenario: "Authored dating review; not passive opening-world decisions",
        seed: world.seed,
        decisions: records.length,
        outcomeKinds: [...new Set(records.map((row) => row.outcomeKind))],
      }),
    );
  });

  it("inspects actual world without constructing the default fixture or changing history", () => {
    const before = canonicalJson(world);
    const index = buildTraceIndex(world);
    for (const record of records) {
      const node = index.byId.get(record.id)!;
      const details = JSON.parse(node.recordText!);
      expect(details.saved.optionEvaluations).toEqual(record.optionEvaluations);
      expect(details.saved.sourceSnapshots).toEqual(record.sourceSnapshots);
    }
    const html = renderToStaticMarkup(<CausalTraceView reviewWorld={world} />);
    expect(html).toContain("saved-decision-inspector");
    expect(html).toContain("CURRENT-CODE CALCULATION");
    expect(html).toContain("Saved options and ranks");
    expect(canonicalJson(world)).toBe(before);
  });

  it("explicit authored edge fixture shows blockers, undecided, tied calculations and missing sources", () => {
    // Renderer-only fixture: not inserted into a world or represented as an
    // ordinary generated decision. No absent edge is invented by the adapter.
    const first = records[0]!;
    const fixture: DecisionTraceRecord = {
      ...first,
      outcomeKind: "undecided",
      selectedOptionKey: null,
      sourceSnapshots: [],
      context: {
        ...first.context,
        perceptionIds: [],
        peerEstimates: [],
        options: [
          { key: "a", label: "Fixture A", description: "Authored edge case" },
          { key: "b", label: "Fixture B", description: "Authored edge case" },
          {
            key: "blocked",
            label: "Fixture blocked",
            description: "Authored edge case",
          },
        ],
        considerations: ["a", "b"].map((optionKey) => ({
          stableKey: `fixture:${optionKey}`,
          optionKey,
          sourceType: "context:fixture",
          direction: "supports",
          importance: "moderate",
          confidence: "high",
          explanation: "Authored equal consideration",
          sourceRefs: [],
        })),
        constraints: [
          {
            stableKey: "fixture:block",
            optionKey: "blocked",
            kind: "fixture",
            explanation: "Authored blocker",
            sourceRefs: [],
          },
        ],
      },
      optionEvaluations: ["a", "b", "blocked"].map((optionKey) => ({
        optionKey,
        available: optionKey !== "blocked",
        blockedByConstraintKeys:
          optionKey === "blocked" ? ["fixture:block"] : [],
        considerationKeys:
          optionKey === "blocked" ? [] : [`fixture:${optionKey}`],
        preference: "supported",
        randomContribution: "none",
        finalRank: optionKey === "blocked" ? null : 1,
      })),
    };
    const before = canonicalJson(fixture);
    const detail = projectDecisionTraceDetails(fixture);
    expect(detail.currentCodeCalculation.options[0]!.tiedWith).toEqual(["b"]);
    expect(detail.currentCodeCalculation.options[2]!.tiedWith).toEqual([]);
    const html = renderToStaticMarkup(<DecisionDetails record={fixture} />);
    expect(html).toContain("undecided");
    expect(html).toContain("fixture:block");
    expect(html).toContain("unranked");
    expect(html).toContain("No peer estimates recorded");
    expect(html).toContain(
      "No missing source or causal edge has been reconstructed",
    );
    expect(canonicalJson(fixture)).toBe(before);
  });
});
