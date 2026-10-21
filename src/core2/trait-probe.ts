/**
 * The trait-wiring audit's probe: a debug switch, off in play, that counts
 * every decision a person's traits reach and whether the trait term turned
 * the pick (`scripts/traits/trait-wiring-audit.ts`). With it off, each read
 * costs one null check.
 */

/** One chooser pick: the offers' action ids, the pick with and without the trait term. */
export interface ChooserProbeRow {
  actorId: string;
  actionIds: readonly string[];
  /** Each offer's trait term, in the offers' order. */
  traitTerms: readonly number[];
  /** Each offer's score without its trait term, and its unweighted trait lean. */
  bareScores: readonly number[];
  leans: readonly number[];
  chosen: string;
  withoutTrait: string;
  traitGap: number;
}

/** One formula decision: its table id (or the caller's site), the lean, and whether it turned the outcome. */
export interface FormulaProbeRow {
  decisionId: string;
  actorId?: string;
  lean: number;
  /** Through `leanedYes`: the case without personality, the outcome, and whether personality turned it. */
  bare?: number;
  yes?: boolean;
  turned?: boolean;
}

export interface TraitProbe {
  chooser?(row: ChooserProbeRow): void;
  formula?(row: FormulaProbeRow): void;
}

let active: TraitProbe | undefined;

export function setTraitProbe(probe: TraitProbe | undefined): void {
  active = probe;
}

export function traitProbe(): TraitProbe | undefined {
  return active;
}

/** The first caller frame outside the trait helpers, as `file:line`. */
export function probeCallerSite(): string {
  const frames = (new Error().stack ?? "").split("\n").slice(2);
  for (const frame of frames) {
    if (/trait-(probe|decisions)\.ts|choice\.ts/.test(frame)) continue;
    const match = /(src\/[^):]+):(\d+)/.exec(frame);
    if (match) return `${match[1]}:${match[2]}`;
  }
  return "unknown";
}
