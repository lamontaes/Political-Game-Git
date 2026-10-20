/**
 * A handler whose mechanic is "none" or "records" is an unregistered
 * placeholder (owner, Oct 13: an effect is a read, not a record). This guard
 * lists every such law-reach policy and requires it to name a stopgap row
 * that is still open, so none can sit in the data unregistered. The only
 * exceptions are the two whose effect is read by another engine; each names
 * who reads it (the sales tax has a mechanic of its own now).
 */
import { describe, expect, it } from "vitest";
import groupA from "./data/laws/reach-group-a.json" with { type: "json" };
import groupB from "./data/laws/reach-group-b.json" with { type: "json" };
import stopgaps from "./data/stopgaps.json" with { type: "json" };

interface Policy {
  mechanic?: string;
  stopgapId?: string;
}

const READ_ELSEWHERE: Readonly<Record<string, string>> = {
  "minimum-wage":
    "laws.ts raises every job under the floor on its effective date",
  "us-policy-positions:fiscal.exempt-groceries-from-sales-tax":
    "budgets exempts groceries through setPurchaseTax where the exemption is law (SG-GOV-REACH-B-sales-tax-collection, resolved)",
};

const rows = (
  Array.isArray(stopgaps)
    ? stopgaps
    : ((stopgaps as { stopgaps?: unknown[] }).stopgaps ?? [])
) as { id: string; status: string }[];
const open = new Set(
  rows.filter((row) => row.status === "open").map((row) => row.id),
);

const placeholders = [groupA, groupB].flatMap((group) =>
  Object.entries(
    (group as unknown as { policies: Record<string, Policy> }).policies,
  ).filter(
    ([, policy]) => policy.mechanic === "none" || policy.mechanic === "records",
  ),
);

describe("law-reach placeholders are registered", () => {
  it("finds the placeholders to check", () => {
    expect(placeholders.length).toBeGreaterThan(0);
  });
  it("every none or records policy names an open stopgap, or is read by another engine", () => {
    const unregistered = placeholders
      .filter(
        ([key, policy]) =>
          !READ_ELSEWHERE[key] && !open.has(policy.stopgapId ?? ""),
      )
      .map(([key]) => key);
    expect(unregistered).toEqual([]);
  });
  it("the exceptions are real policies that still carry no mechanic", () => {
    const keys = new Set(placeholders.map(([key]) => key));
    for (const key of Object.keys(READ_ELSEWHERE))
      expect(keys.has(key), `${key} is no longer a placeholder`).toBe(true);
  });
});
