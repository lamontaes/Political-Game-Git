import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  materializePerson,
  advanceDemoWorld,
  serializeWorld,
} from "../simulation";
import {
  cloneForReview,
  resetReview,
  reviewControl,
  memoryReviewStorage,
} from "./review-session";
import type { EntityId } from "../simulation/types";

describe("Disposable review world", () => {
  it("preserves source bytes, identity, history and time across control, mutation, reset and discard", () => {
    const source = createDemoWorld("review-isolation-control");
    const before = serializeWorld(source);
    const original = cloneForReview(source, "test snapshot");
    expect(original.world).not.toBe(source);
    expect(original.world.people).not.toBe(source.people);
    const person = source.personOrder[1]!;
    const controlled = reviewControl(original, person);
    expect(controlled.world.control).toEqual({
      kind: "person",
      personId: person,
    });
    expect(controlled.world.history).toEqual(source.history);
    expect(controlled.world.currentMoment).toEqual(source.currentMoment);
    const changed = {
      ...controlled,
      world: advanceDemoWorld(materializePerson(controlled.world, person), 7),
    };
    expect(serializeWorld(changed.world)).not.toBe(before);
    expect(serializeWorld(source)).toBe(before);
    expect(serializeWorld(resetReview(changed).world)).toBe(before);
    expect(resetReview(changed).world.id).toBe(source.id);
    expect(() => reviewControl(original, "missing" as EntityId)).toThrow(
      "does not exist",
    );
    expect(serializeWorld(source)).toBe(before);
  });
  it("keeps each review's storage private and disposable", () => {
    const first = memoryReviewStorage(),
      second = memoryReviewStorage();
    first.setItem("save", "clone");
    expect(second.getItem("save")).toBeNull();
    first.clear();
    expect(first.length).toBe(0);
  });
});
