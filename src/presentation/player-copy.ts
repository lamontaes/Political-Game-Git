/**
 * What ordinary play is allowed to say out loud.
 *
 * The engine knows a great deal about why it is showing you what it is showing
 * you: which record established a fact, whether a source was retrieved, whether
 * your character has standing to know something, which rule version applied.
 * All of that stays. None of it belongs in front of somebody who is playing the
 * game, because a player is not a developer and does not need the engine
 * narrating its own epistemology at them.
 *
 * So the rule is a separation, not a deletion. Knowledge, authority, access and
 * visibility keep gating behaviour exactly as before — silently, in the
 * resolver. When the player genuinely needs to be told why something is not
 * available, they get an in-world reason a person could say to them ("You
 * haven't been introduced"), never a ledger line ("no record establishes...").
 * And when there is nothing in-world to say, the right answer is to leave the
 * unavailable thing out rather than print a diagnostic about its absence.
 *
 * The forbidden list below is deliberately finite and deliberately narrow. It
 * is a guard over what player-facing surfaces *render*, not a repository-wide
 * word ban: internal documents, source domains, tests, developer routes and the
 * provenance machinery itself all legitimately use this vocabulary, and a blunt
 * global blacklist would either block them or bully genuine in-world civic
 * terms ("public record", "sourced reporting") out of a game about government.
 */

/** A phrase ordinary play may not render, and what to do instead. */
export interface ForbiddenPlayerPhrase {
  readonly pattern: RegExp;
  /** Why it is forbidden, quoted back when the guard trips. */
  readonly because: string;
}

/**
 * Developer/knowledge-ledger language and research metadata that ordinary play
 * must never render. Each entry is a specific construction that actually leaked
 * into a player surface, not a general prohibition on the words in it.
 */
export const FORBIDDEN_PLAYER_PHRASES: readonly ForbiddenPlayerPhrase[] = [
  {
    pattern: /\bnot known to you\b/i,
    because: "knowledge-ledger prose; withhold silently instead",
  },
  {
    pattern: /\byour character does not know\b/i,
    because: "knowledge-ledger prose; withhold silently instead",
  },
  {
    pattern: /\bno record establishes\b/i,
    because: "ledger language; omit the line or give an in-world reason",
  },
  {
    pattern: /\bdoes not establish\b/i,
    because: "ledger language; omit the line or give an in-world reason",
  },
  {
    pattern: /\b(?:is|are|remains?) not established\b/i,
    because: "ledger language; omit the line or give an in-world reason",
  },
  {
    pattern: /\bunestablished\b/i,
    because: "ledger language; omit the line or give an in-world reason",
  },
  {
    pattern: /\bthe source does not\b/i,
    because: "source-status prose; internal only",
  },
  {
    pattern: /\bno sourced\b/i,
    because: "source-status prose; internal only",
  },
  {
    pattern: /\bsourced (?:observations?|data|records?|real-world)\b/i,
    because: "source-status prose; internal only",
  },
  {
    pattern: /\bwhat the game does not know\b/i,
    because: "developer banner; the engine does not narrate itself",
  },
  {
    pattern: /\bsimulated history\b/i,
    because: "implementation vocabulary; internal only",
  },
  {
    pattern: /\bretriev(?:ed|al)\b/i,
    because: "ingestion metadata; internal only",
  },
  {
    pattern: /\bSHA-?256\b/i,
    because: "ingestion metadata; internal only",
  },
  {
    pattern: /\bproduct vintages?\b/i,
    because: "ingestion metadata; internal only",
  },
  {
    pattern: /\baccepted corpus\b/i,
    because: "ingestion metadata; internal only",
  },
  {
    pattern: /\bprovenance\b/i,
    because: "engine vocabulary; internal only",
  },
  {
    pattern: /\bgovernment ID\b/i,
    because: "raw record identifier; internal only",
  },
  {
    pattern: /\bMissing data (?:is|stays)\b/i,
    because: "engine policy statement; internal only",
  },
  {
    pattern: /\bhttps?:\/\//i,
    because: "external research link; internal only",
  },
];

/**
 * Tests the one string a surface is about to render.
 *
 * Returns every forbidden construction found, so a single pass reports all of
 * them rather than making the reader fix one and run again.
 */
export function forbiddenPlayerPhrasesIn(
  text: string,
): readonly ForbiddenPlayerPhrase[] {
  return FORBIDDEN_PLAYER_PHRASES.filter((entry) => entry.pattern.test(text));
}

/**
 * The in-world reasons a surface may give when it has to say something.
 *
 * These are the sentences a person could actually say to the player. They are
 * shared so that two screens refusing for the same reason refuse in the same
 * words, and so that the vocabulary stays small enough to stay in character.
 */
export const PLAYER_REFUSALS = {
  /** They exist, you have simply never met. */
  notIntroduced: "You haven't been introduced.",
  /** No way to reach them from where the character stands right now. */
  noWayToReach: "You don't have a way to reach them right now.",
  /** The office itself lacks the authority, whoever is holding it. */
  officeCannotAct: "This office can't take that action.",
  /** Nothing has been filed, published or decided yet. */
  nothingYet: "Nothing has been announced yet.",
} as const;
