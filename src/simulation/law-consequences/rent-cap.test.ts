import { afterEach, describe, expect, it, vi } from "vitest";
import { rentalFixture } from "../../../tests/fixtures/rental-cap-world";
import { STATES } from "../state-reference";
import { SeededRng } from "../rng";
import { resourceFlowTermsAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { renewTownLeases, renewedMarketRent } from "../living-world/town-rent";
import { rentalCapForFlow, RENT_CAP_CONSEQUENCE } from "./rent-cap";
import type { RentalPriceRule } from "../law-consequence-types";

const seed = "team4-r6-canonical-cap-all56";
const available = Object.keys(STATES);
const rng = new SeededRng(seed);
const selected: string[] = [];
while (selected.length < 5) {
  const place = rng.pick(available);
  if (!selected.includes(place)) selected.push(place);
}
const fixed = (ratio: number): RentalPriceRule => ({
  cap: {
    op: "constant",
    value: ratio,
    unit: "ratio",
    sourceIds: ["authored:controlled-numeric-rule"],
  },
  coverage: {
    minimumBuildingAgeYears: 15,
    exemptions: ["affordable-program-adjustment"],
  },
});
afterEach(() => vi.restoreAllMocks());

describe.each(selected)("production rental cap in %s", (place) => {
  it("uses the canonical production row on an actual saved renewal and preserves receipts on reload", () => {
    expect(available).toHaveLength(56);
    const f = rentalFixture(place, fixed(0.08));
    expect(
      f.world.policyCatalog.propositions[
        Object.keys(f.world.policyCatalog.propositions).find((id) =>
          f.world.policyCatalog.propositions[id]!.consequences?.some(
            (row) => row.id === RENT_CAP_CONSEQUENCE.id,
          ),
        )!
      ]!.consequences,
    ).toContainEqual(RENT_CAP_CONSEQUENCE);
    const next = renewTownLeases(f.world, f.day);
    const terms = resourceFlowTermsAt(next, f.lease.flow.id)!;
    expect(terms.amount.minorUnits).toBe(108_000);
    expect(terms.lawEffectStamps?.[0]?.effectKind).toBe("price-cost");
    expect(terms.lawEffectStamps?.[0]?.sourceRecordIds).toContain(
      f.lease.flow.id,
    );
    expect(next.history.resourceTransferOutcomes).toEqual(
      f.world.history.resourceTransferOutcomes,
    );
    expect(renewTownLeases(next, f.day)).toBe(next);
    const reopened = deserializeWorld(serializeWorld(next));
    expect(renewTownLeases(reopened, f.day)).toBe(reopened);
    expect(resourceFlowTermsAt(reopened, f.lease.flow.id)).toEqual(terms);
    console.info(
      `R6 place=${place} seed=${seed}: saved proposal140000 cap8%=108000 USD minor, actual price-cost stamp; authored coverage, no political enactment claim.`,
    );
  });
  it("evaluates the single typed index-plus-percent expression with its ceiling", () => {
    const rule: RentalPriceRule = {
      ...fixed(0.08),
      cap: {
        op: "minimum",
        operands: [
          {
            op: "sum",
            operands: [
              { op: "record", key: "statutory-index-change", unit: "ratio" },
              {
                op: "constant",
                value: 0.05,
                unit: "ratio",
                sourceIds: ["authored:cap-term"],
              },
            ],
          },
          {
            op: "constant",
            value: 0.1,
            unit: "ratio",
            sourceIds: ["authored:cap-term"],
          },
        ],
      },
      index: {
        changeRatio: 0.08,
        publishedAt: "2026-09-30",
        from: "2027-01-01",
        through: "2027-12-31",
        source: "authored:controlled-published-index",
      },
    };
    const f = rentalFixture(place, rule);
    expect(renewedMarketRent(100_000, 1.4, f.input).cap).toBeCloseTo(0.1);
    expect(
      resourceFlowTermsAt(renewTownLeases(f.world, f.day), f.lease.flow.id)!
        .amount.minorUnits,
    ).toBe(110_000);
  });
  it("preserves the contract when the statutory index is absent rather than using macro inflation", () => {
    const f = rentalFixture(place, {
      ...fixed(0.08),
      cap: { op: "record", key: "statutory-index-change", unit: "ratio" },
    });
    expect(renewTownLeases(f.world, f.day)).toBe(f.world);
  });
  it("does not substitute establishedAt for a missing occupancy certificate", () => {
    const f = rentalFixture(place, fixed(0.08));
    const world = {
      ...f.world,
      history: {
        ...f.world.history,
        dwellings: f.world.history.dwellings.map((row) =>
          row.id === f.lease.dwellingId
            ? { ...row, rentalRegulationFacts: undefined }
            : row,
        ),
      },
    };
    expect(renewTownLeases(world, f.day)).toBe(world);
  });
  it("honors the rule's own recorded exemption and leaves the proposal uncapped", () => {
    const f = rentalFixture(place, fixed(0.08));
    const world = {
      ...f.world,
      history: {
        ...f.world.history,
        dwellings: f.world.history.dwellings.map((row) =>
          row.id === f.lease.dwellingId
            ? {
                ...row,
                rentalRegulationFacts: {
                  ...row.rentalRegulationFacts!,
                  exemptions: { "affordable-program-adjustment": true },
                },
              }
            : row,
        ),
      },
    };
    expect(
      resourceFlowTermsAt(renewTownLeases(world, f.day), f.lease.flow.id)!
        .amount.minorUnits,
    ).toBe(140_000);
  });
  it("refuses a published limit outside its actual period", () => {
    const f = rentalFixture(place, { ...fixed(0.08), through: "2026-12-31" });
    expect(
      rentalCapForFlow(
        f.world,
        f.lease.flow,
        f.input.law,
        "us-policy-positions:housing-land-use.rent-stabilization",
        f.day,
      )?.coverage,
    ).toBe("unresolved");
    expect(renewTownLeases(f.world, f.day)).toBe(f.world);
  });
});
