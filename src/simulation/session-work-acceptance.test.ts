import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { recruitLifePathPerson } from "./life-paths2";
import { recordKinship } from "./life";
import { recordGoalState } from "./mind";
import { deserializeWorld, serializeWorld } from "./serialization";

function fixture() {
  const place = drawRandomPlace("a143-session-work-consent");
  let world = smallWorld({
    place: place.key,
    people: 4,
    seed: "a143-session-work-consent",
  }).world;
  const actor = world.personOrder[0]!,
    person = world.personOrder[1]!;
  world = recordKinship(world, {
    stableKey: "a143:known-person",
    personIds: [actor, person],
    establishedAt: world.currentDate,
    kind: "collateral:cousin",
    provenance: { kind: "authored", note: "Recorded test family contact." },
  });
  return { world, person };
}

describe("A143 recorded session-work acceptance", () => {
  it("leaves an offer undecided without inventing consent or a work commitment, including after reload", () => {
    const { world, person } = fixture();
    const response = recruitLifePathPerson(
      world,
      person,
      "community-volunteer",
      0,
    );
    expect(response.ok).toBe(false);
    expect(response.world).toBe(world);
    expect(response.message).toContain("not decided");
    const saved = deserializeWorld(serializeWorld(world));
    const repeated = recruitLifePathPerson(
      saved,
      person,
      "community-volunteer",
      0,
    );
    expect(repeated.ok).toBe(false);
    expect(repeated.world).toBe(saved);
    expect(serializeWorld(repeated.world)).toBe(serializeWorld(saved));
  });
  it("uses a recorded livelihood goal to accept the existing session terms", () => {
    const setup = fixture();
    const world = recordGoalState(setup.world, {
      stableKey: "a143:seek",
      goalKey: "life-paths2:seek-work",
      personId: setup.person,
      recordedAt: setup.world.currentDate,
      objective: "Seek suitable work.",
      domain: "work",
      scope: "personal",
      priority: "moderate",
      status: "active",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      provenance: {
        kind: "authored",
        sourceRefs: [],
        note: "Recorded test intention.",
      },
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    const response = recruitLifePathPerson(
      world,
      setup.person,
      "community-volunteer",
      0,
    );
    expect(response.ok).toBe(true);
    expect(response.world.history.events.at(-1)?.type).toBe(
      "life-paths2.offer-accepted",
    );
    expect(response.world.history.workRelationships).toHaveLength(
      world.history.workRelationships.length + 1,
    );
    expect(response.world.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(response.world.history.workItems).toEqual(world.history.workItems);
  });
});
