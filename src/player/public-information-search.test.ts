import { describe, expect, it } from "vitest";

import type { PublicInformationPanelItem } from "../presentation/public-information-adapters";
import { filterPublishedNewsItems } from "./public-information-search";

function item(
  overrides: Partial<PublicInformationPanelItem> &
    Pick<PublicInformationPanelItem, "publicationId" | "headline" | "body">,
): PublicInformationPanelItem {
  return {
    sourceEventId: "event-1",
    sourceRecordIds: [],
    kind: "civic-event",
    outletKey: "civic-ledger",
    outletName: "Civic Ledger",
    jurisdictionId: "jurisdiction-1",
    jurisdictionName: "Franklin County",
    eventTime: "2026-01-01",
    publicationTime: "2026-01-02",
    people: [],
    corrections: [],
    civicReferences: [],
    ...overrides,
  };
}

const fixtures = [
  item({
    publicationId: "pub-alpha",
    headline: "Community meeting held downtown",
    body: "Residents discussed the budget.",
    jurisdictionName: "Franklin County",
    people: [{ kind: "person", personId: "person-1", label: "Alex Rivera" }],
  }),
  item({
    publicationId: "pub-beta",
    headline: "Vote tally published [special session]",
    body: "Recorded vote: 12 yea, 3 nay.",
    jurisdictionName: "Jefferson Parish",
    corrections: [
      {
        publicationId: "pub-beta-c1",
        publishedAt: "2026-01-03",
        headline: "Vote tally published [special session] — corrected",
        body: "Recorded vote: 12 yea, 3 nay. Clarified chamber.",
        note: "Typo in chamber name.",
      },
    ],
  }),
  item({
    publicationId: "pub-gamma",
    headline: "Press story on record",
    body: "A spokesperson spoke on the record.",
    jurisdictionName: null,
    people: [{ kind: "person", personId: "person-2", label: "Morgan Lee" }],
  }),
] as const;

describe("filterPublishedNewsItems", () => {
  it("returns every item in source order for empty or whitespace-only queries", () => {
    expect(filterPublishedNewsItems(fixtures, "")).toEqual(fixtures);
    expect(filterPublishedNewsItems(fixtures, "   ")).toEqual(fixtures);
    expect(filterPublishedNewsItems(fixtures, "\n\t")).toEqual(fixtures);
  });

  it("matches headline, body, jurisdiction, people, and correction text case-insensitively", () => {
    expect(
      filterPublishedNewsItems(fixtures, "community").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-alpha"]);
    expect(
      filterPublishedNewsItems(fixtures, "RECORDED VOTE").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-beta"]);
    expect(
      filterPublishedNewsItems(fixtures, "franklin").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-alpha"]);
    expect(
      filterPublishedNewsItems(fixtures, "alex rivera").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-alpha"]);
    expect(
      filterPublishedNewsItems(fixtures, "typo in chamber").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-beta"]);
    expect(
      filterPublishedNewsItems(fixtures, "clarified chamber").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-beta"]);
    expect(
      filterPublishedNewsItems(fixtures, "morgan").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-gamma"]);
  });

  it("treats punctuation literally and does not interpret regex characters", () => {
    expect(
      filterPublishedNewsItems(fixtures, "[special session]").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-beta"]);
    expect(
      filterPublishedNewsItems(fixtures, ".*").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual([]);
    expect(
      filterPublishedNewsItems(fixtures, "[").map(
        (entry) => entry.publicationId,
      ),
    ).toEqual(["pub-beta"]);
  });

  it("does not match hidden publication or source event ids alone", () => {
    expect(filterPublishedNewsItems(fixtures, "pub-alpha")).toEqual([]);
    expect(filterPublishedNewsItems(fixtures, "event-1")).toEqual([]);
    expect(filterPublishedNewsItems(fixtures, "person-1")).toEqual([]);
  });

  it("returns no items when nothing matches while preserving filter semantics", () => {
    expect(filterPublishedNewsItems(fixtures, "zzzz-no-match")).toEqual([]);
  });
});
