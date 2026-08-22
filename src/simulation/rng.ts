const UINT32_RANGE = 0x1_0000_0000;

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function normalizeSeed(seed: string): string {
  const normalized = seed.normalize("NFC").trim();

  if (normalized.length === 0) {
    throw new Error(
      "World seed must contain at least one non-whitespace character.",
    );
  }

  return normalized;
}

export class SeededRng {
  readonly #seed: string;
  #state: number;

  public constructor(seed: string) {
    this.#seed = normalizeSeed(seed);
    this.#state = hashSeed(this.#seed);
  }

  public get seed(): string {
    return this.#seed;
  }

  public nextUint32(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  public next(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  public integer(minInclusive: number, maxExclusive: number): number {
    if (
      !Number.isSafeInteger(minInclusive) ||
      !Number.isSafeInteger(maxExclusive) ||
      maxExclusive <= minInclusive
    ) {
      throw new Error(
        "RNG integer bounds must be safe integers with max greater than min.",
      );
    }

    const range = maxExclusive - minInclusive;
    if (range > UINT32_RANGE) {
      throw new Error("RNG integer range must not exceed 2^32 values.");
    }

    const acceptanceLimit = Math.floor(UINT32_RANGE / range) * range;
    let value = this.nextUint32();

    while (value >= acceptanceLimit) {
      value = this.nextUint32();
    }

    return minInclusive + (value % range);
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error("Cannot pick from an empty collection.");
    }

    return values[this.integer(0, values.length)] as T;
  }

  public fork(stableKey: string): SeededRng {
    if (stableKey.length === 0) {
      throw new Error("RNG fork key must not be empty.");
    }

    return new SeededRng(
      JSON.stringify(["rng-fork-v1", this.#seed, stableKey]),
    );
  }
}

export function pickDistinct<T>(
  rng: SeededRng,
  values: readonly T[],
  count: number,
): readonly T[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > values.length) {
    throw new Error(
      "Distinct pick count must fit within the source collection.",
    );
  }

  const available = [...values];
  const selected: T[] = [];

  while (selected.length < count) {
    const index = rng.integer(0, available.length);
    const [value] = available.splice(index, 1);
    selected.push(value as T);
  }

  return selected;
}
