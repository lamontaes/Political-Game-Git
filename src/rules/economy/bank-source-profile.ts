/** Retained KEEP source/helper closure; unchanged native public-owner proof is bounded. */
import type { BankShape } from "../../simulation/living-world/town-finances";
import type {
  FDIC_SMALL_BANK_SHAPES,
  FDIC_SMALL_BANK_RECORDS,
} from "../../simulation/living-world/town-bank-shapes.generated";
export interface BankSourceFacts {
  readonly shapes: typeof FDIC_SMALL_BANK_SHAPES;
  readonly records: typeof FDIC_SMALL_BANK_RECORDS;
}
const readers = new WeakMap<
  BankSourceFacts,
  (state: string | null, deposits: number) => BankShape
>();
export function recordedBankShape(
  facts: BankSourceFacts,
  state: string | null,
  deposits: number,
) {
  let read = readers.get(facts);
  if (!read) {
    read = compileBankProfile(facts);
    readers.set(facts, read);
  }
  return read(state, deposits);
}
// stopgapId: "economy.bank-shape-nearest-assets"
function compileBankProfile(facts: BankSourceFacts) {
  const FDIC_SMALL_BANK_SHAPES = facts.shapes,
    FDIC_SMALL_BANK_RECORDS = facts.records;
  interface BankShape {
    readonly state: string | null;
    readonly index: number;
    readonly certificate?: number;
    readonly cushion: number;
    readonly otherAssets: number;
  }
  interface ShapeRow {
    readonly cushion: number;
    readonly otherAssets: number;
    readonly uninsured: number;
  }
  function parseShapes(text: string): ShapeRow[] {
    return text.split(";").map((cell) => {
      const [cushion, otherAssets, uninsured] = cell.split(",").map(Number) as [
        number,
        number,
        number,
      ];
      return { cushion, otherAssets, uninsured };
    });
  }
  interface ObservedBankShape extends BankShape {
    readonly assetsThousands: number;
    readonly certificate: number;
  }
  const observedBankPools = new Map<
    string | null,
    readonly ObservedBankShape[]
  >();
  function observedBankPool(
    state: string | null,
  ): readonly ObservedBankShape[] {
    const own = state === null ? undefined : FDIC_SMALL_BANK_RECORDS[state];
    const sourceState = own && own.length >= 5 ? state : null;
    const cached = observedBankPools.get(sourceState);
    if (cached) return cached;
    const states =
      sourceState === null
        ? Object.keys(FDIC_SMALL_BANK_SHAPES).sort()
        : [sourceState];
    const rows: ObservedBankShape[] = [];
    let offset = 0;
    for (const key of states) {
      const shapes = parseShapes(FDIC_SMALL_BANK_SHAPES[key]!);
      const records = FDIC_SMALL_BANK_RECORDS[key]!;
      if (records.length !== shapes.length)
        throw new Error(
          "Observed bank metadata must preserve the original ratio rows.",
        );
      records.forEach(([assetsThousands, certificate], index) => {
        const { cushion, otherAssets } = shapes[index]!;
        rows.push({
          state: sourceState,
          index: sourceState === null ? offset + index : index,
          assetsThousands,
          certificate,
          cushion,
          otherAssets,
        });
      });
      offset += shapes.length;
    }
    rows.sort(
      (a, b) =>
        a.assetsThousands - b.assetsThousands || a.certificate - b.certificate,
    );
    const ranked = rows.filter(
      (row, index) =>
        index === 0 || row.assetsThousands !== rows[index - 1]!.assetsThousands,
    );
    observedBankPools.set(sourceState, ranked);
    return ranked;
  }
  function computeRecordedBankShape(
    state: string | null,
    depositsDollars: number,
  ): BankShape {
    if (!Number.isFinite(depositsDollars) || depositsDollars < 0)
      throw new Error(
        "Bank profile selection requires nonnegative recorded deposits.",
      );
    const pool = observedBankPool(state);
    if (pool.length === 0)
      throw new Error("Bank profile selection requires observed records.");
    const target = depositsDollars / 1000;
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
    const chosen =
      leftDistance < rightDistance ||
      (leftDistance === rightDistance && left.certificate < right.certificate)
        ? left
        : right;
    const {
      state: chosenState,
      index,
      certificate,
      cushion,
      otherAssets,
    } = chosen;
    return { state: chosenState, index, certificate, cushion, otherAssets };
  }
  return computeRecordedBankShape;
}
