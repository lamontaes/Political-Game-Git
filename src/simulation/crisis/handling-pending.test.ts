import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "../decisions";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { addDays } from "../dates";
import { recordKinship } from "../life";
import { recordWorldEvent } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import { appendCrisisRecord, crisisRecordId } from "./records";
import { applyPendingDisasterHandlingReactions } from "./handling-reactions";
const evaluate = decisions.evaluateDecision;
type Args = Parameters<typeof evaluate>;
afterEach(() => vi.restoreAllMocks());
function fixture(twoReaders = false) {
  const place = drawRandomPlace("a125-handling-pending");
  const small = smallWorld({
    place: place.key,
    people: 3,
    seed: "a125-handling-pending",
  });
  let world = small.world;
  const subject = small.personId;
  const readers = world.personOrder
    .filter((id) => id !== subject)
    .slice(0, twoReaders ? 2 : 1);
  for (const reader of readers)
    world = recordKinship(world, {
      stableKey: `a125:contact:${reader}`,
      personIds: [subject, reader],
      establishedAt: world.currentDate,
      kind: "collateral:sibling",
      provenance: { kind: "authored", note: "Recorded boundary-test contact." },
    });
  world = appendCrisisRecord(world, {
    stableKey: "a125:hazard",
    kind: "hazard-episode",
    effectiveAt: world.currentDate,
    causalParentIds: [],
    visibility: "public",
    eventId: null,
    family: "flood",
    magnitude: "major",
    stateUsps: place.stateJurisdictionKey!.slice(3),
    jurisdictionIds: [world.people[subject]!.homeJurisdictionId!],
    endsAt: addDays(world.currentDate, 1),
    basis: "Authored hazard for the handling caller boundary.",
    sourceReference: null,
  });
  const episodeId = crisisRecordId(world, "a125:hazard");
  world = recordWorldEvent(world, {
    stableKey: "a125:response-event",
    type: "crisis.disaster-request",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[subject]!.homeJurisdictionId!,
    involvedEntityIds: [subject],
    participants: [
      { personId: subject, role: "focus:actor", detail: "Recorded response" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "The actor requested disaster help.",
    context: null,
  });
  world = appendCrisisRecord(world, {
    stableKey: "a125:response",
    kind: "disaster-response",
    effectiveAt: world.currentDate,
    causalParentIds: [episodeId],
    visibility: "public",
    eventId: world.history.events.at(-1)!.id,
    episodeId,
    stage: "state-request",
    actorPersonId: subject,
    officeKey: null,
    decidedBy: "player",
    reason: "Authored response boundary fixture.",
    programs: [],
  });
  return { world, subject, readers };
}
const traces = (world: Args[0]) =>
  world.history.decisionTraces.filter((row) =>
    row.context.decisionType.startsWith("crisis."),
  );
const markers = (world: Args[0]) =>
  world.history.events.filter(
    (row) => row.type === "crisis.disaster-reaction-settled",
  );
function pending(world: Args[0], input: Args[1]): ReturnType<typeof evaluate> {
  return {
    ...evaluate(world, input),
    outcomeKind: "undecided",
    selectedOptionKey: null,
  };
}
describe("A125 disaster reaction pending retry", () => {
  it("does not convert undecided into a no-action trace or settled marker, including after reload", () => {
    const { world } = fixture();
    vi.spyOn(decisions, "evaluateDecision").mockImplementation(pending);
    const deferred = applyPendingDisasterHandlingReactions(world);
    expect(traces(deferred)).toHaveLength(0);
    expect(markers(deferred)).toHaveLength(0);
    expect(deferred.history.events).toEqual(world.history.events);
    const loaded = deserializeWorld(serializeWorld(deferred));
    expect(serializeWorld(applyPendingDisasterHandlingReactions(loaded))).toBe(
      serializeWorld(loaded),
    );
  });
  it("records the actual selected reaction when the pending answer later resolves, exactly once", () => {
    const { world } = fixture();
    const spy = vi
      .spyOn(decisions, "evaluateDecision")
      .mockImplementation(pending);
    const deferred = applyPendingDisasterHandlingReactions(world);
    spy.mockRestore();
    const resolved = applyPendingDisasterHandlingReactions(deferred);
    expect(traces(resolved)).toHaveLength(1);
    expect(traces(resolved)[0]!.selectedOptionKey).toBe("praise");
    expect(markers(resolved)).toHaveLength(1);
    expect(
      resolved.history.events.filter(
        (row) => row.type === "crisis.handling-praise",
      ),
    ).toHaveLength(1);
    expect(
      serializeWorld(
        applyPendingDisasterHandlingReactions(
          deserializeWorld(serializeWorld(resolved)),
        ),
      ),
    ).toBe(serializeWorld(resolved));
  });
  it("does not duplicate an already selected reader while another reader remains pending", () => {
    const { world, readers } = fixture(true);
    const deferredReader = readers[1]!;
    const spy = vi
      .spyOn(decisions, "evaluateDecision")
      .mockImplementation(
        (current: Args[0], input: Args[1]): ReturnType<typeof evaluate> =>
          input.actorPersonId === deferredReader
            ? pending(current, input)
            : evaluate(current, input),
      );
    const partly = applyPendingDisasterHandlingReactions(world);
    expect(traces(partly)).toHaveLength(1);
    expect(markers(partly)).toHaveLength(0);
    spy.mockRestore();
    const resolved = applyPendingDisasterHandlingReactions(partly);
    expect(traces(resolved)).toHaveLength(2);
    expect(markers(resolved)).toHaveLength(1);
    expect(
      new Set(traces(resolved).map((row) => row.context.actorPersonId)).size,
    ).toBe(2);
  });
});
