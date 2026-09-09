import type { RawArtifact } from "../../core/index";
import type { ProvisionValidity } from "./types";

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
    amendmentAnnotations: [
      "Amended August 17, 1965",
      "Amended August 4, 1970",
    ],
  },
  "nv-nrs-228": {
    validFrom: "2021-05-29",
    validThrough: null,
    basisArtifactId: "nv-2021-chapter-199-ab236",
    basisLocator: "2021 Nev. Stat., ch. 199, §§ 1-2",
    basisExcerpt: "This act becomes effective upon passage and approval.",
    amendmentAnnotations: ["NRS A 2021, 932", "NRS A 2025, 2094"],
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
};

export function qualificationProvisionValidity(
  sourceArtifactId: string,
  sourceArtifact: RawArtifact,
  openedArtifacts: Readonly<Record<string, { artifact: RawArtifact; bytes: Buffer }>>,
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

  const basis = openedArtifacts[review.basisArtifactId];
  if (!basis) {
    throw new Error(
      `Temporal review for ${sourceArtifactId} requires unopened artifact ${review.basisArtifactId}.`,
    );
  }
  // The capability exposes enacted text only. Publisher date labels remain
  // reviewable in the locked raw capture and are pinned by its artifact hash.
  if (
    review.expectedArtifactText === undefined &&
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

export function unknownTransportValidity(
  reason: string,
): ProvisionValidity {
  return { state: "UNKNOWN", reason, amendmentAnnotations: [] };
}
