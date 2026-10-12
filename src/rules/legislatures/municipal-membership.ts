import type { EntityId, IsoDate, World } from "../../simulation/types";
import type {
  MunicipalRole,
  MunicipalSeat,
} from "../../simulation/municipal-public-work";
export interface MunicipalMembershipFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly organization: { readonly id: EntityId } | null;
  readonly participations: World["history"]["organizationParticipations"];
  readonly states: World["history"]["organizationParticipationStates"];
}
const SEAT_ROLE_KINDS: Readonly<Record<string, MunicipalRole>> = {
  "leader:municipal-member": "member",
  "leader:municipal-presiding-member": "presiding-member",
  "leader:municipal-mayor": "mayor",
  "leader:municipal-manager": "professional-manager",
  "leader:municipal-clerk": "clerk",
};

function latestParticipationState(
  facts: MunicipalMembershipFacts,
  participationId: EntityId,
) {
  return facts.states
    .filter((row) => row.participationId === participationId)
    .filter(
      (state) =>
        state.effectiveAt <= facts.onDate &&
        state.sequence < facts.nextSequence,
    )
    .reduce<(typeof facts.states)[number] | null>(
      (latest, state) =>
        latest === null || state.sequence > latest.sequence ? state : latest,
      null,
    );
}

export function municipalSeats(
  facts: MunicipalMembershipFacts,
  governmentKey: string,
): readonly MunicipalSeat[] {
  void governmentKey; // The facts adapter resolves this exact government’s organization.
  const organization = facts.organization;
  if (!organization) return [];
  const seats: MunicipalSeat[] = [];
  for (const participation of facts.participations.filter(
    (row) => row.organizationId === organization.id,
  )) {
    if (
      participation.startedAt > facts.onDate ||
      participation.recordedAt > facts.onDate
    )
      continue;
    const state = latestParticipationState(facts, participation.id);
    if (!state || state.status !== "active" || !state.roleKind) continue;
    const role = SEAT_ROLE_KINDS[state.roleKind];
    if (!role) continue;
    seats.push({
      participationId: participation.id,
      personId: participation.personId,
      role,
      seatLabel: state.context,
    });
  }
  return seats.sort((left, right) =>
    left.personId.localeCompare(right.personId),
  );
}
export function municipalIntroductionRoles(
  facts: MunicipalMembershipFacts,
  personId: EntityId,
): readonly MunicipalRole[] {
  if (!facts.organization) return [];
  const roles: MunicipalRole[] = [];
  for (const participation of facts.participations) {
    if (
      participation.personId !== personId ||
      participation.organizationId !== facts.organization.id ||
      participation.sequence >= facts.nextSequence ||
      (participation.startedAt < participation.recordedAt
        ? participation.startedAt
        : participation.recordedAt) > facts.onDate ||
      participation.startedAt > facts.onDate
    )
      continue;
    const at = facts.states
      .filter(
        (row) =>
          row.participationId === participation.id &&
          row.sequence < facts.nextSequence &&
          row.effectiveAt <= facts.onDate,
      )
      .sort(
        (a, b) =>
          a.effectiveAt.localeCompare(b.effectiveAt) || a.sequence - b.sequence,
      )
      .at(-1);
    if (at?.status !== "active") continue;
    const state = latestParticipationState(facts, participation.id);
    if (state?.status !== "active") continue;
    const role = state.roleKind ? SEAT_ROLE_KINDS[state.roleKind] : undefined;
    if (role && !roles.includes(role)) roles.push(role);
  }
  return roles;
}
