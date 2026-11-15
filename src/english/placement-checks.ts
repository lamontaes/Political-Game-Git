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
  readonly step: string;
  readonly role: string;
  readonly statesPatterns: readonly string[];
  readonly needsAnyFact: readonly string[];
  readonly exemptMoves: readonly string[];
};

const CHECKS = data.checks as Record<string, StatesCheck>;

export const PLACEMENT_CHECK_IDS = Object.keys(CHECKS);

/** Every use of every piece that breaks the named check. */
export function placementBreaks(
  checkId: string,
  pieces: readonly PlacedPiece[],
): PlacementBreak[] {
  const check = CHECKS[checkId];
  if (!check) throw new Error(`no placement check "${checkId}"`);
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
