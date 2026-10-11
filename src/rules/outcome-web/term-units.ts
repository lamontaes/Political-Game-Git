import type { LawAmountExpression, LawAmountUnit } from "./amount-types";
export function payTermUnits(
  expression: LawAmountExpression,
): ReadonlyMap<string, LawAmountUnit> {
  const units = new Map<string, LawAmountUnit>();
  const visit = (node: LawAmountExpression): void => {
    switch (node.op) {
      case "term":
        if (units.has(node.key) && units.get(node.key) !== node.unit)
          throw new Error(`Pay term '${node.key}' has conflicting units`);
        units.set(node.key, node.unit);
        return;
      case "sum":
      case "minimum":
      case "maximum":
        node.operands.forEach(visit);
        return;
      case "difference":
      case "product":
      case "ratio":
        visit(node.left);
        visit(node.right);
        return;
      default:
        return;
    }
  };
  visit(expression);
  return units;
}

export function priceCostTermUnits(
  expression: LawAmountExpression,
): ReadonlyMap<string, LawAmountUnit> {
  const units = new Map<string, LawAmountUnit>();
  function visit(node: LawAmountExpression): void {
    switch (node.op) {
      case "term": {
        const prior = units.get(node.key);
        if (prior && prior !== node.unit)
          throw new Error(
            `Price-cost term '${node.key}' has conflicting units`,
          );
        units.set(node.key, node.unit);
        return;
      }
      case "sum":
      case "minimum":
      case "maximum":
        node.operands.forEach(visit);
        return;
      case "difference":
      case "product":
      case "ratio":
        visit(node.left);
        visit(node.right);
        return;
      default:
        return;
    }
  }
  visit(expression);
  return units;
}
