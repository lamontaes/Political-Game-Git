// Lifted unchanged from src/simulation/executive-authority-rules.ts; RULES-3, 2026-10-11.
import {
  knownRule,
  unknownRule,
  type RuleSourceRef,
  type RuleValue,
} from "./rule-value-constructors";

export type ExecutiveRuleValue<T> = Extract<
  RuleValue<T>,
  { kind: "known" } | { kind: "unknown" }
>;

export function executiveKnown<T>(
  value: T,
  source: RuleSourceRef,
): ExecutiveRuleValue<T> {
  return knownRule(value, source) as ExecutiveRuleValue<T>;
}

export function executiveUnknown<T>(note: string): ExecutiveRuleValue<T> {
  return unknownRule(note) as ExecutiveRuleValue<T>;
}
