import { describe, expect, it } from "vitest";
import { ageOnDate } from "../dates";
import { createDemoWorld } from "../demo";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import type { World } from "../types";
import { recordPublicEvictionOrder } from "./eviction-order-record";

function fixture(): World {
  const world = createDemoWorld("held-eviction-public-record");
  const adult = world.personOrder.find(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  )!;
  return recordWorldEvent(world, {
    stableKey: "fixture:filing",
    type: "housing.eviction-filed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[adult]!.homeJurisdictionId,
    involvedEntityIds: [adult],
    participants: [{ personId: adult, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["town-rent-v1:lease:fixture-flow"],
    summary: "The landlord filed for unpaid rent.",
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
function ordered(world: World): World {
  const filing = world.history.events.at(-1)!;
  return recordWorldEvent(world, {
    ...filing,
    stableKey: "fixture:order",
    type: "housing.evicted",
    summary: "The court ordered the tenant to leave for unpaid rent.",
  });
}

describe("held public eviction order", () => {
  it("preserves original history and links a public order to its actual case", () => {
    const source = ordered(fixture());
    const before = JSON.stringify(source);
    const filing = source.history.events.at(-2)!;
    const order = source.history.events.at(-1)!;
    const next = recordPublicEvictionOrder(source, order.id, "The trial court");
    const record = next.history.events.at(-1)!;
    expect(record.visibility).toBe("public");
    expect(record.tags).toContain(`eviction:case:${filing.id}`);
    expect(record.tags).toContain(`eviction:order:${order.id}`);
    expect(record.participants).toEqual(order.participants);
    expect(next.history.events.slice(0, -1)).toEqual(source.history.events);
    expect(JSON.stringify(source)).toBe(before);
    assertWorldIntegrity(next);
    expect(recordPublicEvictionOrder(next, order.id, "The trial court")).toBe(
      next,
    );
    const continued = JSON.parse(JSON.stringify(next)) as World;
    expect(
      recordPublicEvictionOrder(continued, order.id, "The trial court"),
    ).toBe(continued);
  });
  it("refuses a filing without an order", () => {
    const source = fixture();
    expect(() =>
      recordPublicEvictionOrder(
        source,
        source.history.events.at(-1)!.id,
        "The court",
      ),
    ).toThrow("recorded eviction");
  });
  it("refuses an order without a matching filing", () => {
    const source = ordered(fixture());
    const order = source.history.events.at(-1)!;
    const unrelated = {
      ...source,
      history: {
        ...source.history,
        events: source.history.events.filter(
          (event) => event.type !== "housing.eviction-filed",
        ),
      },
    };
    expect(() =>
      recordPublicEvictionOrder(unrelated, order.id, "The court"),
    ).toThrow("recorded filing");
  });
  it("does not attach unrelated adults as tenant respondents", () => {
    const source = ordered(fixture());
    const order = source.history.events.at(-1)!;
    const next = recordPublicEvictionOrder(source, order.id, "The court");
    expect(
      next.history.events.at(-1)!.participants.map((row) => row.personId),
    ).toEqual(order.participants.map((row) => row.personId));
  });
});
