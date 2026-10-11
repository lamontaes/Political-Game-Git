import type {
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
} from "../../simulation/types";
export interface PackedRollCalls {
  readonly rosters: readonly (readonly (string | null)[])[];
  readonly reasons: readonly string[];
}

interface PackedDispositions {
  readonly roster: number;
  readonly dispositions: string;
  readonly reasons: readonly number[];
}

const DISPOSITION: Readonly<Record<string, LegislativeMemberDisposition>> = {
  y: "yea",
  n: "nay",
  p: "present-not-voting",
  a: "absent",
  e: "excused",
};

export function unpackVote(
  slot: unknown,
  packing: PackedRollCalls,
): readonly LegislativeVoteDisposition[] {
  if (typeof slot !== "object" || slot === null) {
    throw new Error("A packed roll call is malformed.");
  }
  const packed = slot as Partial<PackedDispositions>;
  const roster =
    typeof packed.roster === "number" ? packing.rosters[packed.roster] : null;
  const letters = packed.dispositions;
  const reasonRefs = packed.reasons;
  if (
    !roster ||
    typeof letters !== "string" ||
    !Array.isArray(reasonRefs) ||
    roster.length !== letters.length * 2 ||
    reasonRefs.length !== letters.length
  ) {
    throw new Error("A packed roll call does not match its roster.");
  }
  const rebuilt: LegislativeVoteDisposition[] = [];
  for (let member = 0; member < letters.length; member += 1) {
    const disposition = DISPOSITION[letters[member]!];
    const memberKey = roster[member * 2];
    const personId = roster[member * 2 + 1];
    const reasonRef = reasonRefs[member];
    if (
      disposition === undefined ||
      typeof memberKey !== "string" ||
      (typeof personId !== "string" && personId !== null) ||
      typeof reasonRef !== "number" ||
      (reasonRef !== -1 && packing.reasons[reasonRef] === undefined)
    ) {
      throw new Error("A packed roll call names a member it cannot rebuild.");
    }
    const base = {
      memberKey,
      personId: personId as LegislativeVoteDisposition["personId"],
      disposition,
    };
    rebuilt.push(
      reasonRef === -1
        ? base
        : { ...base, reason: packing.reasons[reasonRef]! },
    );
  }
  return rebuilt;
}
