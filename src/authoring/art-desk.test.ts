import { describe, expect, it } from "vitest";

import {
  GENERIC_DOORSTEP_TAGS,
  GENERIC_HUMID_PARK_TAGS,
  validateCompatibilityTags,
  winterVariantOf,
} from "./asset-compatibility";
import {
  claimAssetRequest,
  emptyClaimDocument,
  recoverExpiredClaims,
} from "./asset-claim";
import { compileAssetBrief, privatePackInputState } from "./asset-brief";
import {
  ART_DESK_CONTRACT_ID,
  emptyReviewDocument,
  recordReview,
} from "./asset-review";
import { filterDeskItems, projectArtDesk } from "./art-desk";
import type { AssetRequest } from "./asset-request";
import reconciliation from "../../art/requests/art-desk-reconciliation.json";
import assetRequestDocument from "../../art/requests/asset-requests.json";

const now = "2026-09-15T20:00:00.000Z";
const later = "2026-09-16T20:00:00.000Z";

function request(
  partial: Partial<AssetRequest> & Pick<AssetRequest, "requestId">,
): AssetRequest {
  return {
    requestVersion: 1,
    priority: "P1",
    status: "queued",
    title: "A test plate",
    consumer: {
      consumerId: "test-consumer",
      runtimeComponent: "none",
      playerVisibleUse: "A test use.",
    },
    whyNeeded: "Tests.",
    inventoryCheck: {
      repositoryPathsSearched: ["art/families/"],
      driveLocationsSearched: ["Drive"],
      found: "Nothing.",
      shortfall: "Missing.",
    },
    target: {
      targetClass: "environment-plate",
      minimumWidth: 4608,
      aspectRatio: "16:9",
      alphaRequired: false,
      container: "either",
      styleAuthority: "style",
    },
    generationRecipe: ["Empty of people."],
    acceptanceCriteria: ["Measured width."],
    dependsOn: [],
    ...partial,
  };
}

describe("regional and seasonal compatibility", () => {
  it("accepts generic humid park tags and refuses exact-site-as-generic", () => {
    expect(validateCompatibilityTags(GENERIC_HUMID_PARK_TAGS).valid).toBe(true);
    const landmark = {
      ...GENERIC_HUMID_PARK_TAGS,
      placeIdentity: {
        kind: "exact-literal-site" as const,
        exactSiteName: "A named courthouse lawn",
      },
      environmentClass: "park-exterior" as const,
      exclusions: [],
    };
    const findings = validateCompatibilityTags(landmark);
    expect(findings.valid).toBe(false);
    expect(findings.findings.map((item) => item.code)).toContain(
      "exact-site-used-as-generic",
    );
  });

  it("keeps winter from implying snow and requires a parent on a seasonal variant", () => {
    const winter = winterVariantOf(
      GENERIC_HUMID_PARK_TAGS,
      "env_park_community_pavilion_candidate_5504x3072_v1",
      true,
    );
    expect(winter.snowCoverPossible).toBe(false);
    expect(validateCompatibilityTags(winter).valid).toBe(true);
    const snowForced = {
      ...winter,
      snowCoverPossible: true,
      exclusions: winter.exclusions.filter(
        (item) => item !== "winter-is-not-universal-snow",
      ),
    };
    expect(
      validateCompatibilityTags(snowForced).findings.map((item) => item.code),
    ).toContain("winter-implies-snow");
    const orphan = { ...winter, geometryVariant: undefined };
    expect(validateCompatibilityTags(orphan).valid).toBe(false);
  });

  it("refuses changed geometry that still reuses parent anchors", () => {
    const broken = winterVariantOf(
      GENERIC_HUMID_PARK_TAGS,
      "env_park_community_pavilion_candidate_5504x3072_v1",
      false,
    );
    expect(broken.geometryVariant?.invalidatesParentAnchors).toBe(true);
    const copied = {
      ...broken,
      geometryVariant: {
        parentAssetId: "parent",
        geometryUnchanged: false,
        invalidatesParentAnchors: false,
      },
    };
    expect(validateCompatibilityTags(copied).valid).toBe(false);
  });
});

describe("claims and exact-byte reviews", () => {
  it("prevents a second active claim and does not let expiry overwrite unpublished bytes", () => {
    const first = claimAssetRequest(emptyClaimDocument(), {
      requestId: "env-neighborhood-doorstep-generic",
      requestVersion: 1,
      claimant: "worker-a",
      now,
      ttlMs: 60_000,
      claimId: "claim-a",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const withBytes = {
      ...first.document,
      claims: first.document.claims.map((claim) =>
        claim.claimId === "claim-a"
          ? {
              ...claim,
              unpublishedAssetPath: "art/generated/candidates/art-desk/x.png",
            }
          : claim,
      ),
    };
    const expired = recoverExpiredClaims(withBytes, later);
    const second = claimAssetRequest(expired, {
      requestId: "env-neighborhood-doorstep-generic",
      requestVersion: 1,
      claimant: "worker-b",
      now: later,
      ttlMs: 60_000,
      claimId: "claim-b",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("expiry-overwrite-attempt");
    const duplicate = claimAssetRequest(first.document, {
      requestId: "env-neighborhood-doorstep-generic",
      requestVersion: 1,
      claimant: "worker-b",
      now,
      ttlMs: 60_000,
      claimId: "claim-b",
    });
    expect(duplicate.ok).toBe(false);
  });

  it("binds approval to exact bytes and drops it when the file changes", () => {
    const bytes = "a".repeat(64);
    const other = "b".repeat(64);
    const approved = recordReview(emptyReviewDocument(), {
      requestId: "env-neighborhood-doorstep-generic",
      requestVersion: 1,
      expectedRequestVersion: 1,
      outputSha256: bytes,
      currentOutputSha256: bytes,
      contractVersion: ART_DESK_CONTRACT_ID,
      fitContractHash: bytes,
      sceneContractHash: bytes,
      decision: "approve",
      authorId: "lamontae",
      decidedAt: now,
      rightsStatus: "unknown",
      sourceDeclaration: "test",
      reviewId: "review-1",
    });
    expect(approved.ok).toBe(true);
    const changed = recordReview(emptyReviewDocument(), {
      requestId: "env-neighborhood-doorstep-generic",
      requestVersion: 1,
      expectedRequestVersion: 1,
      outputSha256: bytes,
      currentOutputSha256: other,
      contractVersion: ART_DESK_CONTRACT_ID,
      fitContractHash: bytes,
      sceneContractHash: bytes,
      decision: "approve",
      authorId: "lamontae",
      decidedAt: now,
      rightsStatus: "unknown",
      sourceDeclaration: "test",
      reviewId: "review-2",
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.code).toBe("bytes-changed-lose-approval");
    const stale = recordReview(emptyReviewDocument(), {
      requestId: "env-neighborhood-doorstep-generic",
      requestVersion: 1,
      expectedRequestVersion: 2,
      outputSha256: bytes,
      currentOutputSha256: bytes,
      contractVersion: ART_DESK_CONTRACT_ID,
      fitContractHash: bytes,
      sceneContractHash: bytes,
      decision: "approve",
      authorId: "lamontae",
      decidedAt: now,
      rightsStatus: "unknown",
      sourceDeclaration: "test",
      reviewId: "review-3",
    });
    expect(stale.ok).toBe(false);
  });
});

describe("Art Desk projection and briefs", () => {
  it("does not re-commission covered park, press, meeting, storefront or D-held people", () => {
    const desk = projectArtDesk({
      requests: assetRequestDocument.requests as AssetRequest[],
      claims: emptyClaimDocument(),
      reviews: emptyReviewDocument(),
      now,
      reconciliation,
    });
    const byId = new Map(
      desk.items.map((item) => [item.request.requestId, item]),
    );
    expect(
      byId.get("person-production-standing-body")?.generationEligible,
    ).toBe(false);
    expect(byId.get("env-campaign-storefront")?.generationEligible).toBe(false);
    expect(byId.get("env-campaign-storefront")?.lane).toBe("covered-history");
    expect(desk.privatePack.status).toBe("input-missing");
    const eligible = desk.items.filter((item) => item.generationEligible);
    expect(eligible.map((item) => item.request.requestId).sort()).toEqual([
      "env-neighborhood-doorstep-generic",
      "env-park-community-pavilion-winter-variant",
    ]);
  });

  it("defaults the needs-your-review lane to genuine missing work", () => {
    const desk = projectArtDesk({
      requests: assetRequestDocument.requests as AssetRequest[],
      claims: emptyClaimDocument(),
      reviews: emptyReviewDocument(),
      now,
      reconciliation,
    });
    const needs = filterDeskItems(desk.items, "needs-your-review", "");
    expect(
      needs.some(
        (item) =>
          item.request.requestId === "env-neighborhood-doorstep-generic",
      ),
    ).toBe(true);
    expect(
      needs.some((item) => item.request.requestId.startsWith("person-")),
    ).toBe(false);
  });

  it("compiles a brief that leaves unresolved geometry unresolved", () => {
    const brief = compileAssetBrief({
      request: request({
        requestId: "env-neighborhood-doorstep-generic",
        compatibility: GENERIC_DOORSTEP_TAGS,
        scope: { familyId: "neighborhood-doorstep-generic" },
      }),
      stylePixels: [privatePackInputState(null)],
    });
    expect(brief.camera.certainty).toBe("UNKNOWN");
    expect(brief.derivativeNote).toMatch(/fitted derivative/i);
    expect(brief.stylePixels[0]?.missingReason).toMatch(/access\/input/);
  });
});
