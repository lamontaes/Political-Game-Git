import type {
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
  LegislativeVoteRecord,
  World,
} from "./types";

/**
 * How a saved world writes its roll calls.
 *
 * A recorded vote keeps every member's disposition, and a Congress vote has
 * 435 or 100 of them, each naming the member's seat, the person and the
 * reason. After twenty game years those rows were a third of a save: 22 MB of
 * a 61 MB Ketchikan life, most of it the same seat and person names written
 * again for every vote. A tab reading a save that size could run out of
 * memory.
 *
 * On disk, each distinct roster (the seats and people, in order) is written
 * once, and a vote names its roster and carries one letter per member for the
 * disposition and one small number for the reason. Reading it back rebuilds
 * exactly the records that were written, in the same key order, so the world
 * a save loads is the world that was saved. Nothing in memory changes shape:
 * this is only how the bytes are laid out on disk.
 *
 * A vote is packed only when every disposition has exactly the shape this
 * encoder writes back. Anything else, such as an older record with a field
 * this does not know, stays on disk as it was.
 */
export interface PackedRollCalls {
  /** Each roster, flattened: seat, person, seat, person, and so on. */
  readonly rosters: readonly (readonly (string | null)[])[];
  /** The distinct reasons, referenced by index. */
  readonly reasons: readonly string[];
}

/** Stands in a vote's `dispositions` slot on disk. */
interface PackedDispositions {
  readonly roster: number;
  /** One letter per member, in roster order. */
  readonly dispositions: string;
  /** A reason index per member, or -1 where the record has no reason. */
  readonly reasons: readonly number[];
}

const LETTER: Readonly<Record<LegislativeMemberDisposition, string>> = {
  yea: "y",
  nay: "n",
  "present-not-voting": "p",
  absent: "a",
  excused: "e",
};
const DISPOSITION: Readonly<Record<string, LegislativeMemberDisposition>> = {
  y: "yea",
  n: "nay",
  p: "present-not-voting",
  a: "absent",
  e: "excused",
};

/**
 * The world as it is written to disk, and the tables its votes point into.
 * Returns null when no vote could be packed, so a world without roll calls is
 * written exactly as before.
 */
export function packRollCalls(
  world: World,
): { readonly world: World; readonly packing: PackedRollCalls } | null {
  const votes = world.history.legislativeVotes;
  if (!votes || votes.length === 0) return null;
  const rosters: (string | null)[][] = [];
  const rosterIndex = new Map<string, number>();
  const reasons: string[] = [];
  const reasonIndex = new Map<string, number>();
  let packedAny = false;
  const written = votes.map((vote) => {
    const packed = packVote(vote, rosters, rosterIndex, reasons, reasonIndex);
    if (packed === null) return vote;
    packedAny = true;
    return { ...vote, dispositions: packed as unknown as never };
  });
  if (!packedAny) return null;
  return {
    world: {
      ...world,
      history: { ...world.history, legislativeVotes: written },
    },
    packing: { rosters, reasons },
  };
}

/** The world a packed save holds, with every vote's dispositions rebuilt. */
export function unpackRollCalls(world: World, packing: unknown): World {
  if (!isPacking(packing)) {
    throw new Error("World snapshot's roll-call tables are malformed.");
  }
  const votes = world.history.legislativeVotes;
  if (!Array.isArray(votes)) {
    throw new Error("World snapshot packs roll calls it does not hold.");
  }
  const rebuilt = votes.map((vote) => {
    const slot = (vote as { dispositions?: unknown }).dispositions;
    if (Array.isArray(slot)) return vote;
    return {
      ...vote,
      dispositions: unpackVote(slot, packing),
    };
  });
  return {
    ...world,
    history: { ...world.history, legislativeVotes: rebuilt },
  };
}

function packVote(
  vote: LegislativeVoteRecord,
  rosters: (string | null)[][],
  rosterIndex: Map<string, number>,
  reasons: string[],
  reasonIndex: Map<string, number>,
): PackedDispositions | null {
  const dispositions = vote.dispositions;
  if (!Array.isArray(dispositions) || dispositions.length === 0) return null;
  const roster: (string | null)[] = [];
  let letters = "";
  const reasonRefs: number[] = [];
  for (const disposition of dispositions) {
    if (!packable(disposition)) return null;
    roster.push(disposition.memberKey, disposition.personId);
    letters += LETTER[disposition.disposition];
    if (disposition.reason === undefined) {
      reasonRefs.push(-1);
    } else {
      let index = reasonIndex.get(disposition.reason);
      if (index === undefined) {
        index = reasons.length;
        reasons.push(disposition.reason);
        reasonIndex.set(disposition.reason, index);
      }
      reasonRefs.push(index);
    }
  }
  const key = JSON.stringify(roster);
  let index = rosterIndex.get(key);
  if (index === undefined) {
    index = rosters.length;
    rosters.push(roster);
    rosterIndex.set(key, index);
  }
  return { roster: index, dispositions: letters, reasons: reasonRefs };
}

/** True when rebuilding this disposition gives back the identical object. */
function packable(value: unknown): value is LegislativeVoteDisposition {
  if (typeof value !== "object" || value === null) return false;
  const keys = Object.keys(value);
  const record = value as Record<string, unknown>;
  const shaped =
    (keys.length === 3 || (keys.length === 4 && keys[3] === "reason")) &&
    keys[0] === "memberKey" &&
    keys[1] === "personId" &&
    keys[2] === "disposition";
  return (
    shaped &&
    typeof record.memberKey === "string" &&
    (typeof record.personId === "string" || record.personId === null) &&
    typeof record.disposition === "string" &&
    Object.hasOwn(LETTER, record.disposition) &&
    (keys.length === 3 || typeof record.reason === "string")
  );
}

function unpackVote(
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

function isPacking(value: unknown): value is PackedRollCalls {
  if (typeof value !== "object" || value === null) return false;
  const packing = value as Record<string, unknown>;
  return (
    Array.isArray(packing.rosters) &&
    packing.rosters.every(Array.isArray) &&
    Array.isArray(packing.reasons) &&
    packing.reasons.every((reason) => typeof reason === "string")
  );
}
