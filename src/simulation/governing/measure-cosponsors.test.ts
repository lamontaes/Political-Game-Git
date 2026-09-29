import { describe, expect, it } from "vitest";

import { appendedList } from "../history-index";
import { COSPONSOR_EVENT, measureCosponsors } from "./congress-chambers";
import type { EntityId, World } from "../types";

/**
 * A bill's cosponsors are read from an index that follows the event list as
 * it grows. The answer is what reading every event gives: each measure's
 * cosponsors in the order they signed on, and an older world answers without
 * the names signed after it.
 */

type Event = World["history"]["events"][number];

const id = (value: string) => value as EntityId;

function signed(measureId: string, people: readonly string[]): Event {
  return {
    type: COSPONSOR_EVENT,
    involvedEntityIds: [measureId, ...people].map(id).sort(),
    participants: people.map((personId) => ({
      personId: id(personId),
      role: "agency:cosponsor",
    })),
  } as unknown as Event;
}

function other(measureId: string): Event {
  return {
    type: "legislation.measure-introduced",
    involvedEntityIds: [id(measureId), id("person_intro")],
    participants: [{ personId: id("person_intro"), role: "agency:cosponsor" }],
  } as unknown as Event;
}

const worldWith = (events: readonly Event[]): World =>
  ({ history: { events } }) as unknown as World;

describe("a bill's cosponsors", () => {
  it("follows the event list as it grows, in signing order", () => {
    let events: readonly Event[] = [other("measure_a")];
    const early = worldWith(events);
    expect(measureCosponsors(early, id("measure_a"))).toEqual([]);

    events = appendedList(events, [signed("measure_a", ["person_2"])]);
    events = appendedList(events, [signed("measure_b", ["person_9"])]);
    events = appendedList(events, [other("measure_a")]);
    events = appendedList(events, [
      signed("measure_a", ["person_1", "person_3"]),
    ]);
    const later = worldWith(events);
    expect(measureCosponsors(later, id("measure_a"))).toEqual([
      "person_2",
      "person_1",
      "person_3",
    ]);
    expect(measureCosponsors(later, id("measure_b"))).toEqual(["person_9"]);

    // A list copied rather than appended to is read from its own events.
    const copied = worldWith([...events, signed("measure_b", ["person_4"])]);
    expect(measureCosponsors(copied, id("measure_b"))).toEqual([
      "person_9",
      "person_4",
    ]);

    // The early world never sees names signed after it.
    expect(measureCosponsors(early, id("measure_a"))).toEqual([]);
  });

  it("hands back a list the index does not keep adding to", () => {
    let events: readonly Event[] = [signed("measure_c", ["person_5"])];
    const first = measureCosponsors(worldWith(events), id("measure_c"));
    events = appendedList(events, [signed("measure_c", ["person_6"])]);
    expect(measureCosponsors(worldWith(events), id("measure_c"))).toEqual([
      "person_5",
      "person_6",
    ]);
    expect(first).toEqual(["person_5"]);
  });
});
