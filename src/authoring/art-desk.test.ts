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
import {
  compileAssetBrief,
  privatePackInputState,
  styleReferencesFor,
} from "./asset-brief";
import {
  ART_DESK_CONTRACT_ID,
  emptyReviewDocument,
  recordReview,
} from "./asset-review";
import { decisionBlocker, filterDeskItems, projectArtDesk } from "./art-desk";
import type { AssetRequest } from "./asset-request";
import reconciliation from "../../art/requests/art-desk-reconciliation.json";
import generationBatch from "../../art/requests/art-desk-generation-batch.json";
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
    expect(desk.privatePack.status).toBe("unknown");
    const eligible = desk.items.filter((item) => item.generationEligible);
    expect(eligible.map((item) => item.request.requestId).sort()).toEqual([
      "env-neighborhood-doorstep-generic",
      "env-park-community-pavilion-winter-variant",
    ]);
  });

  it("puts hashed generation candidates in Needs your review without calling them production", () => {
    const desk = projectArtDesk({
      requests: assetRequestDocument.requests as AssetRequest[],
      claims: emptyClaimDocument(),
      reviews: emptyReviewDocument(),
      now,
      reconciliation,
      candidateByRequest: {
        "env-neighborhood-doorstep-generic": {
          sha256:
            "b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266",
          path: "art/generated/candidates/art-desk/env-neighborhood-doorstep-generic/b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266.jpg",
        },
      },
    });
    const item = desk.items.find(
      (entry) =>
        entry.request.requestId === "env-neighborhood-doorstep-generic",
    );
    expect(item?.lane).toBe("needs-your-review");
    expect(item?.generationEligible).toBe(false);
    expect(item?.coverage.disposition).toBe("candidate");
    expect(item?.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(item?.candidateThumbPath).toBe(
      "art/generated/candidates/art-desk/env-neighborhood-doorstep-generic/b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266.jpg",
    );
  });

  it("records the bounded generation proof below the environment master floor", () => {
    expect(generationBatch.allowance.paidOverage).toBe(false);
    expect(generationBatch.allowance.requestsAttempted).toHaveLength(2);
    for (const record of generationBatch.records) {
      expect(record.meetsEnvironmentMasterFloor).toBe(false);
      expect(record.width).toBeLessThan(4608);
      expect(record.outputSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(record.rightsStatus).toBe("unknown");
    }
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

describe("candidate byte states, pack receipts and disposable QA requests", () => {
  const doorstep = assetRequestDocument.requests.find(
    (item) => item.requestId === "env-neighborhood-doorstep-generic",
  ) as AssetRequest;
  const baseInputs = {
    requests: [doorstep],
    claims: emptyClaimDocument(),
    reviews: emptyReviewDocument(),
    now,
  };
  const recorded = generationBatch.records[0];

  it("keeps a recorded hash as history when bytes are missing and blocks decisions", () => {
    const desk = projectArtDesk({
      ...baseInputs,
      candidateByRequest: {
        [doorstep.requestId]: {
          sha256: recorded.outputSha256,
          path: recorded.privatePath,
          bytes: "missing",
          source: "generation-batch",
        },
      },
    });
    const item = desk.items[0];
    expect(item.candidateSha256).toBe(recorded.outputSha256);
    expect(item.candidateVerified).toBe(false);
    expect(item.coverage.note).toContain("not in this checkout");
    expect(decisionBlocker(item)).toContain("missing");
    expect(desk.privatePack.status).toBe("unknown");
  });

  it("treats unchecked bytes as not yet approvable", () => {
    const desk = projectArtDesk({
      ...baseInputs,
      candidateByRequest: {
        [doorstep.requestId]: {
          sha256: recorded.outputSha256,
          path: recorded.privatePath,
        },
      },
    });
    expect(desk.items[0].candidateBytes).toBe("unchecked");
    expect(decisionBlocker(desk.items[0])).toContain("not verified yet");
  });

  it("reports verified bytes with decoded size, and a mismatch as a warning", () => {
    const verified = projectArtDesk({
      ...baseInputs,
      privatePack: { status: "verified", note: "ok", packId: "p" },
      candidateByRequest: {
        [doorstep.requestId]: {
          sha256: recorded.outputSha256,
          path: recorded.privatePath,
          bytes: "verified",
          source: "upload-sidecar",
          raster: { container: "jpg", width: 1280, height: 720 },
        },
      },
    });
    expect(verified.items[0].candidateVerified).toBe(true);
    expect(verified.items[0].coverage.note).toContain("1280×720 jpg");
    expect(decisionBlocker(verified.items[0])).toBeNull();
    const mismatch = projectArtDesk({
      ...baseInputs,
      candidateByRequest: {
        [doorstep.requestId]: {
          sha256: recorded.outputSha256,
          path: recorded.privatePath,
          bytes: "hash-mismatch",
        },
      },
    });
    expect(mismatch.items[0].warnings.join(" ")).toContain(
      "not the recorded candidate",
    );
    expect(decisionBlocker(mismatch.items[0])).toContain("hash-mismatch");
  });

  it("marks sidecar QA requests disposable and never generation-eligible", () => {
    const qa = request({
      requestId: "qa-art-desk-round-trip",
      title: "QA round trip",
    });
    const desk = projectArtDesk({
      ...baseInputs,
      requests: [qa],
      disposableRequestIds: new Set([qa.requestId]),
    });
    expect(desk.items[0].disposable).toBe(true);
    expect(desk.items[0].generationEligible).toBe(false);
    expect(desk.items[0].warnings.join(" ")).toContain("Disposable QA");
  });

  it("gives environment requests their own style authority and people requests the pack state", () => {
    const missing = { status: "not-configured", note: "unset" };
    const env = styleReferencesFor(doorstep, missing);
    expect(env).toHaveLength(1);
    expect(env[0].role).toBe("style-authority");
    expect(env[0].pathOrDriveId).toContain("OCD_SCENE_MASTER");
    const person = request({ requestId: "person-qa" });
    const withoutPack = styleReferencesFor(person, missing);
    expect(withoutPack[1]).toMatchObject({
      role: "template",
      missingReason: "unset",
    });
    const withPack = styleReferencesFor(person, {
      status: "verified",
      note: "ok",
      packId: "modular41-current-0a044d183ad7",
      manifestSha256: "a".repeat(64),
    });
    expect(withPack[1]).toMatchObject({
      role: "template",
      pathOrDriveId: "modular41-current-0a044d183ad7",
      sha256: "a".repeat(64),
    });
    expect(withPack[1].missingReason).toBeUndefined();
  });
});
