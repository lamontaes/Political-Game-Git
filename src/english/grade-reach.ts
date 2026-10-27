/**
 * How far one grade reaches (owner, Oct 27: "when they give me 100 lines to
 * grade, and I grade 17, that should calibrate the entire engine ... a
 * butterfly effect, and calibrates a concession speech later on").
 *
 * A grade is kept on the piece it was given to (`english-grades.ts`,
 * `calibration.ts`). It also attaches to what the piece is made of, three
 * things every bank piece carries:
 *
 *   pattern   the speech act it makes (`tag.move`, else `move`): thank,
 *             accept, announce-result, confront. Acts are situation-blind,
 *             so one act runs through every bank.
 *   voice     the bearing the speaker's traits pull toward (`bearing`, or
 *             `none`); `calibration.json` ties traits to bearings.
 *   register  the class of the bank's register (`registerClasses` in
 *             `calibration.json`): public address, private talk, broadcast,
 *             narration.
 *
 * Pieces sharing all three form a group. A group's grades add up (good +1,
 * bad or fix -1, a grade shared with other parts of a line counts half), and
 * every other piece in the group is weighted by that sum on a sliding curve:
 * more graded good, chosen more; more graded bad, chosen less; never banned
 * and never past the floor and ceiling. The graded piece's own grade stays
 * with `pieceFactor`.
 *
 * Weights only. Pure; reads data, never the world. The profile and the group
 * sums are written by `scripts/dialogue-batch/apply-grades.ts` into
 * `data/english/grade-reach.json`, and `tests/grade-reach.test.ts` refuses a
 * file that disagrees with the banks and the ledger.
 */
import type { PartGradeLedger } from "./english-grades";

/** What a bank piece is made of, for the parts of it a grade attaches to. */
export interface PieceMakeup {
  readonly bank: string;
  readonly move: string;
  readonly tag?: { readonly move?: string };
  readonly bearing?: string;
}

export interface ReachGroup {
  /** The grades of the whole group added up. */
  readonly net: number;
  /** Each graded member's own share of `net`. */
  readonly graded: Readonly<Record<string, number>>;
}

export interface ReachTable {
  readonly schema: "english-grade-reach/1";
  /** Group key by piece key, for the groups holding at least one graded piece. */
  readonly profiles: Readonly<Record<string, string>>;
  readonly groups: Readonly<Record<string, ReachGroup>>;
}

export interface ReachParameters {
  readonly floor: number;
  readonly ceiling: number;
  readonly saturation: number;
}

/** A group key: `pattern|voice|register class`. */
export function groupKey(
  piece: PieceMakeup,
  classes: Readonly<Record<string, string>>,
): string {
  const register = classes[piece.bank];
  if (!register) throw new Error(`no register class for bank ${piece.bank}`);
  return `${piece.tag?.move ?? piece.move}|${piece.bearing ?? "none"}|${register}`;
}

/** A piece's own grades as a signed count; a grade shared with other parts counts half. */
export function netOf(counts: PartGradeLedger["parts"][string]): number {
  return (
    counts.good -
    counts.bad -
    counts.fix +
    0.5 * (counts.sharedGood - counts.sharedBad - counts.sharedFix)
  );
}

/**
 * The reach table for these banks and this ledger. Keys in the ledger that
 * match no bank piece (retired keys, the old composition banks) have no
 * profile; they keep their own grade and reach nothing.
 */
export function buildReach(
  pieces: ReadonlyMap<string, PieceMakeup>,
  ledger: PartGradeLedger,
  classes: Readonly<Record<string, string>>,
): ReachTable {
  const groups: Record<
    string,
    { net: number; graded: Record<string, number> }
  > = {};
  for (const [key, counts] of Object.entries(ledger.parts)) {
    const piece = pieces.get(key);
    const net = netOf(counts);
    if (!piece || net === 0) continue;
    const group = (groups[groupKey(piece, classes)] ??= { net: 0, graded: {} });
    group.net += net;
    group.graded[key] = net;
  }
  const profiles: Record<string, string> = {};
  for (const [key, piece] of pieces) {
    const group = groupKey(piece, classes);
    if (groups[group]) profiles[key] = group;
  }
  const sorted = <T>(table: Record<string, T>): Record<string, T> =>
    Object.fromEntries(
      Object.entries(table).sort(([a], [b]) => a.localeCompare(b)),
    );
  return {
    schema: "english-grade-reach/1",
    profiles: sorted(profiles),
    groups: sorted(
      Object.fromEntries(
        Object.entries(groups).map(([key, group]) => [
          key,
          { net: group.net, graded: sorted(group.graded) },
        ]),
      ),
    ),
  };
}

/**
 * The grades of a piece's group other than its own, run through a sliding
 * curve: 1 with none, rising toward the ceiling as good grades add up,
 * falling toward the floor as bad ones do, never past either.
 */
export function reachFactor(
  ids: readonly string[],
  reach: ReachTable | undefined,
  parameters: ReachParameters,
): number {
  if (!reach) return 1;
  const key = ids.find((id) => reach.profiles[id] !== undefined);
  if (key === undefined) return 1;
  const group = reach.groups[reach.profiles[key]!];
  if (!group) return 1;
  const others = group.net - (group.graded[key] ?? 0);
  if (others === 0) return 1;
  const slide = Math.tanh(Math.abs(others) / parameters.saturation);
  return others > 0
    ? 1 + (parameters.ceiling - 1) * slide
    : 1 - (1 - parameters.floor) * slide;
}
