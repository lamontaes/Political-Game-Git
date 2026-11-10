/**
 * A household record can stand for more or fewer households: a move changes
 * a count, not the number of records. No world: a store, one record, one job.
 */
import { describe, expect, it } from "vitest";
import { CountedStore } from "./counted-groups";
import type { JobInput, PersonInput } from "./types";

const source = {
  tag: "SOURCED",
  asOf: "2026-01-01",
  citation: "test",
} as never;

const person = (id: string): PersonInput => ({
  id: id as never,
  givenName: "A",
  familyName: "B",
  birthDate: "1990-01-01" as never,
  placeId: "place:test" as never,
  householdId: "hh:test",
  tier: "husk",
  traits: {},
  liquidMinor: 0,
  livingCostDailyMinor: 0,
  source,
  familyIds: [],
  knownIds: [],
});

const job = (personId: string): JobInput => ({
  id: "job:1",
  personId: personId as never,
  organizationId: "org:1",
  title: "clerk",
  wageDailyMinor: 100,
  hoursDaily: 8,
  source,
});

function build(weight: number) {
  const store = new CountedStore();
  const h = store.addHousehold(
    {
      household: {
        id: "hh:test",
        placeId: "place:test" as never,
        memberIds: ["p:1", "p:2"] as never,
        source,
      },
      people: [person("p:1"), person("p:2")],
      jobs: [job("p:1")],
      workCommitments: [],
      contracts: [],
    },
    { tenure: "rent", unplacedWorkers: 0, weight },
  );
  return { store, h };
}

describe("changeWeight", () => {
  it("raises the people, holds the recorded job's heads and wages, and bumps what readers key on", () => {
    const { store, h } = build(4);
    const wagesBefore = store.wagesOf(h) * store.weightOf(h);
    const members = store.membersVersion,
      version = store.version;
    expect(store.weightedCount(h)).toBe(8);
    expect(store.changeWeight(h, 3)).toBe(7);
    expect(store.weightedCount(h)).toBe(14);
    expect(store.headsOfJob(h, "job:1")).toBe(4);
    expect(store.wagesOf(h) * store.weightOf(h)).toBeCloseTo(wagesBefore, -1);
    expect(store.membersVersion).toBeGreaterThan(members);
    expect(store.version).toBeGreaterThan(version);
  });

  it("lowers the people and scales pinned job heads in proportion", () => {
    const { store, h } = build(4);
    store.changeWeight(h, 4);
    expect(store.headsOfJob(h, "job:1")).toBe(4);
    store.changeWeight(h, -4);
    expect(store.weightOf(h)).toBe(4);
    expect(store.headsOfJob(h, "job:1")).toBe(2);
    expect(store.weightedCount(h)).toBe(8);
    expect(store.wagesOf(h) * store.weightOf(h)).toBeCloseTo(100 * 365 * 2, -1);
  });

  it("never goes below zero and does nothing for a change of zero", () => {
    const { store, h } = build(2);
    const version = store.version;
    expect(store.changeWeight(h, 0)).toBe(2);
    expect(store.version).toBe(version);
    expect(store.changeWeight(h, -5)).toBe(0);
    expect(store.weightedCount(h)).toBe(0);
    expect(h.wagesMinorYear).toBe(0);
  });
});
