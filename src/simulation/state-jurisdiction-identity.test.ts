import { LEXINGTON_DEMO_CONTEXT } from "../../tests/fixtures/authored-scenario";
import { describe, expect, it } from "vitest";

import { createStableId } from "./ids";
import {
  ALASKA_CONTEXT,
  KENTUCKY_CONTEXT,
  NEBRASKA_CONTEXT,
} from "./legislation-scenarios";
import {
  STATES,
  lifePlaces,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
  stateKeyForJurisdictionSlug,
} from "./life-places";

import { makeIsoDate } from "./dates";
import { createWorld } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";

/**
 * One state, two mints. The ids differ and must keep differing, because saved
 * worlds carry them; what has to agree is the answer to "which state is this?"
 */

describe("a state is recognized whichever path minted it", () => {
  it("recognizes the constitutional consumer's legacy aliases without renumbering saved jurisdictions", () => {
    const canonical = stateJurisdictionForKey("US-CA")!;
    for (const slug of ["california", "us-ca"]) {
      const world = createWorld({
        seed: `a109-legacy-state-alias:${slug}`,
        currentDate: makeIsoDate("2026-01-05"),
        people: [],
        jurisdictions: [{ ...canonical, slug }],
      });
      const reopened = deserializeWorld(serializeWorld(world));
      expect(reopened.jurisdictions[canonical.id]!.id).toBe(canonical.id);
      expect(reopened.jurisdictions[canonical.id]!.slug).toBe(slug);
      expect(
        stateKeyForJurisdiction(reopened.jurisdictions[canonical.id]!),
      ).toBe("US-CA");
      expect(stateKeyForJurisdictionSlug(slug)).toBe("US-CA");
      expect(stateJurisdictionForKey("US-CA")!.id).toBe(canonical.id);
      expect(serializeWorld(reopened)).toBe(serializeWorld(world));
    }
  });
  it("reads the corpus form and the authored form as the same state", () => {
    const corpus = stateJurisdictionForKey("US-KY")!;
    const authored = KENTUCKY_CONTEXT.jurisdiction;

    expect(stateKeyForJurisdiction(corpus)).toBe("US-KY");
    expect(stateKeyForJurisdiction(authored)).toBe("US-KY");
  });

  it("mints one id per state, and does not renumber the authored ones", () => {
    // The authored scenario contexts are established places, so asking for
    // Kentucky by key returns the authored record rather than a second one.
    // The ids are not the problem; nothing here may change them, because
    // saved worlds carry them.
    expect(stateJurisdictionForKey("US-KY")!.id).toBe(
      createStableId(
        "jurisdiction",
        "definition:us-ky-commonwealth-placeholder",
      ),
    );
    expect(stateJurisdictionForKey("US-IL")!.id).toBe(
      createStableId("jurisdiction", "definition:state-us-il-placeholder"),
    );
  });

  it("is the same state under two slug shapes, which is the actual hazard", () => {
    // Three states carry an authored slug and forty-eight carry the corpus
    // one. Anything that reads a slug by pattern silently misses Kentucky,
    // Nebraska and Alaska — which is why reading it is this module's job and
    // not each caller's.
    expect(stateJurisdictionForKey("US-KY")!.slug).toBe(
      "us-ky-commonwealth-placeholder",
    );
    expect(stateJurisdictionForKey("US-IL")!.slug).toBe(
      "state-us-il-placeholder",
    );
    expect(stateKeyForJurisdiction(stateJurisdictionForKey("US-KY")!)).toBe(
      "US-KY",
    );
    expect(stateKeyForJurisdiction(stateJurisdictionForKey("US-IL")!)).toBe(
      "US-IL",
    );
  });

  it("covers every authored state scenario, not only Kentucky", () => {
    expect(stateKeyForJurisdiction(NEBRASKA_CONTEXT.jurisdiction)).toBe(
      "US-NE",
    );
    expect(stateKeyForJurisdiction(ALASKA_CONTEXT.jurisdiction)).toBe("US-AK");
  });

  it("answers for every state the corpus can mint", () => {
    for (const usps of ["AL", "CA", "NY", "WY", "HI"]) {
      const jurisdiction = stateJurisdictionForKey(`US-${usps}`)!;
      expect(stateKeyForJurisdiction(jurisdiction)).toBe(`US-${usps}`);
    }
  });
});

describe("what is not a state stays not a state", () => {
  it("a locality is not its own state", () => {
    expect(stateKeyForJurisdiction(LEXINGTON_DEMO_CONTEXT.jurisdiction)).toBe(
      null,
    );
  });

  it("an unrecognized slug is unknown, never the nearest guess", () => {
    expect(
      stateKeyForJurisdictionSlug("run-a-open-territory-placeholder"),
    ).toBe(null);
    expect(stateKeyForJurisdictionSlug("state-us-zz-placeholder")).toBe(null);
    expect(stateKeyForJurisdictionSlug("")).toBe(null);
    expect(stateKeyForJurisdictionSlug("us-ky")).toBe(null);
  });

  it("gives every state the same jurisdiction each time it is asked", () => {
    // Found once and kept: the law in force asks for every state's
    // jurisdiction each time it places a law.
    for (const usps of Object.keys(STATES)) {
      const key = `US-${usps}`;
      const first = stateJurisdictionForKey(key)!;
      const established = lifePlaces().find(
        (place) =>
          place.scope === "state" && place.stateJurisdictionKey === key,
      );
      expect(first.id).toBe(
        established?.context.jurisdiction.id ??
          createStableId(
            "jurisdiction",
            `definition:state-${key.toLowerCase()}-placeholder`,
          ),
      );
      expect(stateJurisdictionForKey(key)).toBe(first);
      expect(stateKeyForJurisdiction(first)).toBe(key);
    }
    expect(stateJurisdictionForKey("US-ZZ")).toBe(null);
    expect(stateJurisdictionForKey("US-ZZ")).toBe(null);
  });
});

it("keeps repeated recognized and unknown slug reads independent across all recorded states", () => {
  const unknowns = [
    "",
    "state-us-zz-placeholder",
    "state-us-ca-placeholder-extra",
    "locality-us-ca",
  ];
  for (const usps of Object.keys(STATES)) {
    const key = `US-${usps}`;
    const jurisdiction = stateJurisdictionForKey(key);
    if (!jurisdiction) continue;
    for (const unknown of unknowns) {
      expect(stateKeyForJurisdictionSlug(unknown)).toBeNull();
      expect(stateKeyForJurisdictionSlug(jurisdiction.slug)).toBe(key);
      expect(stateKeyForJurisdictionSlug(unknown)).toBeNull();
      expect(stateKeyForJurisdictionSlug(jurisdiction.slug)).toBe(key);
    }
  }
});
