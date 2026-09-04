import { describe, expect, it } from "vitest";

import {
  buildEnvironmentIntakeReport,
  effectiveNativeDetailWidth,
  evaluateEnvironmentMasterIntake,
  type AssetLineageDeclaration,
  type EnvironmentMasterCandidate,
  type MeasuredCandidate,
} from "./asset-lineage";
import { toCanonicalJson } from "./canonical-json";

function measured(
  width: number,
  extra: Partial<MeasuredCandidate> = {},
): MeasuredCandidate {
  return {
    width,
    height: Math.round((width * 9) / 16),
    byteLength: width * 1_000,
    format: "png",
    contentHash: `${width}`.padStart(64, "0"),
    hasAlphaChannel: false,
    hasVaryingAlpha: false,
    ...extra,
  };
}

const NATIVE_LINEAGE: AssetLineageDeclaration = {
  lineageClass: "original-master",
  nativeDetail: { state: "native" },
  rightsStatus: "owned",
};

function candidate(
  lineage: AssetLineageDeclaration,
  extra: Partial<EnvironmentMasterCandidate> = {},
): EnvironmentMasterCandidate {
  return {
    assetId: "env_generic_hearing_room_01",
    path: "art/generated/env_generic_hearing_room_01.png",
    targetClass: "environment-plate",
    lineage,
    ...extra,
  };
}

function codes(record: { findings: readonly { code: string }[] }): string[] {
  return record.findings.map((finding) => finding.code);
}

describe("environment master intake", () => {
  it("accepts a native master that clears the recommended width", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(NATIVE_LINEAGE),
      measured(5_120),
    );
    expect(record.disposition).toBe("production");
    expect(record.nativeDetailWidth).toBe(5_120);
    expect(codes(record)).not.toContain("master-width-below-recommendation");
  });

  it("records dimensions, aspect, format and hash rather than inferring them", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(NATIVE_LINEAGE),
      measured(5_120, {
        format: "webp",
        hasAlphaChannel: true,
        hasVaryingAlpha: null,
      }),
    );
    expect(record.width).toBe(5_120);
    expect(record.height).toBe(2_880);
    expect(record.aspectRatio).toBeCloseTo(16 / 9, 3);
    expect(record.format).toBe("webp");
    expect(record.contentHash).toHaveLength(64);
    expect(codes(record)).toContain("alpha-unverified");
  });

  it("rejects a master below the absolute minimum width", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(NATIVE_LINEAGE),
      measured(3_000),
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("master-width-below-minimum");
  });

  it("warns, without rejecting, between the minimum and the recommendation", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(NATIVE_LINEAGE),
      measured(4_700),
    );
    expect(record.disposition).toBe("production");
    expect(codes(record)).toContain("master-width-below-recommendation");
  });
});

describe("external upscale lineage", () => {
  const upscaled: AssetLineageDeclaration = {
    lineageClass: "external-upscale-derivative",
    sourceAssetId: "env_generic_hearing_room_01_original",
    sourceWidth: 2_560,
    sourceHeight: 1_440,
    nativeDetail: {
      state: "declared-upscale",
      nativeDetailWidth: 2_560,
      derivationMethod: "external 2x upscale",
      derivationTool: "Adobe Firefly",
    },
    rightsStatus: "owned",
  };

  it("accepts an externally upscaled master when the lineage is declared", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(upscaled),
      measured(5_120),
    );
    expect(record.disposition).toBe("production");
    expect(record.nativeDetailWidth).toBe(2_560);
    expect(record.derivationMethod).toBe("external 2x upscale");
    expect(record.sourceAssetId).toBe("env_generic_hearing_room_01_original");
  });

  it("does not pretend the upscale carries native detail", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(upscaled),
      measured(5_120),
    );
    // The file is 5120px. Its detail is not.
    expect(record.width).toBe(5_120);
    expect(record.nativeDetailWidth).toBe(2_560);
    expect(codes(record)).toContain("native-detail-below-minimum");
  });

  it("refuses an upscale that will not say what it was enlarged from", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate({
        ...upscaled,
        nativeDetail: { state: "declared-upscale" },
      }),
      measured(5_120),
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("upscale-without-declared-detail");
  });

  it("refuses an upscale masquerading as an original master", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate({
        ...upscaled,
        nativeDetail: { state: "native" },
      }),
      measured(5_120),
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("upscale-without-declared-detail");
  });

  it("refuses a derivative that cannot name its parent", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate({ ...upscaled, sourceAssetId: undefined }),
      measured(5_120),
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("derivative-without-parent");
  });

  it("refuses a declared detail width larger than the file itself", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate({
        ...upscaled,
        nativeDetail: { state: "declared-upscale", nativeDetailWidth: 8_000 },
      }),
      measured(5_120),
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("declared-detail-exceeds-width");
  });

  it("refuses a native claim that also states a detail width", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate({
        lineageClass: "original-master",
        nativeDetail: { state: "native", nativeDetailWidth: 4_096 },
      }),
      measured(5_120),
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("native-claim-with-detail-width");
  });
});

describe("unverified and reference lineage", () => {
  it("keeps unverified detail unverified rather than assuming the pixel width", () => {
    const declaration: AssetLineageDeclaration["nativeDetail"] = {
      state: "unverified",
    };
    expect(effectiveNativeDetailWidth(declaration, 5_120)).toBeNull();

    const record = evaluateEnvironmentMasterIntake(
      candidate({ lineageClass: "original-master", nativeDetail: declaration }),
      measured(5_120),
    );
    expect(record.nativeDetailWidth).toBeNull();
    expect(codes(record)).toContain("native-detail-unverified");
    // Still usable — unverified is a warning, not a rejection.
    expect(record.disposition).toBe("production");
  });

  it("catalogues a reference asset without letting it ship", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(
        {
          lineageClass: "reference-only",
          nativeDetail: { state: "unverified" },
        },
        { targetClass: "reference" },
      ),
      measured(900),
    );
    expect(record.disposition).toBe("reference");
    expect(codes(record)).toContain("reference-only-cannot-ship");
    // A reference is not held to plate minimums.
    expect(codes(record)).not.toContain("master-width-below-minimum");
  });

  it("keeps unknown rights unknown", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate({
        lineageClass: "original-master",
        nativeDetail: { state: "native" },
      }),
      measured(5_120),
    );
    expect(record.rightsStatus).toBe("unknown");
    expect(codes(record)).toContain("rights-status-unknown");
  });

  it("rejects an unmeasurable file rather than guessing at it", () => {
    const record = evaluateEnvironmentMasterIntake(
      candidate(NATIVE_LINEAGE),
      null,
    );
    expect(record.disposition).toBe("reject");
    expect(codes(record)).toContain("unreadable-dimensions");
    expect(record.width).toBeNull();
  });
});

describe("intake report determinism", () => {
  it("produces byte-identical output for the same inputs", () => {
    const build = () =>
      buildEnvironmentIntakeReport([
        evaluateEnvironmentMasterIntake(
          candidate(NATIVE_LINEAGE, { assetId: "env_b" }),
          measured(5_120),
        ),
        evaluateEnvironmentMasterIntake(
          candidate(NATIVE_LINEAGE, { assetId: "env_a" }),
          measured(4_800),
        ),
      ]);
    expect(toCanonicalJson(build())).toBe(toCanonicalJson(build()));
  });

  it("orders records by asset id regardless of submission order", () => {
    const report = buildEnvironmentIntakeReport([
      evaluateEnvironmentMasterIntake(
        candidate(NATIVE_LINEAGE, { assetId: "env_z" }),
        measured(5_120),
      ),
      evaluateEnvironmentMasterIntake(
        candidate(NATIVE_LINEAGE, { assetId: "env_a" }),
        measured(5_120),
      ),
    ]);
    expect(report.records.map((record) => record.assetId)).toEqual([
      "env_a",
      "env_z",
    ]);
    expect(report.productionCount).toBe(2);
  });
});
