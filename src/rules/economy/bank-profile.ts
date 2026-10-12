import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export interface ObservedBankProfileFact {
  readonly state: string | null;
  readonly index: number;
  readonly certificate: number;
  readonly assetsThousands: number;
  readonly cushion: number;
  readonly otherAssets: number;
}

export interface SelectedBankProfileFact {
  readonly state: string | null;
  readonly index: number;
  readonly certificate: number;
  readonly cushion: number;
  readonly otherAssets: number;
}

/** Select the nearest caller-supplied FDIC asset profile; ties use certificate. */
export function nearestBankProfileFromFacts(
  pool: readonly ObservedBankProfileFact[],
  depositsDollars: number,
): SelectedBankProfileFact {
  if (!Number.isFinite(depositsDollars) || depositsDollars < 0) {
    throw new Error(
      "Bank profile selection requires nonnegative recorded deposits.",
    );
  }
  if (pool.length === 0) {
    throw new Error("Bank profile selection requires observed records.");
  }
  const target = depositsDollars / parameters.bankProfileAssetUnitDollars.value;
  let low = 0;
  let high = pool.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (pool[middle]!.assetsThousands < target) low = middle + 1;
    else high = middle;
  }
  const left = pool[Math.max(0, low - 1)]!;
  const right = pool[Math.min(low, pool.length - 1)]!;
  const leftDistance = Math.abs(left.assetsThousands - target);
  const rightDistance = Math.abs(right.assetsThousands - target);
  const selected =
    leftDistance < rightDistance ||
    (leftDistance === rightDistance && left.certificate < right.certificate)
      ? left
      : right;
  return {
    state: selected.state,
    index: selected.index,
    certificate: selected.certificate,
    cushion: selected.cushion,
    otherAssets: selected.otherAssets,
  };
}

/** Read the selected shape's uninsured-deposit ratio from supplied source rows. */
export function uninsuredDepositShareFromFacts(
  shape: Pick<SelectedBankProfileFact, "state" | "index">,
  localShares: readonly number[] | null,
  nationalShares: readonly number[],
): number {
  const shares =
    shape.state !== null && localShares !== null ? localShares : nationalShares;
  return shares[shape.index]!;
}
