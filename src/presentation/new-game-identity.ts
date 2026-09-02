import { stableHash } from "../simulation";
import type { NewGameSetup } from "./new-game";

/**
 * What makes one new game a different new game from another.
 *
 * Two things were previously conflated here and are now kept apart.
 *
 * The first is *identity*: a world's identity comes from the seed and every
 * setup choice, not the seed alone. That used to be encoded by joining the
 * fields with a pipe, which is only safe as long as nobody types a pipe. A
 * player named `A|kentucky` and a player named `A` in Kentucky produced the
 * same string, and therefore the same world id, and therefore two saves that
 * overwrote each other. Canonical JSON removes the class of bug rather than
 * the one instance of it: the encoder escapes the delimiters, so no arrangement
 * of ordinary text can be read as a field boundary.
 *
 * The second is *replay*. A URL carrying only `?seed=` cannot reproduce a
 * configured world, because place, age, depth, starting life and names all
 * change what gets built. So a replay link now carries the whole setup, and
 * the seed-only form is honest about being a seed for the default setup rather
 * than a reproduction of somebody's game.
 */

export const SETUP_ENCODING_VERSION = 2;
export const REPLAY_DESCRIPTOR_PARAMETER = "replay";

/**
 * The setup as one canonical string. Field order is fixed here rather than
 * taken from object iteration order, so the encoding cannot drift when the
 * interface is edited.
 */
export function canonicalSetupEncoding(setup: NewGameSetup): string {
  return JSON.stringify({
    v: SETUP_ENCODING_VERSION,
    seed: setup.seed,
    placeKey: setup.placeKey,
    startAge: setup.startAge,
    depth: setup.depth,
    startingLife: setup.startingLife,
    household: setup.household,
    // Absent and blank are the same choice — "generate one" — and must encode
    // identically, or the same game would get two identities.
    givenName: setup.givenName?.trim() || null,
    familyName: setup.familyName?.trim() || null,
  });
}

/**
 * The seed the world is actually built from.
 *
 * The same setup always produces the same seed, which is what replay depends
 * on; any difference in any field produces a different one, which is what
 * keeps two lives from landing on the same save.
 */
export function worldSeedFor(setup: NewGameSetup): string {
  return `setup-v${SETUP_ENCODING_VERSION}:${stableHash(canonicalSetupEncoding(setup))}`;
}

/**
 * A save's identity, distinct from the identity of the world inside it.
 *
 * One canonical world can be saved more than once — the same life kept at two
 * different points, or branched deliberately. Those are different saves and
 * must not overwrite each other, so a save carries its own id and merely
 * records which world it holds.
 */
export function createSaveId(worldId: string, discriminator: string): string {
  return `save_${stableHash(`save:v${SETUP_ENCODING_VERSION}:${worldId}:${discriminator}`)}`;
}

/** A replay link that actually reproduces the world it came from. */
export function encodeReplayDescriptor(setup: NewGameSetup): string {
  return base64UrlEncode(canonicalSetupEncoding(setup));
}

/**
 * Reads a replay descriptor back. Anything unreadable — truncated, from a
 * newer encoding, hand-edited — returns null so the caller can start a normal
 * game instead of a half-configured one.
 */
export function decodeReplayDescriptor(value: string): NewGameSetup | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(value.trim()));
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  if (record.v !== SETUP_ENCODING_VERSION) return null;
  if (
    typeof record.seed !== "string" ||
    record.seed.trim().length === 0 ||
    typeof record.placeKey !== "string" ||
    !Number.isSafeInteger(record.startAge) ||
    (record.depth !== "play-formative-years" &&
      record.depth !== "summarize-earlier-life") ||
    (record.startingLife !== "ordinary-life" &&
      record.startingLife !== "legislative-office") ||
    (record.household !== "lives-alone" &&
      record.household !== "shares-a-home") ||
    (record.givenName !== null && typeof record.givenName !== "string") ||
    (record.familyName !== null && typeof record.familyName !== "string")
  ) {
    return null;
  }
  return {
    seed: record.seed,
    placeKey: record.placeKey,
    startAge: record.startAge as number,
    depth: record.depth,
    startingLife: record.startingLife,
    household: record.household,
    givenName: record.givenName as string | null,
    familyName: record.familyName as string | null,
  };
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

/** The setup a replay link is asking for, if the address carries a readable one. */
export function readReplaySetup(search: string): NewGameSetup | null {
  const value = new URLSearchParams(search).get(REPLAY_DESCRIPTOR_PARAMETER);
  return value === null ? null : decodeReplayDescriptor(value);
}

/** The address that rebuilds this exact world, setup and all. */
export function replayDescriptorUrl(
  origin: string,
  pathname: string,
  setup: NewGameSetup,
): string {
  return `${origin}${pathname}?${REPLAY_DESCRIPTOR_PARAMETER}=${encodeReplayDescriptor(setup)}`;
}
