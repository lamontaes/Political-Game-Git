import type { EntityId } from "../types";

export interface AgendaMember {
  readonly personId: EntityId | null;
  readonly partyKey?: string | null;
}

/** The largest caucus manages the agenda, including a plurality chamber. */
export function agendaCaucus<T extends AgendaMember>(
  members: readonly T[],
): readonly T[] {
  const groups = new Map<string, T[]>();
  for (const member of members) {
    if (!member.personId || !member.partyKey) continue;
    const group = groups.get(member.partyKey) ?? [];
    group.push(member);
    groups.set(member.partyKey, group);
  }
  const caucuses = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  // Nonpartisan bodies deliberate as one body rather than inventing parties.
  return caucuses[0]?.[1] ?? members.filter((m) => m.personId !== null);
}

/** Proposals are each member's best open bill; backing reads their own views. */
export function majorityAgendaChoice<T extends AgendaMember, P>(
  members: readonly T[],
  caucus: readonly T[],
  proposals: readonly {
    readonly sponsor: T;
    readonly proposal: P;
    readonly pressure: number;
  }[],
  supports: (member: T, proposal: P) => boolean,
): {
  readonly sponsor: T;
  readonly proposal: P;
  readonly pressure: number;
  readonly caucusBackers: number;
  readonly chamberBackers: number;
} | null {
  for (const candidate of proposals) {
    const caucusBackers = caucus.filter((m) =>
      supports(m, candidate.proposal),
    ).length;
    if (caucusBackers <= caucus.length / 2) continue;
    const chamberBackers = members.filter((m) =>
      supports(m, candidate.proposal),
    ).length;
    if (chamberBackers <= members.length / 2) continue;
    return { ...candidate, caucusBackers, chamberBackers };
  }
  return null;
}
