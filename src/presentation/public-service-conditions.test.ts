import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  commitPublicProgram,
  type PublicProgramAlternative,
} from "../simulation/governing/public-program";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import { forbiddenPlayerPhrasesIn } from "./player-copy";
import {
  DRAFT_A,
  DRAFT_B,
  NO_ACTION,
  city,
  pay,
} from "../../tests/fixtures/public-program-fixture";
import { projectPublicServiceConditions } from "./public-service-conditions";

function days(world: World, count: number): World {
  return advanceWorld(world, count, createCampaignElectionTransitionRegistry());
}

function commit(
  g: ReturnType<typeof city>,
  alternative: PublicProgramAlternative,
) {
  // The committing officer is the sitting APPLICABLE executive, which in this
  // city's compiled record is the appointed manager: it is manager-led, so the
  // manager administers the adopted budget and the mayor does not. Committing
  // as the mayor is refused, correctly — a mayor title alone is not universal
  // expenditure authority — so the fixture goes through that precondition
  // rather than around it. What CHANGE asserts below is unchanged.
  const committed = commitPublicProgram(g.world, {
    appropriationId: g.appropriationId,
    alternative,
    personId: g.manager,
    office: { kind: "municipal", governmentKey: g.governmentKey },
    recipientOrganizationId: alternative.installments.length
      ? g.operator
      : null,
  });
  if (!committed.ok)
    throw new Error(`fixture commitment refused: ${committed.reason}`);
  return committed.world;
}

describe("CHANGE public-service projection over GOVERNING program records", () => {
  it("reads the declared backlog and its recovery only after delivered work", () => {
    const g = city("change-service-b", 2_500_000_00);
    const start = projectPublicServiceConditions(g.world, g.jurisdictionId);
    expect(start).toHaveLength(1);
    const view = start[0]!;
    expect(view.serviceLabel).toBe("City bus service");
    expect(view.backlog).toEqual({ declared: 2, now: 2, change: "unchanged" });
    expect(view.completedPermille).toBe(600);
    expect(view.basisLabel).toBe("Illustrative figures");
    expect(view.funding.posted.minorUnits).toBe(0);

    let world = days(commit(g, DRAFT_B), 89);
    const waiting = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(waiting.capacity).toHaveLength(1);
    expect(waiting.backlog.now).toBe(2);
    expect(waiting.funding.posted.minorUnits).toBe(300_000_00);

    world = days(world, 1);
    const done = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(done.capacity.map((p) => [p.source, p.outOfService])).toEqual([
      ["declared", 2],
      ["after-delivered-work", 0],
    ]);
    expect(done.capacity[1]!.restoredUnits).toBe(2);
    expect(done.backlog).toEqual({ declared: 2, now: 0, change: "reduced" });
    // A completed-trips share is never projected from repaired buses.
    expect(done.completedPermille).toBe(600);
    expect(done.summary).toMatch(/^All 10 buses were in service as of /);
    expect(forbiddenPlayerPhrasesIn(done.summary)).toEqual([]);
  }, 180_000);

  it("no action leaves the backlog where it was and reports no money", () => {
    const g = city("change-service-none", 2_500_000_00);
    const world = days(commit(g, NO_ACTION), 60);
    const view = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(view.backlog.change).toBe("unchanged");
    expect(view.funding.committed.minorUnits).toBe(0);
    expect(view.failures).toEqual([]);
    expect(view.summary).toMatch(/^8 of 10 buses were in service as of /);
  }, 180_000);

  it("shows failed payments with their recorded reason and changes nothing", () => {
    const g = city("change-service-short", 700_000_00);
    let world = pay(
      commit(g, DRAFT_A),
      "change-service-short:other",
      g.account,
      g.payer,
      450_000_00,
    );
    world = days(world, 60);
    const before = JSON.stringify(world);
    const view = projectPublicServiceConditions(world, g.jurisdictionId)[0]!;
    expect(JSON.stringify(world)).toBe(before);
    expect(view.failures).toHaveLength(2);
    expect(view.failures[0]!.reason).toMatch(/not cash/);
    // Other places see none of this program.
    const elsewhere = Object.keys(world.jurisdictions).find(
      (id) => id !== g.jurisdictionId,
    );
    if (elsewhere)
      expect(
        projectPublicServiceConditions(world, elsewhere as EntityId),
      ).toEqual([]);
  }, 180_000);
});
