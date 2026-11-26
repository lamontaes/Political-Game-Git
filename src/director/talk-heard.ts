/**
 * What the player has heard at home (the telling's "said today"), kept as the
 * player's own knowledge and read back when a wording, a subject, a question
 * or a figure is picked: one record both kinds of talk, a home conversation
 * and a scene with a purpose, say their lines against. Moved out of
 * `conversation.ts` so the exchange engine can read it too (talk merge plan,
 * slice 2 precondition); nothing changes in what is kept or read.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, KnownFact, PersonId } from "../core2/types";

/**
 * What the player already heard today from anyone in the household (the
 * telling's "said today"): the wording pieces, kept as the player's own
 * knowledge, one key per piece, learned on the day. A wording heard today is
 * not picked again that day, so two housemates never give the same sentence
 * (owner, Nov 12: "basically saying the same thing").
 */
export const HEARD_PREFIX = "talk:heard:";

/** A town or state figure told today. */
export const HEARD_FIGURE = "figure:";
/** A policy question named today, by anyone in the house. */
export const HEARD_QUESTION = "question:";

/** A subject heard today, kept beside the pieces: news one housemate told is not told again by the next. */
export const HEARD_SUBJECT = "subject:";
export let heardNow: ReadonlySet<string> = new Set();
/** A piece heard from one speaker, kept beside the piece itself: each speaker's own wordings come round least recently used. */
export const HEARD_BY = "by:";
/** Every piece the player has heard at home, with the day it was last heard and from whom (when kept). */
export let heardRows: readonly { key: string; at: string; by?: string }[] = [];

/** The pieces the player heard, with the day each was last heard (the record keeps the last day) and the speaker, oldest first. */
export function heardByDay(
  core: Readonly<CoreState>,
  playerId: PersonId,
): { key: string; at: string; by?: string }[] {
  const rows: { key: string; at: string; by?: string }[] = [];
  for (const [key, fact] of core.knowledgeByPerson.get(playerId) ?? []) {
    if (!key.startsWith(HEARD_PREFIX)) continue;
    const rest = key.slice(HEARD_PREFIX.length);
    const by = rest.startsWith(HEARD_BY)
      ? /^by:(?<speaker>[^:]+):(?<piece>.+)$/.exec(rest)?.groups
      : undefined;
    rows.push(
      by?.speaker && by.piece
        ? { key: by.piece, at: fact.learnedAt, by: by.speaker }
        : { key: rest, at: fact.learnedAt },
    );
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The pieces heard, oldest first, for one speaker: what the house said, then
 * what this speaker said, so a wording this speaker used comes back last and
 * one they used longest ago first (least recently used, no dice).
 */
export function heardOrderFor(speakerId: PersonId): string[] {
  return [
    ...heardRows.filter((row) => !row.by).map((row) => row.key),
    ...heardRows.filter((row) => row.by === speakerId).map((row) => row.key),
  ];
}

export function heardToday(
  core: Readonly<CoreState>,
  playerId: PersonId,
): Set<string> {
  const out = new Set<string>();
  for (const [key, fact] of core.knowledgeByPerson.get(playerId) ?? [])
    if (key.startsWith(HEARD_PREFIX) && fact.learnedAt === core.date)
      out.add(key.slice(HEARD_PREFIX.length));
  return out;
}

/**
 * Keeps a piece as heard now. The player's record holds its pieces in the
 * order last heard, so a piece heard again moves after the rest: the least
 * recently used wording is read from that order (`heardToday`,
 * `heardByDay`), and a piece kept where it was first heard would be the
 * "oldest" every time once a day had heard them all (conversation.test,
 * Jackson Center, Ohio: one hello, "Hey.", in nearly every greeting).
 */
export function hear(
  core: CoreState,
  playerId: PersonId,
  fact: KnownFact,
): void {
  core.knowledgeByPerson.get(playerId)?.delete(fact.key);
  coreAPI(core).observe(playerId, fact);
}

/** Runs a step of the talk with what the player heard today held back from the picks. */
export function withHeard<T>(
  core: Readonly<CoreState>,
  playerId: PersonId,
  run: () => T,
): T {
  const before = heardNow;
  const order = heardRows;
  heardNow = heardToday(core, playerId);
  heardRows = heardByDay(core, playerId);
  try {
    return run();
  } finally {
    heardNow = before;
    heardRows = order;
  }
}
