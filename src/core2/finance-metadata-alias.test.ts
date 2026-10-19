/** Technical metadata identity and stale-payload guards; no generated-world claim. */
import { describe, expect, it } from "vitest";
import { FinanceMetadataComposer, FinanceReadGuard } from "./finance-plan";
import { P } from "./parameters";

function composer() {
  return new FinanceMetadataComposer(
    new FinanceReadGuard(),
    new FinanceReadGuard(),
    P.zero,
    P.one,
  );
}

describe("same-plan canonical metadata aliases", () => {
  it("reuses an already staged component inside its aggregate", () => {
    const plan = composer(),
      target = new Map<string, unknown>();
    const original = { id: "fixture:component", paidMinor: P.one };
    const component = plan.mapSet(target, original.id, original);
    const aggregate = plan.mapSet(target, "fixture:aggregate", {
      components: [component],
    });
    expect(component).not.toBe(original);
    expect(aggregate.components[P.zero]).toBe(component);
    expect(Object.isFrozen(component)).toBe(true);
    expect(plan.finish()).toHaveLength(P.one + P.one);
    expect(target.size).toBe(P.zero);
  });

  it("still detaches arbitrary caller-frozen rows and their mutable children", () => {
    const plan = composer(),
      target = new Map<string, unknown>();
    const child = { amount: P.one },
      original = Object.freeze({ child });
    const staged = plan.mapSet(target, "fixture:caller", original);
    child.amount += P.one;
    expect(staged).not.toBe(original);
    expect(staged.child).not.toBe(child);
    expect(staged.child.amount).toBe(P.one);
    expect(plan.finish()).toHaveLength(P.one);
  });

  it("retains final payload checks for reused native Map contents", () => {
    const plan = composer(),
      target = new Map<string, unknown>();
    const component = plan.mapSet(
      target,
      "fixture:map",
      new Map([["amount", P.one]]),
    );
    const aggregate = plan.mapSet(target, "fixture:aggregate", { component });
    expect(aggregate.component).toBe(component);
    component.set("amount", P.one + P.one);
    expect(() => plan.finish()).toThrow(
      "Stale finance next-payload map contents",
    );
    expect(target.size).toBe(P.zero);
  });
});
