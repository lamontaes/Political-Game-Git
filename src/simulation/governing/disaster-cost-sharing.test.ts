import { sponsorPolicyTerms } from "./policy-bill-terms";
import { describe, expect, it } from "vitest";
import { createProductionPolicyCatalog } from "../production-catalog";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type { EntityId, World } from "../types";
import {
  DISASTER_COST_SHARING_QUESTION,
  disasterRepairExpenseDollars,
  disasterRepairUnitCents,
  fundDeclaredDisasterRepair,
} from "./disaster-cost-sharing";
const catalog = createProductionPolicyCatalog();
const question = Object.values(catalog.propositions).find(
  (p) => p.stableKey === DISASTER_COST_SHARING_QUESTION,
)!;
function world(stateKey: string, balance: number, share?: number): World {
  const state = stateJurisdictionForKey(stateKey)!;
  return {
    seed: "disaster-bill-match",
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: catalog,
    jurisdictions: {
      [state.id]: state,
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    history: {
      events: [],
      legislativeMeasures:
        share === undefined
          ? []
          : [
              {
                id: "measure_disaster",
                jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
                propositionIds: [question.id],
                propositionAnswers: [
                  { propositionId: question.id, answer: "yes" },
                ],
                policyTerms: [
                  {
                    questionKey: DISASTER_COST_SHARING_QUESTION,
                    values: { federalShareBasisPoints: share },
                    reason: "Filed federal matching share.",
                    principleRecordIds: [],
                  },
                ],
              },
            ],
      legislativeEnactments:
        share === undefined
          ? []
          : [
              {
                measureId: "measure_disaster",
                effectiveAt: "2026-01-01",
                resolvedAt: "2026-01-01",
                outcome: "enacted",
                sequence: 1,
              },
            ],
    },
    publicBudgets: {
      version: "public-budgets-v1",
      governments: [
        { level: "state", stateKey, balance, reserve: 0, months: [] },
      ],
      unknown: [],
      adjustments: [],
      cursor: { flows: 0, outcomes: 0 },
    },
  } as unknown as World;
}
describe("declared-disaster repairs are paid under the filed cost share", () => {
  it("keeps a sponsor's revision of an existing full federal share within a real 100-percent funding split", () => {
    const base = world("US-NH", 10_000_000, 10000);
    const sponsor = "person_share_sponsor" as EntityId;
    const recorded = {
      ...base,
      history: {
        ...base.history,
        principles: question.principles!.map((bearing, i) => ({
          id: `principle_share_${i}`,
          stableKey: `share-view:${i}`,
          sequence: i + 2,
          personId: sponsor,
          principleId: bearing.principleId,
          formedAt: base.currentDate,
          stance:
            bearing.bearing === "consistent-with"
              ? ("rejects" as const)
              : ("endorses" as const),
          conviction: "settled" as const,
        })),
      },
    } as unknown as World;
    const filed = sponsorPolicyTerms(
      recorded,
      NATIONAL_ELECTION_JURISDICTION.id,
      sponsor,
      [{ propositionId: question.id, answer: "yes" }],
    );
    expect(filed[0]!.values.federalShareBasisPoints).toBe(10000);
    expect(filed[0]!.reason).toContain("controlling bill terms");
    expect(filed[0]!.principleRecordIds.length).toBeGreaterThan(0);
  });
  it("shifts the same work from federal to state dollars in every one of the 56 places", () => {
    for (const place of lifePlaceStateIdentities()) {
      const base = world(place.jurisdictionKey, 10_000_000);
      const law = world(place.jurisdictionKey, 10_000_000, 5000);
      const a = fundDeclaredDisasterRepair(
        base,
        "episode_disaster" as EntityId,
        place.usps,
        0,
        8,
      );
      const b = fundDeclaredDisasterRepair(
        law,
        "episode_disaster" as EntityId,
        place.usps,
        0,
        8,
      );
      expect(a.units).toBe(8);
      expect(b.units).toBe(8);
      const cost =
        disasterRepairUnitCents(base, "episode_disaster" as EntityId) * 8;
      expect(
        b.world.publicBudgets!.disasterRepairs![0]!.stateCents -
          a.world.publicBudgets!.disasterRepairs![0]!.stateCents,
      ).toBe(Math.round(cost * 0.25));
      expect(
        disasterRepairExpenseDollars(
          b.world,
          b.world.currentDate,
          place.jurisdictionKey,
        ),
      ).toBeGreaterThan(
        disasterRepairExpenseDollars(
          a.world,
          a.world.currentDate,
          place.jurisdictionKey,
        ),
      );
      expect(
        disasterRepairExpenseDollars(b.world, b.world.currentDate),
      ).toBeLessThan(
        disasterRepairExpenseDollars(a.world, a.world.currentDate),
      );
    }
  });
  it("repairs fewer units under a tighter state match and does not spend the same money again", () => {
    const base = world("US-NH", 1_000_000);
    const unit = disasterRepairUnitCents(base, "episode_tight" as EntityId);
    const balance = unit / 100;
    const a = fundDeclaredDisasterRepair(
      world("US-NH", balance),
      "episode_tight" as EntityId,
      "NH",
      0,
      8,
    );
    const b = fundDeclaredDisasterRepair(
      world("US-NH", balance, 5000),
      "episode_tight" as EntityId,
      "NH",
      0,
      8,
    );
    expect(a.units).toBe(4);
    expect(b.units).toBe(2);
    expect(
      fundDeclaredDisasterRepair(
        b.world,
        "episode_tight" as EntityId,
        "NH",
        0,
        8,
      ).world,
    ).toBe(b.world);
    expect(
      fundDeclaredDisasterRepair(
        b.world,
        "episode_tight" as EntityId,
        "NH",
        1,
        8,
      ).units,
    ).toBe(0);
    expect(
      disasterRepairExpenseDollars(b.world, makeIsoDate("2026-02-01")),
    ).toBe(0);
  });
});
