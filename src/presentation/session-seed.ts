/**
 * Where a seed comes from, and when it is allowed to change.
 *
 * A cold boot with nothing saved should not show the same person twice in a
 * row — that is how generation gets tested every time someone opens the game.
 * Once a world is saved, its seed is part of the save and never rerolls.
 *
 * Only the choice of seed is random. Everything the simulation does with that
 * seed afterwards is deterministic, which is what makes replay work.
 */

export const REPLAY_SEED_PARAMETER = "seed";

export interface RandomSource {
  getRandomValues<T extends Uint8Array>(array: T): T;
}

export type SessionSeedOrigin = "replay" | "fresh";

export interface SessionSeed {
  readonly seed: string;
  readonly origin: SessionSeedOrigin;
}

/**
 * A fresh seed for an unsaved session. The bytes come from the platform's
 * cryptographic source because a clock-derived seed repeats across quick
 * reloads, which is exactly the case this is meant to break.
 */
export function createEphemeralSeed(source: RandomSource): string {
  const bytes = source.getRandomValues(new Uint8Array(16));
  if (bytes.length !== 16) {
    throw new Error("The random source returned the wrong number of bytes.");
  }
  let seed = "";
  for (const byte of bytes) seed += byte.toString(16).padStart(2, "0");
  return seed;
}

/** An explicit replay seed, if one was asked for. Blank values do not count. */
export function readReplaySeed(search: string): string | null {
  const value = new URLSearchParams(search).get(REPLAY_SEED_PARAMETER);
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The seed this session should generate from. An explicit replay seed always
 * wins, so a reported seed can be handed back and reproduce what was seen.
 */
export function resolveSessionSeed(
  search: string,
  source: RandomSource,
): SessionSeed {
  const replay = readReplaySeed(search);
  return replay === null
    ? { seed: createEphemeralSeed(source), origin: "fresh" }
    : { seed: replay, origin: "replay" };
}

/** The address that reproduces a generated sample, for a report or a bug. */
export function replayUrl(origin: string, pathname: string, seed: string) {
  return `${origin}${pathname}?${REPLAY_SEED_PARAMETER}=${encodeURIComponent(seed)}`;
}
