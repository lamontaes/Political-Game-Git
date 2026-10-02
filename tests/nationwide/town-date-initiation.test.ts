import { describe, expect, it } from "vitest";
import { createWorld } from "../../src/simulation/world";
import { createDemoWorld } from "../../src/simulation/demo";
import {
  createLifeMindCatalog,
  LIFE_MIND_IDS,
} from "../../src/simulation/life-mind-content";
import {
  createMindProvenance,
  recordPersonalValue,
} from "../../src/simulation/mind";
import { recordRelationshipInteraction } from "../../src/simulation/records";
import { evaluateTownDateProposal } from "../../src/simulation/living-world/town-couple-actor-adapter";
import type { EntityId, World } from "../../src/simulation/types";

function fixture() {
  const initial = createDemoWorld("a136-dating-initiation");
  const world = createWorld({
    seed: "a136-dating-initiation",
    currentDate: initial.currentDate,
    jurisdictions: initial.jurisdictionOrder.map(
      (id) => initial.jurisdictions[id]!,
    ),
    people: initial.personOrder.map((id) => initial.people[id]!),
    mindCatalog: createLifeMindCatalog(),
  });
  const [asker, recipient, stranger] = world.personOrder;
  if (!asker || !recipient || !stranger)
    throw new Error("Three recorded people required.");
  return { world, asker, recipient, stranger };
}

function connection(
  world: World,
  personId: EntityId,
  orientation: "embraces" | "rejects",
) {
  return recordPersonalValue(world, {
    stableKey: `dating:value:${personId}`,
    personId,
    valueId: LIFE_MIND_IDS.connection,
    recordedAt: world.currentDate,
    orientation,
    strength: "strong",
    salience: "high",
    qualification: null,
    provenance: createMindProvenance("authored"),
    supersedesValueId: null,
  });
}

function meet(world: World, asker: EntityId, recipient: EntityId) {
  return recordRelationshipInteraction(world, {
    stableKey: `dating:met:${recipient}`,
    personIds: [asker, recipient],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "contact:conversation",
    change: "maintained",
    significance: "minor",
    summary: "They spoke.",
    tags: [],
  });
}

describe("A136 recorded first-date initiation", () => {
  it("does not propose to an unknown person even with recorded desire for company", () => {
    const f = fixture();
    const world = connection(f.world, f.asker, "embraces");
    expect(
      evaluateTownDateProposal(world, "dating:unknown", f.asker, [f.recipient]),
    ).toBeNull();
  });
  it("omits a known person when the asker has no positive saved consideration", () => {
    const f = fixture();
    const world = meet(f.world, f.asker, f.recipient);
    expect(
      evaluateTownDateProposal(world, "dating:no-desire", f.asker, [
        f.recipient,
      ]),
    ).toBeNull();
  });
  it("returns the actual known recipient only after their independent acceptance, without writing", () => {
    const f = fixture();
    const world = connection(
      connection(meet(f.world, f.asker, f.recipient), f.asker, "embraces"),
      f.recipient,
      "embraces",
    );
    const before = JSON.stringify(world);
    expect(
      evaluateTownDateProposal(world, "dating:accepted", f.asker, [
        f.stranger,
        f.recipient,
      ]),
    ).toBe(f.recipient);
    expect(JSON.stringify(world)).toBe(before);
  });
  it("honors the actual recipient's recorded decline despite the asker's desire", () => {
    const f = fixture();
    const world = connection(
      connection(meet(f.world, f.asker, f.recipient), f.asker, "embraces"),
      f.recipient,
      "rejects",
    );
    expect(
      evaluateTownDateProposal(world, "dating:declined", f.asker, [
        f.recipient,
      ]),
    ).toBeNull();
  });
  it("does nothing when two recorded acquaintances tie, regardless of candidate ordering (A124)", () => {
    const f = fixture();
    let world = meet(meet(f.world, f.asker, f.recipient), f.asker, f.stranger);
    for (const person of [f.asker, f.recipient, f.stranger])
      world = connection(world, person, "embraces");
    for (const candidates of [
      [f.recipient, f.stranger],
      [f.stranger, f.recipient],
    ]) {
      expect(
        evaluateTownDateProposal(world, "dating:tie", f.asker, candidates),
      ).toBeNull();
    }
  });
});
