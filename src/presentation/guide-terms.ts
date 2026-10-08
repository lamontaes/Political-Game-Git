import glossary from "../../data/research/glossary/terms.json";

/**
 * The one term catalog: what the words on the screen mean.
 *
 * A player reading a docket meets "referral", "concurrence" and "presentment"
 * in the same afternoon. Until now the game either said them and hoped, or
 * explained them in one panel's own private copy — the press panel's
 * ground-rule glossary is exactly that, and it stays where it is because it
 * explains a newsroom agreement rather than a legislature. Everything
 * institutional belongs here instead, once, so inline help beside a word and
 * the searchable Guide are two views of the same entry and can never disagree.
 *
 * Two rules hold this module honest.
 *
 * Every definition is written for this game in our own words. Nothing is
 * copied from a chamber's own glossary, and the pages consulted while writing
 * an entry stay in `authoring`, which no player surface renders: a source URL
 * in the middle of play is a research note, not an explanation.
 *
 * An entry describes a term, never the player's own chamber. The game supports
 * many jurisdictions, and their rules genuinely differ, so where a practice is
 * not universal the entry says which record decides instead of asserting a
 * rule that would be wrong somewhere. `contextNote` is where that is said.
 * Nothing here reads the World, and nothing here is a fact about a save.
 */

/** Research notes for the authors of an entry. Never shown in play. */
export interface GuideTermAuthoring {
  readonly sourceNotes: string;
  readonly sourceUrls: readonly string[];
}

export interface GuideTermEntry {
  readonly semanticKey: string;
  /** The term as the player meets it, capitalized as a sentence would be. */
  readonly term: string;
  /** One sentence. This is what an inline popover shows. */
  readonly shortDefinition: string;
  /** The longer reading, for the Guide's entry detail. */
  readonly explanation: string;
  /** Where the practice is not universal, which record actually decides. */
  readonly contextNote?: string;
  readonly relatedKeys: readonly string[];
  /** The one source the definition was written from. */
  readonly source: GuideTermSource;
  readonly authoring: GuideTermAuthoring;
}

export interface GuideTermSource {
  readonly note: string;
  readonly url: string | null;
}

interface GuideTermRow {
  readonly semanticKey: string;
  readonly term: string;
  readonly shortDefinition: string;
  readonly explanation: string;
  readonly contextNote?: string;
  readonly relatedKeys: readonly string[];
  readonly source: GuideTermSource;
}

export const GUIDE_TERMS: readonly GuideTermEntry[] = (
  glossary as { terms: readonly GuideTermRow[] }
).terms.map((row) => ({
  semanticKey: row.semanticKey,
  term: row.term,
  shortDefinition: row.shortDefinition,
  explanation: row.explanation,
  ...(row.contextNote ? { contextNote: row.contextNote } : {}),
  relatedKeys: row.relatedKeys,
  source: row.source,
  authoring: {
    sourceNotes: row.source.note,
    sourceUrls: row.source.url ? [row.source.url] : [],
  },
}));

const BY_KEY: ReadonlyMap<string, GuideTermEntry> = new Map(
  GUIDE_TERMS.map((entry) => [entry.semanticKey, entry]),
);

/**
 * Exact whole-string lookup, for wrapping a label a surface already shows.
 *
 * Deliberately not a search over prose. A surface hands over one label it is
 * about to render — a seat title, a column heading — and gets an entry only
 * when that whole label is the term. Scanning player prose for words that
 * merely look institutional would attach explanations to somebody's surname.
 */
const BY_TERM: ReadonlyMap<string, GuideTermEntry> = new Map(
  GUIDE_TERMS.map((entry) => [entry.term.toLowerCase(), entry]),
);

export function guideTerm(semanticKey: string): GuideTermEntry | null {
  return BY_KEY.get(semanticKey) ?? null;
}

export function guideTermByLabel(label: string): GuideTermEntry | null {
  return BY_TERM.get(label.trim().toLowerCase()) ?? null;
}

export function relatedGuideTerms(
  entry: GuideTermEntry,
): readonly GuideTermEntry[] {
  return entry.relatedKeys
    .map((key) => BY_KEY.get(key))
    .filter((related): related is GuideTermEntry => related !== undefined);
}

export interface GuideSearchResult {
  readonly entry: GuideTermEntry;
  /** Why it matched, so the list can say so rather than look arbitrary. */
  readonly matched: "term" | "definition";
}

/**
 * The Guide's search, as a pure projection.
 *
 * An empty query is the whole catalog rather than nothing: the Guide opens as
 * something to browse. A term match sorts above a definition match, and a term
 * the query starts sorts above one it merely appears in, so typing "app" finds
 * Appropriation before the entries that happen to mention appropriated money.
 */
export function searchGuideTerms(
  query: string,
  entries: readonly GuideTermEntry[] = GUIDE_TERMS,
): readonly GuideSearchResult[] {
  const needle = query.trim().toLowerCase();
  const ranked: {
    readonly result: GuideSearchResult;
    readonly rank: number;
  }[] = [];
  for (const entry of entries) {
    const term = entry.term.toLowerCase();
    if (needle.length === 0) {
      ranked.push({ result: { entry, matched: "term" }, rank: 1 });
      continue;
    }
    if (term.startsWith(needle)) {
      ranked.push({ result: { entry, matched: "term" }, rank: 0 });
      continue;
    }
    if (term.includes(needle)) {
      ranked.push({ result: { entry, matched: "term" }, rank: 1 });
      continue;
    }
    const definition =
      `${entry.shortDefinition} ${entry.explanation} ${entry.contextNote ?? ""}`.toLowerCase();
    if (definition.includes(needle)) {
      ranked.push({ result: { entry, matched: "definition" }, rank: 2 });
    }
  }
  return ranked
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.result.entry.term.localeCompare(right.result.entry.term),
    )
    .map((row) => row.result);
}

/* ------------------------------------------------- recognizing a term in prose */

/**
 * Which terms may be recognized inside a sentence, and under which words.
 *
 * A surface that renders one word can wrap it by key. Most of what a player
 * actually reads is a whole sentence assembled elsewhere — "Filed, awaiting
 * referral", "It is written against the Rural Transit Assistance Act" — and
 * rewriting every producer to emit fragments would be a worse game for the
 * sake of a tooltip.
 *
 * So a term is recognized in prose only where an author has said it may be,
 * and only under the exact words listed here. Nothing is guessed from the
 * catalog: a term absent from this table is never annotated inside a sentence,
 * which is how "session" stays out of "a session of the court" and "reading"
 * stays out of "reading the paper". The definitions themselves still live in
 * `GUIDE_TERMS` and nowhere else, so the Guide and the help beside a word
 * cannot drift.
 *
 * Every phrase must belong to a real entry; `guide-terms.test.ts` asserts it.
 */
const INLINE_PHRASES: Readonly<Record<string, readonly string[]>> = {
  quorum: ["quorum"],
  "roll-call": ["roll call"],
  "committee-referral": ["committee referral", "referral"],
  "committee-chair": ["committee chair"],
  "ranking-member": ["ranking member"],
  "presiding-officer": ["presiding officer"],
  "president-pro-tempore": ["president pro tempore"],
  "majority-leader": ["majority leader"],
  "minority-leader": ["minority leader"],
  "majority-whip": ["majority whip"],
  caucus: ["caucus"],
  sponsor: ["sponsor"],
  cosponsor: ["cosponsor", "co-sponsor"],
  docket: ["docket"],
  "first-reading": ["first reading"],
  "second-reading": ["second reading"],
  "third-reading": ["third reading"],
  amendment: ["amendment"],
  concurrence: ["concurrence"],
  enrollment: ["enrollment"],
  presentment: ["presentment"],
  veto: ["veto"],
  appropriation: ["appropriation"],
  obligation: ["obligation"],
  "fiscal-note": ["fiscal note"],
  adjournment: ["adjournment"],
  speaker: ["speaker of the house", "speaker of the assembly"],
  "committee-assignment": ["committee assignment"],
  cloture: ["cloture"],
  "veto-override": ["veto override", "override the veto", "overrode the veto"],
  primary: [
    "primary election",
    "party primary",
    "primaries",
    "[the ]primary",
    "[a ]primary",
    "[this ]primary",
    "[that ]primary",
    "[their ]primary",
    "[his ]primary",
    "[her ]primary",
    "[your ]primary",
    "[the Democratic ]primary",
    "[the Republican ]primary",
  ],
  "filing-deadline": ["filing deadline"],
  "germane-amendment": ["germane amendment", "germane", "nongermane"],
  "recorded-vote": ["recorded vote"],
  "on-the-record": ["on the record", "on-the-record"],
  "on-background": ["on background"],
  "off-the-record": ["off the record", "off-the-record"],
};

export interface GuideTextSegment {
  readonly text: string;
  /** The entry this run of text explains, or null for ordinary prose. */
  readonly semanticKey: string | null;
}

/*
 * A word that is a term in one phrase and an ordinary word in the next.
 * "Primary" is an election after "the" and a plain adjective before "care",
 * so its bare phrases carry the words that must come before it (written in
 * brackets above, and never underlined) and this list of words that may not
 * come after it.
 */
const NOT_FOLLOWED_BY: Readonly<Record<string, readonly string[]>> = {
  primary: [
    "account",
    "breadwinner",
    "care",
    "caregiver",
    "color",
    "colors",
    "concern",
    "doctor",
    "earner",
    "focus",
    "goal",
    "heating",
    "home",
    "income",
    "job",
    "key",
    "language",
    "physician",
    "purpose",
    "reason",
    "residence",
    "responsibility",
    "role",
    "school",
    "source",
    "target",
    "way",
  ],
};

const INLINE_MATCHES: readonly {
  /** Words that must come first, matched but not underlined. */
  readonly before: string;
  readonly phrase: string;
  readonly semanticKey: string;
}[] = Object.entries(INLINE_PHRASES)
  .flatMap(([semanticKey, phrases]) =>
    phrases.map((written) => {
      const bracket = /^\[([^\]]*)\](.*)$/.exec(written);
      return {
        before: (bracket?.[1] ?? "").toLowerCase(),
        phrase: (bracket?.[2] ?? written).toLowerCase(),
        semanticKey,
      };
    }),
  )
  /* Longest first, so "committee referral" wins over "referral". */
  .sort(
    (left, right) =>
      right.before.length +
      right.phrase.length -
      (left.before.length + left.phrase.length),
  );

function followedByOrdinaryWord(semanticKey: string, rest: string): boolean {
  const excluded = NOT_FOLLOWED_BY[semanticKey];
  if (!excluded) return false;
  const next = /^\s+([a-z]+)/i.exec(rest)?.[1]?.toLowerCase();
  return next !== undefined && excluded.includes(next);
}

function isWordEdge(character: string | undefined): boolean {
  return character === undefined || !/[A-Za-z0-9]/.test(character);
}

/**
 * Split a sentence into ordinary prose and the terms worth explaining.
 *
 * A term is annotated at its first appearance only. Three tooltips on three
 * repetitions of "appropriation" in one paragraph is noise, and the player has
 * already been offered the explanation by the time they reach the second one.
 * Matching is whole-word and case-insensitive, and the segment keeps the text
 * exactly as it was written, so the sentence a player reads is unchanged.
 */
export function annotateGuideTerms(text: string): readonly GuideTextSegment[] {
  const claimed: { start: number; end: number; semanticKey: string }[] = [];
  const lower = text.toLowerCase();
  const used = new Set<string>();

  for (const { before, phrase, semanticKey } of INLINE_MATCHES) {
    if (used.has(semanticKey)) continue;
    let from = 0;
    for (;;) {
      const found = lower.indexOf(before + phrase, from);
      if (found < 0) break;
      const at = found + before.length;
      const end = at + phrase.length;
      const whole =
        isWordEdge(text[found - 1]) &&
        !followedByOrdinaryWord(semanticKey, text.slice(end)) &&
        /* A plural or possessive is the same term, so allow a trailing s. */
        (isWordEdge(text[end]) ||
          (text[end]?.toLowerCase() === "s" && isWordEdge(text[end + 1])));
      const free = !claimed.some((span) => at < span.end && end > span.start);
      if (whole && free) {
        const grown = text[end]?.toLowerCase() === "s" ? end + 1 : end;
        claimed.push({ start: at, end: grown, semanticKey });
        used.add(semanticKey);
        break;
      }
      from = found + 1;
    }
  }

  if (claimed.length === 0) return [{ text, semanticKey: null }];

  claimed.sort((left, right) => left.start - right.start);
  const segments: GuideTextSegment[] = [];
  let cursor = 0;
  for (const span of claimed) {
    if (span.start > cursor)
      segments.push({
        text: text.slice(cursor, span.start),
        semanticKey: null,
      });
    segments.push({
      text: text.slice(span.start, span.end),
      semanticKey: span.semanticKey,
    });
    cursor = span.end;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), semanticKey: null });
  return segments;
}
