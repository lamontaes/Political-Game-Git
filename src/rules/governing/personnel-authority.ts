// Lifted unchanged from src/simulation/civil-personnel-actions.ts; RULES-3, 2026-10-11.
import type {
  EntityId,
  IsoDate,
  PersonnelAuthorityDesignationRecord,
  PersonnelPower,
} from "../../simulation/types";

export type PersonnelAuthorityResolution =
  | {
      readonly ok: true;
      readonly designation: PersonnelAuthorityDesignationRecord;
    }
  | { readonly ok: false; readonly reason: string };

export function personnelAuthority(
  facts: {
    readonly alive: boolean;
    readonly today: IsoDate;
    readonly designations: readonly PersonnelAuthorityDesignationRecord[];
    readonly roles: readonly {
      readonly participation: { readonly organizationId: EntityId };
      readonly state: { readonly roleKind: string };
    }[];
  },
  power: PersonnelPower,
  target: {
    readonly organizationId: EntityId | null;
    readonly jurisdictionKey: string;
  },
): PersonnelAuthorityResolution {
  if (!facts.alive)
    return { ok: false, reason: "Only a living person can act." };
  const designations = facts.designations.filter(
    (d) =>
      d.power === power &&
      d.jurisdictionKey === target.jurisdictionKey &&
      d.recordedAt <= facts.today &&
      (d.scope === "jurisdiction" ||
        d.organizationId === target.organizationId),
  );
  if (designations.length === 0)
    return {
      ok: false,
      reason:
        power === "appointing-authority"
          ? "No appointing authority is established for this employer. Acquired law names none, and no charter designates one."
          : "No holder of this statutory office is established in this world.",
    };
  const roles = facts.roles;
  const designation = designations.find((d) =>
    roles.some(
      (r) =>
        r.participation.organizationId === d.organizationId &&
        r.state.roleKind === d.roleKind,
    ),
  );
  if (!designation)
    return {
      ok: false,
      reason:
        power === "appointing-authority"
          ? "You do not hold this employer's designated appointing-authority role."
          : "You do not hold the statutory office that makes this decision.",
    };
  return { ok: true, designation };
}
