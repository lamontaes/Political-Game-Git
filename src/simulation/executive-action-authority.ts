import type { ExecutiveAuthorityRulePack } from "./executive-authority-rules";
import type { LawDelegationTerm } from "./law-consequence-types";
import type { LawInForce } from "./governing/law-in-force";
import type { EntityId } from "./types";

export type ExecutiveActionClause =
  | {
      readonly kind: "emergency-declaration";
      readonly topicKey: string;
    }
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
  | {
      readonly kind: "enforcement-priority";
      readonly propositionId: EntityId;
      readonly statuteMeasureId: EntityId;
      readonly priority: "first" | "ordinary" | "lowest";
    }
  | { readonly kind: "independent-policy"; readonly topicKey: string };

export interface ExecutiveActionAuthorityDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

function resolvedTrue(value: {
  readonly kind: string;
  readonly value?: unknown;
}) {
  return value.kind === "known" && value.value === true;
}

/**
 * Checks an order or regulation clause against the office's profile and the
 * law that delegates it. Every refusal carries the reason shown to the player.
 */
export function decideExecutiveActionAuthority(
  pack: ExecutiveAuthorityRulePack,
  clause: ExecutiveActionClause,
  law: LawInForce | null,
): ExecutiveActionAuthorityDecision {
  if (clause.kind === "emergency-declaration") {
    const rule = pack.emergencyDeclaration.executiveMayDeclare;
    return rule.kind === "known" && rule.value
      ? {
          allowed: true,
          reason: "This office has recorded authority to declare an emergency.",
        }
      : {
          allowed: false,
          reason:
            rule.kind === "known"
              ? "This office's recorded rules do not authorize an emergency declaration."
              : "This office has no recorded authority to declare an emergency.",
        };
  }
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

  if (clause.kind === "enforcement-priority") {
    if (
      !law ||
      law.measureId !== clause.statuteMeasureId ||
      (law.level !== "federal-statute" &&
        law.level !== "state-statute" &&
        law.level !== "local-ordinance")
    )
      return {
        allowed: false,
        reason:
          "Enforcement priority can be set only for a statute currently in force.",
      };
    const duty = pack.administrative.faithfulExecutionDuty;
    return duty.kind === "known" && duty.value
      ? {
          allowed: true,
          reason:
            "This office may order enforcement work while faithfully executing the statute.",
        }
      : {
          allowed: false,
          reason:
            "This office has no recorded faithful-execution authority for this enforcement directive.",
        };
  }

  return {
    allowed: false,
    reason:
      "An executive action cannot create independent policy; the legislature must enact it or a law must delegate the term.",
  };
}
