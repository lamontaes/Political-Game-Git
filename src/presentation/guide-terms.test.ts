import { describe, expect, it } from "vitest";

import {
  annotateGuideTerms,
  GUIDE_TERMS,
  guideTerm,
  guideTermByLabel,
  relatedGuideTerms,
  searchGuideTerms,
} from "./guide-terms";

/** Every term the packet named as required coverage. */
const REQUIRED_KEYS = [
  "majority-whip",
  "president-pro-tempore",
  "ranking-member",
  "quorum",
  "committee-referral",
  "amendment",
  "concurrence",
  "enrollment",
  "presentment",
  "veto",
  "appropriation",
  "obligation",
  // UI 2 orders, September 29, 2026: the terms a new player meets first.
  "committee-assignment",
  "cloture",
  "veto-override",
  "primary",
  "filing-deadline",
  "germane-amendment",
  "recorded-vote",
  "on-the-record",
  "on-background",
  "off-the-record",
] as const;

const URL_PATTERN = /https?:\/\/|www\.|\.com|\.gov\b/i;

describe("the term catalog", () => {
  it("has a unique key and a unique term for every entry", () => {
    const keys = GUIDE_TERMS.map((entry) => entry.semanticKey);
    const terms = GUIDE_TERMS.map((entry) => entry.term.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("covers the institutional terms the game already shows", () => {
    for (const key of REQUIRED_KEYS) expect(guideTerm(key)).not.toBeNull();
  });

  it("gives every entry both a short definition and an explanation", () => {
    for (const entry of GUIDE_TERMS) {
      expect(entry.shortDefinition.trim().length).toBeGreaterThan(20);
      expect(entry.explanation.trim().length).toBeGreaterThan(
        entry.shortDefinition.trim().length,
      );
      // One sentence inline, so the popover is a definition and not a page.
      expect(entry.shortDefinition.trim().endsWith(".")).toBe(true);
    }
  });

  it("resolves every related key, and never relates an entry to itself", () => {
    for (const entry of GUIDE_TERMS) {
      expect(relatedGuideTerms(entry).length).toBe(entry.relatedKeys.length);
      expect(entry.relatedKeys).not.toContain(entry.semanticKey);
      expect(new Set(entry.relatedKeys).size).toBe(entry.relatedKeys.length);
    }
  });

  it("keeps research addresses out of every player-facing field", () => {
    for (const entry of GUIDE_TERMS) {
      for (const field of [
        entry.term,
        entry.shortDefinition,
        entry.explanation,
        entry.contextNote ?? "",
      ]) {
        expect(field).not.toMatch(URL_PATTERN);
      }
    }
  });

  it("keeps authoring notes separate, where a URL is allowed", () => {
    for (const entry of GUIDE_TERMS) {
      expect(entry.authoring.sourceNotes.trim().length).toBeGreaterThan(0);
      for (const url of entry.authoring.sourceUrls) {
        expect(url).toMatch(/^https:\/\//);
      }
    }
  });

  it("matches a whole label only, so prose is never scanned for terms", () => {
    expect(guideTermByLabel("President Pro Tempore")?.semanticKey).toBe(
      "president-pro-tempore",
    );
    expect(guideTermByLabel("  quorum  ")?.semanticKey).toBe("quorum");
    expect(guideTermByLabel("Council Member, District 3")).toBeNull();
    expect(guideTermByLabel("Whipple Memorial Town Hall")).toBeNull();
  });
});

describe("the Guide's search", () => {
  it("opens as the whole catalog to browse", () => {
    expect(searchGuideTerms("").length).toBe(GUIDE_TERMS.length);
    expect(searchGuideTerms("   ").length).toBe(GUIDE_TERMS.length);
  });

  it("matches a term whatever the case", () => {
    const upper = searchGuideTerms("QUORUM");
    const lower = searchGuideTerms("quorum");
    expect(upper.map((row) => row.entry.semanticKey)).toEqual(
      lower.map((row) => row.entry.semanticKey),
    );
    expect(lower[0]?.entry.semanticKey).toBe("quorum");
    expect(lower[0]?.matched).toBe("term");
  });

  it("matches the definition as well as the term, and says which", () => {
    const results = searchGuideTerms("vote counter");
    expect(results.map((row) => row.entry.semanticKey)).toContain(
      "majority-whip",
    );
    expect(
      results.find((row) => row.entry.semanticKey === "majority-whip")?.matched,
    ).toBe("definition");
  });

  it("sorts a term match above a definition match", () => {
    const results = searchGuideTerms("appropriat");
    expect(results[0]?.entry.semanticKey).toBe("appropriation");
    const obligation = results.findIndex(
      (row) => row.entry.semanticKey === "obligation",
    );
    expect(obligation).toBeGreaterThan(0);
  });

  it("returns nothing for a query no entry mentions", () => {
    expect(searchGuideTerms("xyzzy")).toEqual([]);
  });
});

describe("recognizing a term inside a sentence", () => {
  it("splits a term out of ordinary prose, keeping the text exact", () => {
    const segments = annotateGuideTerms("Filed, awaiting referral");
    expect(segments.map((s) => s.text).join("")).toBe(
      "Filed, awaiting referral",
    );
    const term = segments.find((s) => s.semanticKey !== null);
    expect(term?.semanticKey).toBe("committee-referral");
    expect(term?.text).toBe("referral");
  });

  it("only annotates phrases the catalog has entries for", () => {
    for (const segment of annotateGuideTerms(
      "The appropriation went to committee.",
    )) {
      if (segment.semanticKey)
        expect(guideTerm(segment.semanticKey)).not.toBeNull();
    }
  });

  it("prefers the longer phrase over a substring of it", () => {
    const segments = annotateGuideTerms("Sent on committee referral today");
    const term = segments.find((s) => s.semanticKey !== null);
    expect(term?.semanticKey).toBe("committee-referral");
    expect(term?.text).toBe("committee referral");
  });

  it("matches whole words only, and a trailing plural", () => {
    expect(
      annotateGuideTerms("a session of the court").some(
        (s) => s.semanticKey !== null,
      ),
    ).toBe(false);
    const plural = annotateGuideTerms("Two appropriations were filed");
    const term = plural.find((s) => s.semanticKey !== null);
    expect(term?.semanticKey).toBe("appropriation");
    expect(term?.text).toBe("appropriations");
  });

  it("annotates a repeated term once", () => {
    const segments = annotateGuideTerms(
      "The appropriation is a large appropriation.",
    );
    expect(
      segments.filter((s) => s.semanticKey === "appropriation").length,
    ).toBe(1);
  });

  it("finds the new civic terms in ordinary sentences", () => {
    const keyOf = (text: string) =>
      annotateGuideTerms(text).find((s) => s.semanticKey !== null);
    expect(keyOf("Cloture failed, 52 to 48.")?.semanticKey).toBe("cloture");
    expect(keyOf("They voted to override the veto.")?.semanticKey).toBe(
      "veto-override",
    );
    expect(keyOf("Her committee assignment came through.")?.semanticKey).toBe(
      "committee-assignment",
    );
    expect(keyOf("The amendment is not germane.")?.text).toBe("amendment");
    expect(
      annotateGuideTerms("The amendment is not germane.").some(
        (s) => s.semanticKey === "germane-amendment",
      ),
    ).toBe(true);
  });

  it("underlines only the election in a phrase like the primary", () => {
    const term = annotateGuideTerms("She lost the primary in May.").find(
      (s) => s.semanticKey !== null,
    );
    expect(term?.semanticKey).toBe("primary");
    expect(term?.text).toBe("primary");
    expect(
      annotateGuideTerms("She lost the primary in May.")
        .map((s) => s.text)
        .join(""),
    ).toBe("She lost the primary in May.");
  });

  it("leaves primary alone where it is an ordinary adjective", () => {
    for (const text of [
      "The primary reason was money.",
      "Her primary care doctor retired.",
      "A primary school teacher.",
      "Primary colors.",
    ]) {
      expect(
        annotateGuideTerms(text).some((s) => s.semanticKey === "primary"),
      ).toBe(false);
    }
  });

  it("returns the sentence unchanged when it holds no term", () => {
    expect(annotateGuideTerms("Nothing has been filed yet.")).toEqual([
      { text: "Nothing has been filed yet.", semanticKey: null },
    ]);
  });
});
