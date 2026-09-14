import { describe, expect, it } from "vitest";
import {
  composeExecutiveStatement,
  executiveDraftFingerprint,
  executiveDraftKey,
  projectExecutiveWork,
  selectedExecutiveFacts,
} from "./executive-work";
import {
  actOnExecutiveWork,
  composeExecutiveWorkHandlers,
  executiveNextStep,
  receiveExecutiveWork,
} from "../simulation/executive-work";
import { advanceWorldMinutes, workItemState } from "../simulation/time-work";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { recordWorldEvent } from "../simulation/world";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { EXECUTIVE_GOVERNING_KERNELS } from "../simulation/executive-governing-kernel-bank";
import {
  facts,
  incoming,
  officeWorld,
  staff,
} from "../../tests/fixtures/executive-work-world";
import type { EntityId, World } from "../simulation/types";
import type { ExecutiveKernelId } from "../simulation/executive-governing-kernels";

function secondIncoming(world: World) {
  const office = resolveExecutiveOffice(world)!;
  world = recordWorldEvent(world, {
    ...office.entry,
    stableKey: "incoming-second",
    type: "executive.incoming",
    summary: "Review the second recorded office work.",
  });
  return receiveExecutiveWork(
    world,
    world.history.events.find((event) => event.stableKey === "incoming-second")!
      .id,
    "Second office work",
    "Review the second recorded office work.",
  );
}

function reachPlayerDecision(
  world: World,
  itemId: EntityId,
  kernelId: ExecutiveKernelId,
) {
  for (let i = 0; i < 40; i++) {
    const next = executiveNextStep(world, itemId, kernelId);
    expect(next, next.ok ? "" : next.reason).toMatchObject({ ok: true });
    if (!next.ok || !next.step) return world;
    const step = next.step;
    if (step.kind === "work-item") {
      const created = world.history.workItems.find(
        (item) => item.stableKey === step.input.stableKey,
      );
      if (
        created &&
        workItemState(world, created.id).status === "active" &&
        step.input.playerRequirement === "none"
      ) {
        world = advanceWorldMinutes(world, 30, composeExecutiveWorkHandlers());
        continue;
      }
      if (created && step.input.playerRequirement === "decision") return world;
    }
    const result = actOnExecutiveWork(
      world,
      itemId,
      kernelId,
      "continue",
      composeExecutiveWorkHandlers(),
    );
    expect(result, result.ok ? "" : result.reason).toMatchObject({
      ok: true,
    });
    if (!result.ok) return world;
    world = result.world;
  }
  return world;
}

describe("executive structured statements", () => {
  it("inspects exact wording without committing World history", () => {
    const seeded = facts(
      incoming(staff(officeWorld())),
      EXECUTIVE_GOVERNING_KERNELS.find(
        (kernel) => kernel.row.id === "92H-K-001",
      )!.requiredFactKeys,
    );
    const before = serializeWorld(seeded.world);
    const projection = projectExecutiveWork(seeded.world);
    expect(projection.available).toBe(true);
    const practice = projection.items[0]!.practices.find(
      (entry) => entry.id === "92H-K-001",
    )!;
    const composed = composeExecutiveStatement({
      kind: "instruction",
      selectedFacts: practice.facts.slice(0, 1),
      measureDesignation: practice.measureDesignation,
    });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.statement).toContain(practice.facts[0]!.text);
    expect(serializeWorld(seeded.world)).toBe(before);
  });

  it("keeps two work-item drafts on distinct fingerprints and keys", () => {
    let world = incoming(staff(officeWorld()));
    const first = world.history.workItems.at(-1)!;
    world = secondIncoming(world);
    const second = world.history.workItems.at(-1)!;
    expect(first.id).not.toBe(second.id);
    expect(executiveDraftKey(first.id, "92H-K-001")).not.toBe(
      executiveDraftKey(second.id, "92H-K-001"),
    );
    const projection = projectExecutiveWork(world);
    expect(projection.items).toHaveLength(2);
    expect(projection.items[0]!.id).not.toBe(projection.items[1]!.id);
  });

  it("invalidates a draft when the measure action sequence changes", () => {
    const factsOnly = [
      { key: "session-status", text: "The session remains open." },
    ];
    const before = executiveDraftFingerprint({
      measureId: "measure-1",
      measureActionSequence: 12,
      facts: factsOnly,
    });
    const after = executiveDraftFingerprint({
      measureId: "measure-1",
      measureActionSequence: 13,
      facts: factsOnly,
    });
    expect(before).not.toBe(after);
    const replacedMeasure = executiveDraftFingerprint({
      measureId: "measure-2",
      measureActionSequence: 12,
      facts: factsOnly,
    });
    expect(before).not.toBe(replacedMeasure);
  });

  it("drops selected facts that no longer exist on the current file", () => {
    const remaining = selectedExecutiveFacts(
      [{ key: "agency-positions", text: "The agency filed a comment." }],
      ["agency-positions", "stale-key"],
    );
    expect(remaining).toEqual([
      { key: "agency-positions", text: "The agency filed a comment." },
    ]);
  });

  it("commits the inspected instruction and preserves it across reload", () => {
    const definition = EXECUTIVE_GOVERNING_KERNELS.find(
      (kernel) => kernel.row.id === "92H-K-001",
    )!;
    let world = incoming(staff(officeWorld()));
    const seeded = facts(world, definition.requiredFactKeys);
    world = reachPlayerDecision(
      seeded.world,
      seeded.item.id,
      definition.row.id,
    );
    const practice = projectExecutiveWork(world).items[0]!.practices.find(
      (entry) => entry.id === definition.row.id,
    )!;
    expect(practice.decision).toBe(true);
    const composed = composeExecutiveStatement({
      kind: "instruction",
      selectedFacts: practice.facts,
      measureDesignation: null,
    });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const before = serializeWorld(world);
    const inspect = actOnExecutiveWork(
      world,
      seeded.item.id,
      definition.row.id,
      "continue",
    );
    expect(inspect.ok).toBe(false);
    if (!inspect.ok)
      expect(inspect.reason).toBe(
        "Record an instruction before completing this decision.",
      );
    expect(serializeWorld(world)).toBe(before);
    const committed = actOnExecutiveWork(
      world,
      seeded.item.id,
      definition.row.id,
      "continue",
      composeExecutiveWorkHandlers(),
      composed.statement,
    );
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    world = committed.world;
    const reloaded = deserializeWorld(serializeWorld(world));
    const recorded = projectExecutiveWork(reloaded)
      .items[0]!.recordedStatements.map((entry) => entry.text)
      .join("\n");
    expect(recorded).toContain(composed.statement);
  });

  it("surfaces the exact refusal instead of a generic office message", () => {
    const world = incoming(officeWorld());
    const item = world.history.workItems.at(-1)!;
    const result = actOnExecutiveWork(world, item.id, "92H-K-001", "continue");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).not.toMatch(/office, records, staff or schedule/);
    expect(result.reason.length).toBeGreaterThan(8);
  });

  it("refuses a veto without recorded grounds and signs from the presented designation", () => {
    const veto = composeExecutiveStatement({
      kind: "veto",
      selectedFacts: [],
      measureDesignation: "LB 88",
    });
    expect(veto).toEqual({
      ok: false,
      reason:
        "No recorded source-specific objection is selected for this measure.",
    });
    const sign = composeExecutiveStatement({
      kind: "sign",
      selectedFacts: [],
      measureDesignation: "LB 88",
    });
    expect(sign).toEqual({
      ok: true,
      statement: "The office signs LB 88 as presented.",
    });
  });
});
