import { smallWorld } from "../../tests/fixtures/small-world";
import { observerPlace } from "../presentation/observer-world";
import { observeFromOpening } from "../simulation/people-continuation";
import { describe, expect, it } from "vitest";
import { type EntityId } from "../simulation";
import { observerInspectorCheckpoint } from "./observer-inspector-entry";

const generated = smallWorld({
  place: observerPlace("controlled-observer-entry").key,
  seed: "controlled-observer-entry",
});
const current = observeFromOpening(generated.world, generated.personId);
describe("Observer inspector parent admission", () => {
  it("forwards the exact settled snapshot without substituting or changing it", () => {
    const paused = { ...current };
    expect(observerInspectorCheckpoint(current, paused)).toBe(paused);
    expect(observerInspectorCheckpoint(current, paused)?.seed).toBe(
      current.seed,
    );
  });
  it("rejects ordinary person, mismatched world, and resumed-person snapshots", () => {
    const personWorld = {
      ...current,
      control: {
        kind: "person" as const,
        personId: generated.personId,
      },
    };
    expect(observerInspectorCheckpoint(personWorld, current)).toBeNull();
    expect(observerInspectorCheckpoint(current, personWorld)).toBeNull();
    expect(
      observerInspectorCheckpoint(current, {
        ...current,
        id: "other-world" as EntityId,
      }),
    ).toBeNull();
  });
});
