/**
 * A composed text: a whole speech, talk, scene, Journal note or page, news
 * toast or story, or narration, as the player met it in a played world
 * (docs/design/words-composer.md, part 6). The composed checks
 * (`./composed-checks.ts`) read these, so the owner's notes about text put
 * together (a speech, an exchange, a page) can be tested at all, where a
 * line rule reads one bank piece alone.
 *
 * `scripts/words/composed.ts` plays a new life and builds the texts from
 * what the bench's own routes return; a check's fixtures build them by hand.
 * Pure: no files, no world.
 */

/** Every kind of composed text a check may apply to. */
export const COMPOSED_KINDS = [
  "speech:president",
  "speech:governor",
  "speech:mayor",
  "speech:player",
  "talk:home",
  "talk:town",
  "scene",
  "journal:note",
  "journal:page",
  "news:toast",
  "news:story",
  "narration",
] as const;
export type ComposedKind = (typeof COMPOSED_KINDS)[number];

/** One thing said on a screen, by whom (none for narration or print). */
export interface ComposedLine {
  readonly speakerId?: string;
  readonly text: string;
  readonly sentences: readonly string[];
}

/** One screen: what it says, and the replies it offers the player. */
export interface ComposedScreen {
  readonly lines: readonly ComposedLine[];
  readonly offered: readonly string[];
}

export interface ComposedText {
  /** Unique within a sample: the kind, the day and an index. */
  readonly id: string;
  readonly kind: ComposedKind;
  /** The game date it was met on (YYYY-MM-DD) and the minute of that day. */
  readonly date: string;
  readonly minuteOfDay: number;
  readonly speakerId?: string;
  readonly listenerId?: string;
  /** Everyone in the room when it was said, the player included. */
  readonly presentIds: readonly string[];
  readonly screens: readonly ComposedScreen[];
  /**
   * Place names that belong to the speaker's own jurisdiction (a governor's
   * state, a mayor's town and state); a national speech has none.
   */
  readonly ownPlaces?: readonly string[];
  /** Composed from the world's records outside the window, not met in play. */
  readonly proof?: boolean;
}

/** A person the world could name: their full and given names and their role, if they hold one. */
export interface NamedPerson {
  readonly id: string;
  readonly full: string;
  readonly given: string;
  readonly role?: string;
}

/** What one played life gave: its place and seed, its texts and the people it could name. */
export interface ComposedSample {
  readonly place: string;
  readonly seed: string;
  readonly playerId: string;
  /** The player's household, the player included. */
  readonly householdIds: readonly string[];
  readonly people: readonly NamedPerson[];
  /** The names of all 56 states and territories. */
  readonly stateNames: readonly string[];
  /** The player's town, for a national speech that must not name it. */
  readonly townName: string;
  readonly texts: readonly ComposedText[];
}

/** A text's sentences, split after a full stop, question or exclamation mark followed by a space. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** A line as a check reads it. */
export function composedLine(text: string, speakerId?: string): ComposedLine {
  return {
    ...(speakerId ? { speakerId } : {}),
    text,
    sentences: sentencesOf(text),
  };
}

/** Every line of a text, in order. */
export const linesOf = (text: ComposedText): ComposedLine[] =>
  text.screens.flatMap((screen) => [...screen.lines]);

/** A sentence for comparing: lower case, plain quotes, no edge punctuation, single spaces. */
export function plainSentence(sentence: string): string {
  return sentence
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
