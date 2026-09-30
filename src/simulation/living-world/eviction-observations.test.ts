import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { recordWorldEvent } from "../world";
import type { EventType, World } from "../types";
import { evictionCaseObservations } from "./eviction-observations";

function event(
  world: World,
  key: string,
  type: EventType,
  flow: string,
): World {
  return recordWorldEvent(world, {
    stableKey: key,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [world.personOrder[0]!],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: [`town-rent-v1:lease:${flow}`],
    summary: "Fixture housing case.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("held eviction proof observations", () => {
  it("returns an empty cohort without inventing a rate or missing case", () => {
    expect(evictionCaseObservations(createDemoWorld("eviction-none"))).toEqual(
      [],
    );
  });
  it("keeps serial filings distinct and open cases separate from orders", () => {
    let world = createDemoWorld("eviction-serial");
    world = event(world, "first", "housing.eviction-filed", "flow");
    const firstId = world.history.events.at(-1)!.id;
    world = event(world, "resolved", "housing.eviction-settled", "flow");
    const resolutionId = world.history.events.at(-1)!.id;
    world = event(world, "second", "housing.eviction-filed", "flow");
    const secondId = world.history.events.at(-1)!.id;
    const before = JSON.stringify(world);
    const rows = evictionCaseObservations(world);
    expect(rows.map((row) => row.caseId)).toEqual([firstId, secondId]);
    expect(rows[0]!.resolution).toMatchObject({
      state: "resolved",
      event: { id: resolutionId },
    });
    expect(rows[1]!.resolution).toEqual({ state: "open" });
    expect(rows.every((row) => row.lease.state === "unavailable")).toBe(true);
    expect(
      rows.every((row) => row.publicCourtRecord.state === "unavailable"),
    ).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
    expect(evictionCaseObservations(JSON.parse(before) as World)).toEqual(rows);
  });
  it("ignores unrelated housing events and never calls them case resolutions", () => {
    let world = createDemoWorld("eviction-resolution-boundary");
    world = event(world, "filing", "housing.eviction-filed", "flow");
    world = event(world, "other", "housing.rent-paid", "flow");
    expect(evictionCaseObservations(world)[0]!.resolution).toEqual({
      state: "open",
    });
    world = event(world, "order", "housing.evicted", "flow");
    expect(evictionCaseObservations(world)[0]!.resolution).toMatchObject({
      state: "resolved",
      event: { type: "housing.evicted" },
    });
  });
});
