import { describe, expect, it } from "vitest";

import { producerBrief } from "./artbench";
import {
  buildRequestDraft,
  initialDraftFields,
  NEW_REQUEST_DEFAULTS,
} from "./artbench-request-draft";
import { requestReferencePixels } from "./asset-brief";
import type { AssetRequest } from "./asset-request";

/** The selected park request whose hidden fields leaked in the incident. */
const park: AssetRequest = {
  requestId: "env-park-community-pavilion-winter",
  requestVersion: 2,
  priority: "P2",
  status: "queued",
  title: "Park pavilion, winter leafless",
  consumer: {
    consumerId: "scene-park-pavilion",
    runtimeComponent: "src/player/SceneBackdrop.tsx",
    playerVisibleUse: "Park visit in winter.",
  },
  whyNeeded: "Seasonal variant.",
  inventoryCheck: {
    repositoryPathsSearched: [],
    driveLocationsSearched: [],
    found: "",
    shortfall: "",
  },
  target: {
    targetClass: "environment-plate",
    minimumWidth: 4608,
    aspectRatio: "16:9",
    alphaRequired: false,
    container: "png",
    styleAuthority:
      "art/families/park-community-pavilion/env_park_community_pavilion_v1.png parent plate",
  },
  generationRecipe: ["Leafless trees around the pavilion."],
  acceptanceCriteria: [
    "Recognizable as the parent pavilion.",
    "Copied anchors if unchanged.",
  ],
  dependsOn: [],
  scope: { familyId: "park-community-pavilion", variantId: "winter-leafless" },
};
const parkParent = {
  request: park,
  candidateId: "cand-park-winter",
  candidateSha256: "b".repeat(64),
};

const whiteHouseFields = {
  ...initialDraftFields("new", parkParent),
  requestId: "env-white-house-intro-exterior",
  title: "White house",
  use: "Intro establishing plate.",
  recipe: ["the white house in the game's style for the intro"],
};

describe("new versus related requests", () => {
  it("starts a new request from project defaults, not the selected row", () => {
    const fields = initialDraftFields("new", parkParent);
    expect(fields).toMatchObject({
      consumerId: "",
      targetClass: NEW_REQUEST_DEFAULTS.targetClass,
      recipe: [],
      styleReferences: [],
    });
  });

  it("builds an independent White House request with no park metadata", () => {
    const draft = buildRequestDraft("new", whiteHouseFields, parkParent, {
      linkParentCandidate: true,
    });
    const text = JSON.stringify(draft);
    expect(text).not.toMatch(/park|pavilion|Copied anchors/i);
    expect(draft.parentRequestId).toBeUndefined();
    expect(draft.parentCandidateId).toBeUndefined();
    expect(draft.request.scope).toBeUndefined();
    expect(draft.request.compatibility).toBeUndefined();
    expect(draft.request.acceptanceCriteria).toEqual([]);
    expect(draft.request.consumer).toEqual({
      consumerId: "unassigned",
      runtimeComponent: "none",
      playerVisibleUse: "Intro establishing plate.",
    });
    expect(draft.request.target.styleAuthority).toBe(
      NEW_REQUEST_DEFAULTS.styleAuthority,
    );
    expect(draft.request.generationRecipe).toEqual([
      "the white house in the game's style for the intro",
    ]);
  });

  it("copies the parent only for an explicit related variant, and records the link", () => {
    const fields = {
      ...initialDraftFields("related", parkParent),
      requestId: "env-park-community-pavilion-snow",
      title: "Park pavilion, snow",
      use: "Park visit after snowfall.",
    };
    expect(fields.consumerId).toBe("scene-park-pavilion");
    expect(fields.styleReferences).toEqual([
      expect.objectContaining({
        role: "parent-template",
        ref: "candidate:cand-park-winter",
        sha256: "b".repeat(64),
      }),
    ]);
    const draft = buildRequestDraft("related", fields, parkParent, {
      linkParentCandidate: true,
    });
    expect(draft.parentRequestId).toBe(park.requestId);
    expect(draft.parentCandidateId).toBe("cand-park-winter");
    expect(draft.request.acceptanceCriteria).toEqual(park.acceptanceCriteria);
    expect(draft.request.scope).toEqual({
      familyId: "park-community-pavilion",
      variantId: "env-park-community-pavilion-snow",
    });
    expect(draft.request.whyNeeded).toContain(park.requestId);
    const unlinked = buildRequestDraft("related", fields, parkParent, {
      linkParentCandidate: false,
    });
    expect(unlinked.parentCandidateId).toBeUndefined();
  });

  it("does not let related-mode values leak into a later new draft", () => {
    const related = initialDraftFields("related", parkParent);
    const fresh = initialDraftFields("new", parkParent);
    expect(related.recipe.length).toBeGreaterThan(0);
    expect(fresh.recipe).toEqual([]);
    expect(fresh.styleReferences).toEqual([]);
  });
});

describe("explicit style references", () => {
  it("treats style-authority text as an unresolved declaration", () => {
    const refs = requestReferencePixels(park);
    expect(refs).toEqual([
      expect.objectContaining({
        role: "style-authority",
        resolution: "unresolved",
        pathOrDriveId: park.target.styleAuthority,
      }),
    ]);
    expect(refs[0]?.missingReason).toMatch(/declaration, not supplied pixels/);
  });

  it("keeps drawing style separate from subject reference and records the real image", () => {
    const draft = buildRequestDraft(
      "new",
      {
        ...whiteHouseFields,
        styleReferences: [
          {
            role: "drawing-style",
            ref: "drive:1gbHZI1mk9HF1R67f6obL3lajgVluEtYa",
            sha256:
              "35a37c8a6526a86eb569be61383558c1b90369abb9c185d21a7d5765d52edfc0",
            width: 1376,
            height: 768,
          },
          { role: "subject-content", ref: "repo:docs/white-house-exterior.md" },
          { role: "drawing-style", ref: "   " },
        ],
      },
      null,
    );
    const refs = requestReferencePixels(draft.request);
    expect(refs).toHaveLength(2);
    expect(refs[0]).toMatchObject({
      role: "style-authority",
      pathOrDriveId: "drive:1gbHZI1mk9HF1R67f6obL3lajgVluEtYa",
      resolution: "declared",
      nativeWidth: 1376,
    });
    expect(refs[1]).toMatchObject({
      role: "subject-content",
      resolution: "unresolved",
    });
  });

  it("carries declared references into the copied brief and asks for an input receipt", () => {
    const withRefs = buildRequestDraft(
      "new",
      {
        ...whiteHouseFields,
        styleReferences: [
          {
            role: "drawing-style",
            ref: "drive:1gbHZI1mk9HF1R67f6obL3lajgVluEtYa",
            sha256:
              "35a37c8a6526a86eb569be61383558c1b90369abb9c185d21a7d5765d52edfc0",
          },
          { role: "subject-content", ref: "drive:white-house-architecture" },
        ],
      },
      null,
    ).request;
    const brief = producerBrief(withRefs, { inboxHint: "inbox" });
    expect(brief).toContain(
      "DRAWING STYLE (how to render): drive:1gbHZI1mk9HF1R67f6obL3lajgVluEtYa sha256 35a37c8a",
    );
    expect(brief).toContain(
      "SUBJECT / ARCHITECTURE (what it looks like; not style): drive:white-house-architecture (no hash recorded — unresolved)",
    );
    expect(brief).toContain("DECLARED references");
    expect(brief).toContain('"referenceInputs"');
    const bare = producerBrief(park, { inboxHint: "inbox" });
    expect(bare).toContain("style reference: UNRESOLVED");
    expect(bare).toContain("style authority (declared text)");
  });
});
