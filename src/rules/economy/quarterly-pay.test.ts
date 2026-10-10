import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { quarterlyPayFromFacts } from "./quarterly-pay";

const places = lifePlaceStateIdentities();
const placeCases = places.map((place, index) => ({ place, index }));

describe("quarterly payroll from selected transfer facts", () => {
  it.each(placeCases)(
    "normalizes scheduled payroll in the shared path for $place.jurisdictionKey",
    ({ index }) => {
      const amountMinor = 100_000 + index * 1_000;
      const pay = quarterlyPayFromFacts({
        since: "2026-01-01",
        through: "2026-01-31",
        flows: [
          {
            flowId: "payroll",
            organizationId: `organization-${index}`,
            paydaysPerYear: 26,
          },
        ],
        transfers: [
          {
            flowId: "payroll",
            occurredAt: "2025-12-01",
            amountMinor: 999_999,
          },
          {
            flowId: "payroll",
            occurredAt: "2026-01-01",
            amountMinor: 999_999,
          },
          { flowId: "payroll", occurredAt: "2026-01-09", amountMinor },
          { flowId: "payroll", occurredAt: "2026-01-23", amountMinor },
          {
            flowId: "payroll",
            occurredAt: "2026-02-01",
            amountMinor: 999_999,
          },
        ],
      });

      expect(pay.get(`organization-${index}`)).toBeCloseTo(
        (amountMinor / 100) * (26 / 4),
      );
    },
  );

  it("counts distinct payday dates, skips unselected flows, and leaves unscheduled pay unscaled", () => {
    expect(
      quarterlyPayFromFacts({
        since: "2026-04-01",
        through: "2026-06-30",
        flows: [
          {
            flowId: "scheduled",
            organizationId: "shop",
            paydaysPerYear: 24,
          },
          {
            flowId: "unscheduled",
            organizationId: "clinic",
            paydaysPerYear: null,
          },
        ],
        transfers: [
          {
            flowId: "scheduled",
            occurredAt: "2026-04-10",
            amountMinor: 10_000,
          },
          { flowId: "scheduled", occurredAt: "2026-04-10", amountMinor: 5_000 },
          {
            flowId: "scheduled",
            occurredAt: "2026-05-10",
            amountMinor: 15_000,
          },
          {
            flowId: "unscheduled",
            occurredAt: "2026-05-20",
            amountMinor: 12_345,
          },
          { flowId: "other", occurredAt: "2026-05-20", amountMinor: 99_999 },
        ],
      }),
    ).toEqual(
      new Map([
        ["shop", 900],
        ["clinic", 123.45],
      ]),
    );
  });

  it("preserves zero-valued payroll outcomes", () => {
    expect(
      quarterlyPayFromFacts({
        since: "2026-01-01",
        through: "2026-03-31",
        flows: [
          {
            flowId: "zero-pay",
            organizationId: "employer",
            paydaysPerYear: 52,
          },
        ],
        transfers: [
          { flowId: "zero-pay", occurredAt: "2026-01-05", amountMinor: 0 },
        ],
      }),
    ).toEqual(new Map([["employer", 0]]));
  });
});
