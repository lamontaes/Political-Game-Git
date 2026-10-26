// The M1-11 check's rule for who may answer an event: a counted person is
// held to the event's own records like anyone else.
import { describe, expect, it } from "vitest";
import { answeredByNamed, type NamedLookups } from "./m1-11-named";

const homes: Record<string, string> = {
  worker: "h1",
  partner: "h1",
  stranger: "h2",
  full: "h3",
  child: "h3",
};
const lookups: NamedLookups = {
  householdOf: (id) => homes[id],
  kinOf: (id) => (id === "full" ? new Set(["sister"]) : undefined),
  endedCountedWorkers: (eventId) =>
    eventId === "organization.closed:org:2025-03-01" ? ["worker"] : [],
  factKeys: {
    countedSubject: "counted-subject",
    countedPerceivers: "counted-perceivers",
  },
};
const countedLoss = (personId: string) => ({
  personId,
  counted: true as const,
  eventId: "work.job-lost:job:2025-03-01",
  // A counted response carries its own id as the subject.
  event: { subjects: [personId], facts: { "counted-subject": "worker" } },
});

describe("who may answer an event", () => {
  it("accepts the counted worker the event names and their counted household", () => {
    expect(answeredByNamed(countedLoss("worker"), lookups)).toBe(true);
    expect(answeredByNamed(countedLoss("partner"), lookups)).toBe(true);
  });
  it("rejects an unrelated counted person, even though their response names them", () => {
    expect(answeredByNamed(countedLoss("stranger"), lookups)).toBe(false);
  });
  it("accepts the counted workers a closure ended, and no one else counted", () => {
    const closure = (personId: string) => ({
      personId,
      counted: true as const,
      eventId: "organization.closed:org:2025-03-01",
      event: { subjects: [personId] },
    });
    expect(answeredByNamed(closure("worker"), lookups)).toBe(true);
    expect(answeredByNamed(closure("stranger"), lookups)).toBe(false);
  });
  it("accepts a full person the event names, their household and their kin", () => {
    const loss = (personId: string) => ({
      personId,
      eventId: "work.job-lost:job2:2025-03-01",
      event: { subjects: ["full"] },
    });
    expect(answeredByNamed(loss("full"), lookups)).toBe(true);
    expect(answeredByNamed(loss("child"), lookups)).toBe(true);
    expect(answeredByNamed(loss("sister"), lookups)).toBe(true);
    expect(answeredByNamed(loss("stranger"), lookups)).toBe(false);
  });
});
