import {
  canonicalPriorEncoding,
  createSetupPriorStore,
  decodePriorEncoding,
  stableHash,
  SETUP_BANK_VERSION,
} from "../simulation";
import type { SetupAnswerRecord, SetupQuestionnairePath } from "../simulation";
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

export const SETUP_ENCODING_VERSION = 3;
export const REPLAY_DESCRIPTOR_PARAMETER = "replay";

/**
 * Version 3 split the setup in two, and the split is the point.
 *
 * A setup now has a *world half* — place, age, depth, starting life,
 * household, names, seed — and a *priors half*, which is what the player
 * answered at the questionnaire. Only the world half reaches `worldSeedFor`.
 *
 * That is not tidiness. If an answer about tax entered the world seed, it
 * would change which household was generated, which people were in it and what
 * they were called, so a political answer would quietly manufacture a
 * correlated family — the exact thing the settled semantics forbid. Answers may
 * change what the game asks you and what it offers you. They may never change
 * who your family is, and a test holds that shut by building the same world
 * from two opposite sets of answers and comparing the people.
 *
 * Both halves travel in a replay descriptor, because a replay that reproduced
 * the world but not the calibration would not reproduce the game.
 */

/**
 * The world half, as one canonical string.
 *
 * Field order is fixed here rather than taken from object iteration order, so
 * the encoding cannot drift when the interface is edited. The questionnaire is
 * deliberately absent: this is the input to world generation, and nothing the
 * player answered belongs in it.
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
 *
 * That second half is by construction rather than by luck. The seed used to be
 * a 64-bit FNV-1a digest of the setup and nothing else, so "different setups
 * get different worlds" rested on a hash never colliding — a claim that width
 * does not support. The digest is kept because it makes a seed recognisable at
 * a glance, but the canonical encoding travels with it, so two seeds are equal
 * only when the setups they came from were. The seed is internal and never
 * shown, so its length costs the player nothing.
 *
 * (The RNG hashes this down to its own state, as every RNG must; that governs
 * which numbers come out, not which world a save belongs to.)
 */
export function worldSeedFor(setup: NewGameSetup): string {
  const encoding = canonicalSetupEncoding(setup);
  return `setup-v${SETUP_ENCODING_VERSION}:${stableHash(encoding)}:${encoding}`;
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

/**
 * A digest is a label here, not a uniqueness guarantee. Callers that need two
 * different things to have two different ids — `BrowserSaveStore.newSaveId` is
 * the one that does — carry the distinguishing part in the id beside this,
 * rather than trusting 64 bits of FNV-1a to keep them apart.
 */

/** The setup's answers, in the persisted shape, or an empty set. */
export function setupPriorStoreFor(setup: NewGameSetup) {
  return createSetupPriorStore(
    setup.questionnaire ?? "skipped",
    SETUP_BANK_VERSION,
    setup.priors ?? [],
  );
}

/**
 * Both halves, for a link that reproduces the whole game.
 *
 * The priors half is written only when there is one, so a setup that answered
 * nothing encodes exactly as it did before the questionnaire existed and
 * round-trips back to itself rather than to itself-plus-two-empty-fields.
 */
export function canonicalReplayEncoding(setup: NewGameSetup): string {
  const world = JSON.parse(canonicalSetupEncoding(setup)) as Record<
    string,
    unknown
  >;
  const answers = setup.priors ?? [];
  const path = setup.questionnaire ?? "skipped";
  if (path === "skipped" && answers.length === 0) {
    return JSON.stringify(world);
  }
  return JSON.stringify({
    ...world,
    priors: JSON.parse(
      canonicalPriorEncoding(setupPriorStoreFor(setup)),
    ) as unknown,
  });
}

/** A replay link that actually reproduces the world it came from. */
export function encodeReplayDescriptor(setup: NewGameSetup): string {
  return base64UrlEncode(canonicalReplayEncoding(setup));
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
  const base: NewGameSetup = {
    seed: record.seed,
    placeKey: record.placeKey,
    startAge: record.startAge as number,
    depth: record.depth,
    startingLife: record.startingLife,
    household: record.household,
    givenName: record.givenName as string | null,
    familyName: record.familyName as string | null,
  };
  if (record.priors === undefined) return base;
  const priors = decodePriorEncoding(record.priors);
  // An unreadable priors half is not a half-configured game to be salvaged:
  // the descriptor as a whole is refused, so the caller starts a normal game
  // rather than one calibrated by whatever survived.
  if (priors === null) return null;
  return {
    ...base,
    questionnaire: priors.path as SetupQuestionnairePath,
    priors: priors.answers as readonly SetupAnswerRecord[],
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
