import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import { SeededRng } from "../rng";
import { STATES } from "../state-reference";
import { outletAssignmentCapacity } from "./desk";
import {
  ensurePressMediaOpening,
  mediaOutlets,
  reporterRoles,
} from "./outlets";
import { MEDIA_ACTIVE_ASSIGNMENT_CAPACITY } from "./records";

const seed = "news-a154-actual-newsroom-capacity";
// A test-place choice among all 56 governments, never an actor's outcome.
const state = new SeededRng(seed).pick(Object.keys(STATES));

describe(`NEWS A154 saved newsroom capacity (${state}, ${seed})`, () => {
  it("supplies no capacity without saved reporter records and never creates staff", () => {
    const base = smallWorld({ place: state, seed, people: 4 });
    const opening = ensurePressMediaOpening(base.world, base.personId);
    const outlet = mediaOutlets(opening)[0]!;
    expect(outlet).toBeDefined();
    expect(reporterRoles(base.world, outlet.id)).toHaveLength(0);
    const before = JSON.stringify(base.world);
    expect(outletAssignmentCapacity(base.world, outlet)).toBe(0);
    expect(JSON.stringify(base.world)).toBe(before);
  });

  it("retains staffed capacity and follows actual saved job endings", () => {
    const base = smallWorld({ place: state, seed, people: 4 });
    let world = ensurePressMediaOpening(base.world, base.personId);
    const outlet = mediaOutlets(world)[0]!;
    const roles = reporterRoles(world, outlet.id);
    expect(roles.length).toBeGreaterThan(0);
    expect(outletAssignmentCapacity(world, outlet)).toBe(
      MEDIA_ACTIVE_ASSIGNMENT_CAPACITY[outlet.resourceTier],
    );
    for (const role of roles) {
      const prior = workStatusAt(world, role.workRelationshipId)!;
      world = recordWorkStatus(world, {
        stableKey: `fixture:news-capacity:end:${role.id}`,
        workRelationshipId: role.workRelationshipId,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: "Controlled recorded job ending for the capacity reader test.",
        provenance: {
          kind: "authored",
          note: "NEWS capacity boundary fixture.",
        },
        supersedesStatusId: prior.id,
      });
    }
    const before = JSON.stringify(world);
    expect(outletAssignmentCapacity(world, outlet)).toBe(0);
    expect(outletAssignmentCapacity(world, outlet)).toBe(0);
    expect(JSON.stringify(world)).toBe(before);
    expect(reporterRoles(world, outlet.id)).toEqual(roles);
  });
});
