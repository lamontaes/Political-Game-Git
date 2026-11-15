/**
 * Placement checks (Words lead, rules 110 to 113): where a bank piece is
 * placed (step, role, move, required facts) is read against what the piece
 * says. A check is a counted report, not a pull: it lists each piece use that
 * breaks it, and the guard holds the count at or below its baseline so it only
 * falls (`tests/guards/english/placement-checks.test.ts`). Words and fact lists
 * live in `data/english/placement-checks.json`.
 */
import data from "../../data/english/placement-checks.json" with { type: "json" };

export interface PlacedUse {
  readonly step: string;
  readonly role: string;
  readonly purpose?: string;
  readonly key?: string;
  readonly requiresFacts?: readonly string[];
}

export interface PlacedPiece {
  readonly key: string;
  readonly move: string;
  readonly text: string;
  readonly uses: readonly PlacedUse[];
}

export interface PlacementBreak {
  readonly check: string;
  readonly pieceKey: string;
  readonly purpose: string;
  readonly text: string;
  readonly why: string;
}

type StatesCheck = {
  readonly type: "states";
  readonly step: string;
  readonly role: string;
  readonly statesPatterns: readonly string[];
  readonly needsAnyFact: readonly string[];
  readonly exemptMoves: readonly string[];
};

type OpeningCheck = {
  readonly type: "opening";
  readonly step: string;
  readonly sharedKey: string;
};

const CHECKS = data.checks as Record<string, StatesCheck | OpeningCheck>;

export const PLACEMENT_CHECK_IDS = Object.keys(CHECKS);

/** Whether a piece is pulled from play (data/english/pulled.json keeps keys cut to a fixed length). */
const isPulled = (piece: PlacedPiece, pulled: ReadonlySet<string>): boolean =>
  pulled.has(piece.key) || [...pulled].some((key) => piece.key.startsWith(key));

/**
 * The scene types a placement check lists without flagging: types with no
 * narration at all (rule 110 lists them for the Words lead).
 */
export function typesWithoutOpening(
  checkId: string,
  pieces: readonly PlacedPiece[],
  pulled: ReadonlySet<string> = new Set(),
): string[] {
  const check = CHECKS[checkId];
  if (check?.type !== "opening") return [];
  const all = new Set<string>();
  const withOpening = new Set<string>();
  for (const piece of pieces)
    for (const use of piece.uses) {
      const type = use.purpose ?? "";
      if (!type) continue;
      all.add(type);
      if (use.step === check.step && !isPulled(piece, pulled))
        withOpening.add(type);
    }
  return [...all].filter((type) => !withOpening.has(type)).sort();
}

/**
 * Every use of every piece that breaks the named check (a pulled piece does
 * not play, so it is not read). An opening check breaks once per scene type.
 */
export function placementBreaks(
  checkId: string,
  pieces: readonly PlacedPiece[],
  pulled: ReadonlySet<string> = new Set(),
): PlacementBreak[] {
  const check = CHECKS[checkId];
  if (!check) throw new Error(`no placement check "${checkId}"`);
  if (check.type === "opening") {
    const byType = new Map<
      string,
      { shared: boolean; other: boolean; text: string; key: string }
    >();
    for (const piece of pieces) {
      if (isPulled(piece, pulled)) continue;
      for (const use of piece.uses) {
        if (use.step !== check.step || !use.purpose) continue;
        const row = byType.get(use.purpose) ?? {
          shared: false,
          other: false,
          text: piece.text,
          key: piece.key,
        };
        if (use.key === check.sharedKey) row.shared = true;
        else row.other = true;
        byType.set(use.purpose, row);
      }
    }
    return [...byType.entries()]
      .filter(([, row]) => row.shared && !row.other)
      .map(([purpose, row]) => ({
        check: checkId,
        pieceKey: row.key,
        purpose,
        text: row.text,
        why: `every narration piece of this type is keyed "${check.sharedKey}", placed by no cause`,
      }));
  }
  const expressions = check.statesPatterns.map(
    (source) => new RegExp(source, "i"),
  );
  const found: PlacementBreak[] = [];
  for (const piece of pieces) {
    if (check.exemptMoves.includes(piece.move)) continue;
    if (!expressions.some((expression) => expression.test(piece.text)))
      continue;
    for (const use of piece.uses) {
      if (use.step !== check.step || use.role !== check.role) continue;
      const placed = (use.requiresFacts ?? []).some((fact) =>
        check.needsAnyFact.includes(fact),
      );
      if (placed) continue;
      found.push({
        check: checkId,
        pieceKey: piece.key,
        purpose: use.purpose ?? "",
        text: piece.text,
        why: `states the player's own vote or stance and requires none of: ${check.needsAnyFact.join(", ")}`,
      });
    }
  }
  return found;
}
