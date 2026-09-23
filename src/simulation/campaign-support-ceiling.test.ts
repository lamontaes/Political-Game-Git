import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_SUPPORT_CEILING_BASIS_POINTS,
  effectiveGainBasisPoints,
  quantityBasisPoints,
} from "./campaign-support";
import { candidacyPackForJurisdiction } from "./candidacy";
import { createExplicitGeographyLife } from "../presentation/new-game-geography";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import { passOrdinaryDays } from "../presentation/ordinary-life";

/**
 * A playtest candidate canvassed from 48% to 96% of the vote over sixteen
 * field weeks: every afternoon on the doors moved the same share at 90% as at
 * 40%. Work now moves support at full strength up to half the field and less
 * and less above it, to nothing at the campaign ceiling.
 */
describe("how far campaigning can carry a share", () => {
  it("takes a gain whole below half, shrinks it above half, and gives nothing at the ceiling", () => {
    expect(effectiveGainBasisPoints(3_000, 150)).toBe(150);
    expect(effectiveGainBasisPoints(4_950, 150)).toBe(150);
    expect(effectiveGainBasisPoints(5_500, 150)).toBe(120);
    expect(effectiveGainBasisPoints(6_000, 150)).toBe(90);
    expect(effectiveGainBasisPoints(7_000, 150)).toBe(30);
    expect(effectiveGainBasisPoints(7_500, 150)).toBe(0);
    // A large single gain cannot jump past the ceiling.
    expect(effectiveGainBasisPoints(7_000, 100_000)).toBe(500);
  });

  it("keeps a candidate who works every day below the ceiling", () => {
    const created = createExplicitGeographyLife({
      placeKey: "2743000", // Minneapolis, Minnesota
      seed: "support-ceiling",
      startAge: 40,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const personId = created.game.playerPersonId;
    const office = candidacyPackForJurisdiction(
      created.game.world.people[personId]!.homeJurisdictionId,
    )!.offices.find((candidate) => candidate.officeKey.endsWith(":senate"))!;
    let world = fileForOffice(
      created.game.world,
      personId,
      null,
      office.officeKey,
    );
    let afternoons = 0;
    for (let day = 0; day < 60; day += 1) {
      if (projectCampaign(world, personId).phase !== "active") break;
      try {
        world = spendAnAfternoon(world, personId, "outreach");
        afternoons += 1;
      } catch {
        // A day with no room left for the doors is a day to pass.
      }
      world = passOrdinaryDays(world);
    }
    expect(afternoons).toBeGreaterThan(20);

    const campaign = world.history.campaigns!.find(
      (candidate) => candidate.candidatePersonId === personId,
    )!;
    const segment = campaign.candidateSupportScopes.find(
      (scope) => scope.candidatePersonId === personId,
    )!.segmentKey;
    const shares = world.history.metricStates
      .filter(
        (state) =>
          state.metricId === campaign.supportMetricId &&
          state.scope.segmentKey === segment,
      )
      .map(quantityBasisPoints);
    // Campaigning still works: the candidate gets past half.
    expect(Math.max(...shares)).toBeGreaterThan(5_000);
    expect(Math.max(...shares)).toBeLessThanOrEqual(
      CAMPAIGN_SUPPORT_CEILING_BASIS_POINTS,
    );
  }, 300_000);
});
