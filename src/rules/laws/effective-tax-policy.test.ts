import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { effectiveTaxPolicy as legacyEffectiveTaxPolicy } from "../../simulation/tax-policy";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { makeIsoDate } from "../../simulation/dates";
import { effectiveTaxPolicyFromFacts } from "./effective-tax-policy";

const seriesKey = "sales";
const effectiveAt = makeIsoDate("2026-01-01");
const currentDate = makeIsoDate("2026-03-01");
const policies = [
  {
    id: "p-old",
    seriesKey,
    effectiveAt,
    recordedAt: makeIsoDate("2025-12-01"),
    sequence: 1,
  },
  {
    id: "p-later-seq",
    seriesKey,
    effectiveAt,
    recordedAt: makeIsoDate("2026-02-01"),
    sequence: 3,
  },
  {
    id: "p-future-record",
    seriesKey,
    effectiveAt,
    recordedAt: makeIsoDate("2026-04-01"),
    sequence: 4,
  },
  {
    id: "p-future-effective",
    seriesKey,
    effectiveAt: makeIsoDate("2026-04-01"),
    recordedAt: makeIsoDate("2026-01-01"),
    sequence: 5,
  },
  {
    id: "p-other-series",
    seriesKey: "income",
    effectiveAt,
    recordedAt: makeIsoDate("2026-01-01"),
    sequence: 6,
  },
];

describe("effective tax policy rule", () => {
  it.each(lifePlaceStateIdentities())(
    "matches the legacy series selector in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const { world, jurisdictionId } = smallWorld({
        place: jurisdictionKey,
        date: currentDate,
        seed: `effective-tax-policy:${jurisdictionKey}`,
      });
      const proposalIds = new Map(
        policies.map((policy) => [policy.id, `proposal-${policy.id}`]),
      );
      const proposals = policies.map((policy) => ({
        id: proposalIds.get(policy.id)!,
        jurisdictionId,
        terms: { seriesKey: policy.seriesKey },
      }));
      const legacyPolicies = policies.map((policy) => ({
        id: policy.id,
        stableKey: policy.id,
        sequence: policy.sequence,
        recordedAt: policy.recordedAt,
        proposalId: proposalIds.get(policy.id)!,
        effectiveAt: policy.effectiveAt,
      }));
      const withPolicies = {
        ...world,
        history: {
          ...world.history,
          taxProposals: proposals,
          taxPolicies: legacyPolicies,
        },
      } as typeof world;
      expect(
        effectiveTaxPolicyFromFacts(
          policies,
          seriesKey,
          effectiveAt,
          currentDate,
        )?.id,
      ).toEqual(
        legacyEffectiveTaxPolicy(
          withPolicies,
          jurisdictionId,
          seriesKey,
          effectiveAt,
        )?.id,
      );
    },
  );
});
