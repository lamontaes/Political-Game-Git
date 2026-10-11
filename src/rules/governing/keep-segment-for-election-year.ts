// Lifted unchanged from src/simulation/nationwide-world/executive-term-rules-in-world.ts; RULES-3, 2026-10-11.
import type { EnactedRuleChange } from "../../simulation/enacted-rule-changes";
import type { EntityId, IsoDate } from "../../simulation/types";
import type { StateExecutiveTermRule } from "../../simulation/nationwide-world/state-executive-term-rules";

export interface AppliedExecutiveTermChange {
  readonly field: "executive.term.years";
  readonly value: number;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly instrument: EnactedRuleChange["instrument"];
  /** When the law took effect. */
  readonly operativeAt: IsoDate;
  /** The first term the change reaches begins here. */
  readonly firstTermStartsAt: IsoDate;
  /**
   * True when the law asked to reach the sitting term and the game applied it
   * from the next term instead, because moving a sitting term is not modeled.
   */
  readonly deferredFromImmediate: boolean;
}

export interface StateExecutiveTermRuleInWorld extends StateExecutiveTermRule {
  /** Empty when the World's law has never changed this office's term. */
  readonly enactedChanges: readonly AppliedExecutiveTermChange[];
}

export interface TermSegment {
  /** Elections from this year on follow `rule`; null for the compiled rule. */
  readonly fromElectionYear: number | null;
  readonly rule: StateExecutiveTermRuleInWorld;
}

export function segmentForElectionYear(
  segments: readonly TermSegment[],
  year: number,
): TermSegment {
  return (
    [...segments]
      .reverse()
      .find(
        (segment) =>
          segment.fromElectionYear === null || segment.fromElectionYear <= year,
      ) ?? segments[0]!
  );
}
