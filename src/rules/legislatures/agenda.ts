import type { AgendaMember } from "../../simulation/governing/majority-agenda";
import type { EntityId } from "../../simulation/types";
import type { StateLegislatorView } from "../../simulation/nationwide-world/state-legislature-opening";
import type { JointAssemblyCandidate } from "../../simulation/governing/joint-assembly";
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
  return caucuses[0]?.[1] ?? members.filter((m) => m.personId !== null);
}

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
  const ordered = [...proposals].sort(
    (a, b) =>
      b.pressure - a.pressure ||
      a.sponsor.personId!.localeCompare(b.sponsor.personId!),
  );
  for (const candidate of ordered) {
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
export function jointAssemblyCandidates(
  members: readonly StateLegislatorView[],
  incumbent: {
    readonly personId: EntityId;
    readonly party: string;
  } | null,
): readonly JointAssemblyCandidate[] {
  const counts = new Map<string, number>();
  for (const member of members)
    if (member.party)
      counts.set(member.party, (counts.get(member.party) ?? 0) + 1);
  const parties = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([party]) => party);
  const candidates: JointAssemblyCandidate[] = parties.map((party) =>
    incumbent && incumbent.party === party
      ? {
          key: `person:${incumbent.personId}`,
          personId: incumbent.personId,
          party,
          incumbent: true,
        }
      : { key: `party:${party}`, personId: null, party, incumbent: false },
  );
  if (incumbent && !counts.has(incumbent.party))
    candidates.push({
      key: `person:${incumbent.personId}`,
      personId: incumbent.personId,
      party: incumbent.party,
      incumbent: true,
    });
  return candidates;
}
export function positionBillAnswer(
  score: number,
  lawAnswer: "yes" | "no" | null | "closed",
): "yes" | "no" | null {
  if (lawAnswer === "closed") return null;
  if (score > 0) return lawAnswer === "yes" ? null : "yes";
  return lawAnswer === "yes" ? "no" : null;
}
