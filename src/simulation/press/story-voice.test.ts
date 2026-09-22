import { describe, expect, it } from "vitest";

import type { EntityId, HistoricalEvent, World } from "../types";
import type { MediaOutletRecord } from "./records";
import {
  headlineFor,
  readHeadlineParts,
  registerFor,
  spelledCount,
} from "./story-voice";

/**
 * The headline a player reads is not the simulation's note to itself.
 *
 * These hold the two things that made the front page read wrong: a numeral and
 * a self-describing flag printed as copy, and three outlets running one
 * sentence word for word. They also hold the line that must not move — no
 * headline may contain a word the record does not.
 */

function outlet(over: Partial<MediaOutletRecord>): MediaOutletRecord {
  return {
    kind: "media-outlet",
    name: "The Evening Compass",
    product: "general-newspaper",
    scope: "local",
    mediums: ["text"],
    resourceTier: "standard",
    ...over,
  } as MediaOutletRecord;
}

function event(over: Partial<HistoricalEvent>): HistoricalEvent {
  return {
    summary: "2 organizers publicly decided to form The Commons Party.",
    visibility: "public",
    jurisdictionId: "jur-ky",
    participants: [],
    involvedEntityIds: ["p1", "p2"],
    ...over,
  } as HistoricalEvent;
}

const world = {
  people: {
    p1: { givenName: "Dana", familyName: "Reyes" },
    p2: { givenName: "Amara", familyName: "Silva" },
    p3: { givenName: "Jonah", familyName: "Bell" },
  },
  jurisdictions: { "jur-ky": { name: "Kentucky" } },
} as unknown as World;

describe("a headline is written for a reader", () => {
  it("spells a count the way a newspaper does", () => {
    expect(spelledCount(2, true)).toBe("Two");
    expect(spelledCount(12, false)).toBe("twelve");
    // Above twelve a newspaper uses numerals, and so does this.
    expect(spelledCount(13, true)).toBe("13");
  });

  it("reads a counted subject off the record without touching the verb", () => {
    const parts = readHeadlineParts("2 organizers decided to form A Party.");
    expect(parts.count).toBe(2);
    expect(parts.subject).toBe("2 organizers");
    expect(parts.predicate).toBe("decided to form A Party.");
  });

  it("leaves a sentence it has no shape for alone", () => {
    const parts = readHeadlineParts(
      "Several governments opened talks over fishing rights.",
    );
    expect(parts.count).toBeNull();
    expect(parts.predicate).toBe(
      "Several governments opened talks over fishing rights.",
    );
  });

  it("stops printing the numeral and the visibility flag", () => {
    const line = headlineFor(world, event({}), outlet({}));
    expect(line).not.toContain("2 organizers");
    expect(line).not.toContain("publicly");
    // The verb is still the record's own.
    expect(line).toContain("decided to form The Commons Party");
  });

  it("names two people the record names, rather than counting them", () => {
    expect(headlineFor(world, event({}), outlet({}))).toBe(
      "Dana Reyes and Amara Silva decided to form The Commons Party.",
    );
  });

  it("keeps the count when the record does not hold exactly that many", () => {
    // Three founders, and naming two of them would be a claim about which two
    // mattered. The count is the honest subject.
    const three = event({
      summary: "3 organizers publicly decided to form The Commons Party.",
      involvedEntityIds: ["p1", "p2", "p3"] as unknown as EntityId[],
    });
    expect(headlineFor(world, three, outlet({}))).toBe(
      "Three organizers decided to form The Commons Party.",
    );
  });

  it("gives three outlets on one story three different sentences", () => {
    const compass = outlet({ name: "The Evening Compass", scope: "local" });
    const longwire = outlet({
      name: "Longwire Public Affairs",
      product: "public-affairs-broadcaster",
      mediums: ["broadcast"],
      scope: "national",
    });
    const ledger = outlet({
      name: "Civic Ledger",
      scope: "national",
      resourceTier: "major",
    });
    const lines = [compass, longwire, ledger].map((each) =>
      headlineFor(world, event({}), each),
    );
    expect(new Set(lines).size).toBe(3);
    // And each difference is a recorded fact selected, never one invented.
    expect(lines[0]).toBe(
      "Dana Reyes and Amara Silva decided to form The Commons Party.",
    );
    expect(lines[1]).toBe(
      "Two organizers decided to form The Commons Party in Kentucky.",
    );
    expect(lines[2]).toBe(
      "Dana Reyes and Amara Silva decided to form The Commons Party in Kentucky.",
    );
  });

  it("does not name a place an outlet's readers already stand in", () => {
    expect(registerFor(outlet({ scope: "local" }))).toEqual({
      namesPeople: true,
      namesPlace: false,
    });
    expect(
      headlineFor(world, event({}), outlet({ scope: "local" })),
    ).not.toContain("Kentucky");
  });

  it("keeps a self-describing word the record did not use for visibility", () => {
    // "publicly" is dropped because it restates the event's visibility. On a
    // record that is not public it stays, because then it is saying something.
    const confidential = event({
      summary: "2 organizers publicly decided to form The Commons Party.",
      visibility: "private",
    });
    expect(headlineFor(world, confidential, outlet({}))).toContain("publicly");
  });
});
