import { describe, expect, it } from "vitest";

import { createStableId } from "./ids";
import {
  ALASKA_CONTEXT,
  KENTUCKY_CONTEXT,
  NEBRASKA_CONTEXT,
} from "./legislation-scenarios";
import {
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
  stateKeyForJurisdictionSlug,
} from "./life-places";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";

/**
 * One state, two mints. The ids differ and must keep differing, because saved
 * worlds carry them; what has to agree is the answer to "which state is this?"
 */

describe("a state is recognized whichever path minted it", () => {
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
});
