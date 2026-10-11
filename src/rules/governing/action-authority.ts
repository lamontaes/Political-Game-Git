// STOPGAP(RULES3-GOV-003): see docs/plans/rules3/governing-stopgaps.json.
// Lifted unchanged from src/simulation/executive-action-authority.ts; RULES-3, 2026-10-11.
import type { ExecutiveAuthorityRulePack } from "../../simulation/executive-authority-rules";
import type { LawDelegationTerm } from "../../simulation/law-consequence-types";
import type { LawInForce } from "../../simulation/governing/law-in-force";
import type { EntityId } from "../../simulation/types";

export type ExecutiveActionClause =
  | {
      readonly kind: "executive-branch-management";
      readonly topicKey:
        "agency-instructions" | "internal-procedure" | "staff-assignments";
    }
  | {
      readonly kind: "delegated-term";
      readonly propositionId: EntityId;
      readonly statuteMeasureId: EntityId;
      readonly delegation: LawDelegationTerm;
      readonly value: number;
    }
  | { readonly kind: "independent-policy"; readonly topicKey: string };

export interface ExecutiveActionAuthorityDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export function resolvedTrue(value: {
  readonly kind: string;
  readonly value?: unknown;
}) {
  return value.kind === "known" && value.value === true;
}

export function decideExecutiveActionAuthority(
  pack: ExecutiveAuthorityRulePack,
  clause: ExecutiveActionClause,
  law: LawInForce | null,
): ExecutiveActionAuthorityDecision {
  if (clause.kind === "executive-branch-management") {
    if (
      resolvedTrue(pack.executiveDirective.hasDirectiveAuthority) &&
      pack.administrative.supervisoryAuthority.kind === "known"
    )
      return {
        allowed: true,
        reason:
          "This instruction manages the executive branch within the office's recorded supervisory authority.",
      };
    return {
      allowed: false,
      reason:
        "This office has no recorded authority to direct this executive-branch matter.",
    };
  }

  if (clause.kind === "delegated-term") {
    const statuteLevel =
      law?.level === "federal-statute" ||
      law?.level === "state-statute" ||
      law?.level === "local-ordinance";
    if (
      !law ||
      !statuteLevel ||
      law.measureId !== clause.statuteMeasureId ||
      !clause.delegation.key.trim() ||
      !clause.delegation.sourceIds.length
    )
      return {
        allowed: false,
        reason:
          "No statute currently in force delegates this term to the executive.",
      };
    if (
      (clause.delegation.minimum !== null &&
        clause.value < clause.delegation.minimum) ||
      (clause.delegation.maximum !== null &&
        clause.value > clause.delegation.maximum)
    )
      return {
        allowed: false,
        reason: `The statute delegates this term only within its recorded range (${clause.delegation.minimum ?? "no lower limit"} to ${clause.delegation.maximum ?? "no upper limit"}${clause.delegation.unit ? ` ${clause.delegation.unit}` : ""}).`,
      };
    return {
      allowed: true,
      reason:
        "This term is within the range the statute delegates to the executive.",
    };
  }

  return {
    allowed: false,
    reason:
      "An executive action cannot create independent policy; the legislature must enact it or a law must delegate the term.",
  };
}
