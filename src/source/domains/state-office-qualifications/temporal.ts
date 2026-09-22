import type { RawArtifact } from "../../core/index";
import type { ProvisionValidity } from "./types";

interface TemporalOpenedArtifact {
  readonly artifact: RawArtifact;
  readonly bytes: Buffer;
  readonly verifiedSourceLiterals: readonly string[];
}

/** A reviewed, provision-specific temporal transcription. */
interface ExactTemporalReview {
  readonly validFrom: string;
  readonly validThrough: string | null;
  readonly basisArtifactId: string;
  readonly basisLocator: string;
  readonly basisExcerpt: string;
  /** Exact publisher text captured in the locked page for reviewer comparison. */
  readonly expectedArtifactText?: string;
  readonly amendmentAnnotations?: readonly string[];
}

/**
 * Dates below are promoted only where the acquired primary material itself
 * identifies the current provision version or an enacting act supplies an
 * exact operative clause.  Unlisted sources are observations of current text,
 * not silently back-dated law.
 */
const EXACT_TEMPORAL_REVIEWS: Readonly<Record<string, ExactTemporalReview>> = {
  "mo-constitution-art-3-sec-4": {
    validFrom: "1945-02-27",
    validThrough: null,
    basisArtifactId: "mo-constitution-art-3-sec-4",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective - 27 Feb 1945",
    expectedArtifactText: "Effective -  27 Feb 1945",
  },
  "mo-constitution-art-3-sec-6": {
    validFrom: "1945-02-27",
    validThrough: null,
    basisArtifactId: "mo-constitution-art-3-sec-6",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective - 27 Feb 1945",
    expectedArtifactText: "Effective -  27 Feb 1945",
  },
  "mo-constitution-art-3-sec-8": {
    validFrom: "2002-12-05",
    validThrough: null,
    basisArtifactId: "mo-constitution-art-3-sec-8",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective - 05 Dec 2002",
    expectedArtifactText: "Effective -  05 Dec 2002",
    amendmentAnnotations: [
      "Adopted November 3, 1992",
      "Amended November 5, 2002",
    ],
  },
  "mo-constitution-art-4-sec-1": {
    validFrom: "1945-02-27",
    validThrough: null,
    basisArtifactId: "mo-constitution-art-4-sec-1",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective - 27 Feb 1945",
    expectedArtifactText: "Effective -  27 Feb 1945",
  },
  "mo-constitution-art-4-sec-3": {
    validFrom: "1945-02-27",
    validThrough: null,
    basisArtifactId: "mo-constitution-art-4-sec-3",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective - 27 Feb 1945",
    expectedArtifactText: "Effective -  27 Feb 1945",
  },
  "mo-constitution-art-4-sec-17": {
    validFrom: "1970-09-03",
    validThrough: null,
    basisArtifactId: "mo-constitution-art-4-sec-17",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective - 03 Sep 1970",
    expectedArtifactText: "Effective -  03 Sep 1970",
    amendmentAnnotations: ["Amended August 17, 1965", "Amended August 4, 1970"],
  },
  "nv-nrs-228": {
    validFrom: "2021-05-29",
    validThrough: null,
    basisArtifactId: "nv-2021-chapter-199-ab236",
    basisLocator: "2021 Nev. Stat., ch. 199, §§ 1-2",
    basisExcerpt: "This act becomes effective upon passage and approval.",
    amendmentAnnotations: ["NRS A 2021, 932", "NRS A 2025, 2094"],
  },
  // The current NRS 218A.200 words are the words 2025 Nev. Stat. ch. 323 § 12
  // enacted. Section 78 makes them govern every candidacy filed after
  // October 1, 2025; the act has no other effective-date section, and the
  // Legislature's passed-bills list records "Effective October 1, 2025."
  // Nothing acquired dates the four paragraphs that predate the act, so an
  // earlier date stays unestablished rather than back-dated.
  "nv-nrs-218a": {
    validFrom: "2025-10-01",
    validThrough: null,
    basisArtifactId: "nv-2025-chapter-323-ab491",
    basisLocator: "2025 Nev. Stat., ch. 323, §§ 12, 78",
    basisExcerpt:
      "the amendatory provisions of this act apply to every person who, after October 1, 2025, files a declaration of candidacy for any elected office in this State other than federal office.",
    amendmentAnnotations: [
      "NRS A 2025, 2092",
      "2025 Nev. Stat., ch. 323 (AB 491), approved June 5, 2025",
      "Nevada Legislature, 83rd Session passed bills: AB491, Chapter 323, Effective October 1, 2025.",
    ],
  },
  // The Legislature's published constitution annotates this paragraph with the
  // date its current words took effect. Earlier versions were not acquired.
  "nj-constitution-art-4-sec-1": {
    validFrom: "1966-12-08",
    validThrough: null,
    basisArtifactId: "nj-constitution-art-4-sec-1",
    basisLocator: "publisher amendment annotation",
    basisExcerpt:
      "Article IV, Section I, paragraph 2 amended effective December 8, 1966.",
    expectedArtifactText:
      "Article IV, Section I, paragraph 2 amended effective December 8, 1966.",
  },
  // The page records Article CI's ratification by the people on November 5,
  // 1974, and Amendment Art. XLVIII, IV, § 5 makes a legislative amendment part
  // of the constitution when the voters approve it. Articles CIX, CXVII and
  // CXIX later struck only census and districting sentences of Article CI; the
  // residence sentences compiled here are untouched by them.
  "ma-constitution-amend-art-101": {
    validFrom: "1974-11-05",
    validThrough: null,
    basisArtifactId: "ma-constitution-amend-art-101",
    basisLocator: "publisher ratification note; Amend. Art. XLVIII, IV, § 5",
    basisExcerpt:
      "The one hundred and first and one hundred and second Articles of Amendment were adopted by the General Court during the sessions 1971 and 1973, and both Articles were approved and ratified by the people on the fifth day of November, 1974.",
    // Verified against the publisher's raw bytes, which wrap this note across
    // lines and <em> tags; the literal reproduces that span exactly so a
    // reformatted page fails the compile instead of silently re-dating it.
    expectedArtifactText:
      "The <em>one hundred and first</em> and <em>\r\n                  one hundred and\r\n                  second\r\n              </em> Articles of Amendment were adopted by the General\r\n              Court during the sessions 1971 and 1973, and both Articles were\r\n              approved and ratified by the people on the fifth day of\r\n              November, 1974.",
    amendmentAnnotations: [
      "Amend. Art. XLVIII, IV, § 5: a legislative amendment becomes part of the constitution if approved by a majority of the voters voting thereon.",
      "Amend. Arts. CIX (ratified November 7, 1978), CXVII (ratified November 6, 1990) and CXIX amend only the census and districting sentences of Article CI.",
    ],
  },
  "oh-constitution-sec-15-4": {
    validFrom: "1953-11-03",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-15-4",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: November 3, 1953",
    expectedArtifactText: "November 3, 1953",
  },
  "oh-constitution-sec-2-1": {
    validFrom: "1953-11-03",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-2-1",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: November 3, 1953",
    expectedArtifactText: "November 3, 1953",
  },
  "oh-constitution-sec-2-2": {
    validFrom: "1992-11-03",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-2-2",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: November 3, 1992",
    expectedArtifactText: "November 3, 1992",
    amendmentAnnotations: [
      "Only terms beginning on or after January 1, 1993 shall be considered",
    ],
  },
  "oh-constitution-sec-2-3": {
    validFrom: "1967-11-07",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-2-3",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: November 7, 1967",
    expectedArtifactText: "November 7, 1967",
  },
  "oh-constitution-sec-3-1": {
    validFrom: "1885-10-13",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-3-1",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: October 13, 1885",
    expectedArtifactText: "October 13, 1885",
  },
  "oh-constitution-sec-3-1b": {
    validFrom: "1979-01-08",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-3-1b",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: January 8, 1979",
    expectedArtifactText: "January 8, 1979",
  },
  "oh-constitution-sec-3-2": {
    validFrom: "1992-11-03",
    validThrough: null,
    basisArtifactId: "oh-constitution-sec-3-2",
    basisLocator: "publisher effective-date label",
    basisExcerpt: "Effective: November 3, 1992",
    expectedArtifactText: "November 3, 1992",
    amendmentAnnotations: [
      "Only terms beginning on or after January 1, 1995 shall be considered",
    ],
  },
  // Minnesota's revisor prints one effective-date label for the whole
  // constitution, because the 1974 revision re-adopted it entire. Every
  // Minnesota provision compiled here cites that one page, so this one review
  // dates them all, from a date read verbatim off the page.
  "mn-constitution": {
    validFrom: "1974-11-05",
    validThrough: null,
    basisArtifactId: "mn-constitution",
    basisLocator: "publisher revision-date label",
    basisExcerpt: "Generally Revised November 5, 1974",
    expectedArtifactText: "Generally Revised November 5, 1974",
  },
  // Nebraska. Each section's publisher page ends with its amendment history —
  // the origin year and every later amendment, as the Legislature prints them.
  // Those lines are primary material in the locked page, so the current words
  // are datable rather than a bare observation. The label gives a YEAR, not a
  // day: an amendment ratified at a November general election is in force no
  // later than the start of the following year, so `validFrom` is that
  // January 1. It is a conservative bound the page proves, never a claim to a
  // precise effective day the page does not state.
  "ne-constitution-art-3-sec-1": {
    validFrom: "2001-01-01",
    validThrough: null,
    basisArtifactId: "ne-constitution-art-3-sec-1",
    basisLocator:
      "publisher amendment history; in force by the January 1 after the 2000 amendment",
    basisExcerpt: "Amended 2000, Laws 1999, LR 18CA, sec. 3",
    expectedArtifactText: "Amended 2000, Laws 1999, LR 18CA, sec. 3",
  },
  "ne-constitution-art-3-sec-7": {
    validFrom: "1989-01-01",
    validThrough: null,
    basisArtifactId: "ne-constitution-art-3-sec-7",
    basisLocator:
      "publisher amendment history; in force by the January 1 after the 1988 amendment",
    basisExcerpt: "Amended 1988, Laws 1988, LR 7, sec. 1.",
    expectedArtifactText: "Amended 1988, Laws 1988, LR 7, sec. 1.",
  },
  "ne-constitution-art-3-sec-8": {
    validFrom: "1995-01-01",
    validThrough: null,
    basisArtifactId: "ne-constitution-art-3-sec-8",
    basisLocator:
      "publisher amendment history; in force by the January 1 after the 1994 amendment",
    basisExcerpt: "Amended 1994, Initiative Measure No. 408",
    expectedArtifactText: "Amended 1994, Initiative Measure No. 408",
  },
  "ne-constitution-art-3-sec-12": {
    validFrom: "2001-01-01",
    validThrough: null,
    basisArtifactId: "ne-constitution-art-3-sec-12",
    basisLocator:
      "publisher origin note; adopted 2000, in force by the following January 1",
    basisExcerpt: "sec. 12 (2000)",
    expectedArtifactText: "sec. 12 (2000)",
  },
  "ne-constitution-art-4-sec-1": {
    validFrom: "2001-01-01",
    validThrough: null,
    basisArtifactId: "ne-constitution-art-4-sec-1",
    basisLocator:
      "publisher amendment history; in force by the January 1 after the 2000 amendment",
    basisExcerpt: "Laws 1999, LR 14CA, sec. 1.",
    expectedArtifactText: "Laws 1999, LR 14CA, sec. 1.",
  },
  "ne-constitution-art-4-sec-2": {
    validFrom: "1967-01-01",
    validThrough: null,
    basisArtifactId: "ne-constitution-art-4-sec-2",
    basisLocator:
      "publisher amendment history; in force by the January 1 after the 1966 amendment",
    basisExcerpt: "1965, c. 291, sec. 1, p. 832.",
    expectedArtifactText: "1965, c. 291, sec. 1, p. 832.",
  },
};

/**
 * Exact non-enacted publisher labels the source opener must verify before a
 * temporal review can promote a provision date. The returned literals are
 * requirements, not proof: only `openProductionArtifacts` may turn them into
 * receipts after hashing and inspecting the acquired publisher bytes.
 */
export function qualificationTemporalSourceLiterals(): Readonly<
  Record<string, readonly string[]>
> {
  const requirements: Record<string, string[]> = {};
  for (const review of Object.values(EXACT_TEMPORAL_REVIEWS)) {
    if (review.expectedArtifactText === undefined) continue;
    const literals = requirements[review.basisArtifactId] ?? [];
    if (!literals.includes(review.expectedArtifactText)) {
      literals.push(review.expectedArtifactText);
    }
    requirements[review.basisArtifactId] = literals;
  }
  return requirements;
}

export function qualificationProvisionValidity(
  sourceArtifactId: string,
  sourceArtifact: RawArtifact,
  openedArtifacts: Readonly<Record<string, TemporalOpenedArtifact>>,
  provisionByKey: ReadonlyMap<string, string>,
): ProvisionValidity {
  const review = EXACT_TEMPORAL_REVIEWS[sourceArtifactId];
  if (!review) {
    return {
      state: "CURRENT_OBSERVATION",
      observedOn: sourceArtifact.retrieval.retrievedAt.slice(0, 10),
      reason:
        "The acquired publisher snapshot proves the current words on this observation date, but no claim-specific primary material in this corpus proves how far back those same words applied.",
      amendmentAnnotations: [],
    };
  }

  if (sourceArtifact.artifactId !== sourceArtifactId) {
    throw new Error(
      `Temporal review for ${sourceArtifactId} was handed source artifact ${sourceArtifact.artifactId}.`,
    );
  }

  const basis = openedArtifacts[review.basisArtifactId];
  if (!basis) {
    throw new Error(
      `Temporal review for ${sourceArtifactId} requires unopened artifact ${review.basisArtifactId}.`,
    );
  }
  if (basis.artifact.artifactId !== review.basisArtifactId) {
    throw new Error(
      `Temporal review for ${sourceArtifactId} requires artifact ${review.basisArtifactId}, but that role holds ${basis.artifact.artifactId}.`,
    );
  }
  if (review.expectedArtifactText !== undefined) {
    if (!basis.verifiedSourceLiterals.includes(review.expectedArtifactText)) {
      throw new Error(
        `Temporal review for ${sourceArtifactId} has no verified source-byte receipt for ${JSON.stringify(review.expectedArtifactText)} in ${review.basisArtifactId}.`,
      );
    }
  } else if (
    ![...provisionByKey.entries()].some(
      ([key, text]) =>
        key.startsWith(`${review.basisArtifactId}::`) &&
        text.includes(review.basisExcerpt),
    )
  ) {
    throw new Error(
      `Temporal review for ${sourceArtifactId} cannot find its operative clause in ${review.basisArtifactId}.`,
    );
  }
  return {
    state: "EXACT_INTERVAL",
    validFrom: review.validFrom,
    validThrough: review.validThrough,
    basisArtifactId: review.basisArtifactId,
    basisLocator: review.basisLocator,
    basisExcerpt: review.basisExcerpt,
    amendmentAnnotations: review.amendmentAnnotations ?? [],
  };
}

export function unknownTransportValidity(reason: string): ProvisionValidity {
  return { state: "UNKNOWN", reason, amendmentAnnotations: [] };
}
