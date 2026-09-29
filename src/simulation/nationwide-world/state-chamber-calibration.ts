import composition from "../../../data/research/governance-calibration-2024.json" with { type: "json" };

export interface ChamberComposition {
  readonly size: number;
  readonly democratic?: number | null;
  readonly republican?: number | null;
  readonly other?: number | null;
  readonly vacancies?: number | null;
  readonly nonpartisan?: number | boolean;
}

/** Source counts calibrate district diversity; later conditions move elections. */
export function chamberComposition(
  usps: string,
  chamber: "lower" | "upper",
): ChamberComposition | null {
  const row = composition.rows.find((r) => r.usps === usps);
  if (!row) return null;
  return (row.unicameral ? row.unicameral_chamber : row[chamber]) ?? null;
}

/**
 * Center the partisan district log odds where the calibrated party share changes sides.
 * Other affiliations and vacancies must be reserved separately by the caller.
 * Spread comes from the save's districts. A common positive spread supplies
 * diversity for at-large states whose own district sample has no variance.
 */
export function calibratedChamberLeans(
  draws: readonly number[],
  composition: ChamberComposition | null,
  spread: number,
  worldSwingLogOdds: number,
): readonly number[] {
  if (
    !composition ||
    composition.democratic == null ||
    composition.republican == null
  )
    return draws;
  const partisans = composition.democratic + composition.republican;
  if (partisans === 0 || draws.length === 0) return draws;
  const democrats = Math.round(
    (draws.length * composition.democratic) / partisans,
  );
  const ranked = [...draws].sort((a, b) => b - a);
  const above = ranked[Math.max(0, democrats - 1)]!;
  const below = ranked[Math.min(ranked.length - 1, democrats)]!;
  const boundary =
    democrats === 0
      ? ranked[0]! + 1
      : democrats === draws.length
        ? ranked.at(-1)! - 1
        : (above + below) / 2;
  if (democrats > 0 && democrats < draws.length && above === below) {
    // Identical at-large inputs carry no district variance. Preserve their
    // stable seat order and give each seat its own rank about the boundary.
    const order = draws
      .map((draw, index) => ({ draw, index }))
      .sort((a, b) => b.draw - a.draw || a.index - b.index);
    const ranks = new Map(order.map((row, rank) => [row.index, rank]));
    return draws.map(
      (_, index) =>
        ((democrats - 0.5 - ranks.get(index)!) / draws.length) * spread +
        worldSwingLogOdds,
    );
  }
  return draws.map((draw) => (draw - boundary) * spread + worldSwingLogOdds);
}
