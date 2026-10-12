import { lawLevelRank } from "./law-in-force";
import type { EnactedRuleChange } from "../../simulation/enacted-rule-changes";
export function ruleChangeInForce(
  inForce: readonly EnactedRuleChange[],
): EnactedRuleChange | null {
  if (inForce.length === 0) return null;
  const top = Math.max(...inForce.map((change) => lawLevelRank(change.level)));
  return (
    inForce.filter((change) => lawLevelRank(change.level) === top).at(-1) ??
    null
  );
}
