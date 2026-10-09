import { describe, expect, it } from "vitest";
import { parameter } from "../parameters";

import {
  auditCheckRangeCoverage,
  evaluateP9Target,
  type P9Evaluation,
  type P9ReplayPair,
  type P9RunReceipt,
} from "./calibration-guard";

const targetId = "P9-FIXTURE-OUTCOME";
const targetStep = {
  lifeId: "fixture-life",
  stepId: "fixture-result",
  kind: "outcome",
  dateWindow: {
    earliest: "2021-01-01",
    latest: "2021-01-01",
    precision: "day",
    sourceRefs: ["fixture-source"],
  },
  sourceRefs: ["fixture-source"],
  sources: [
    {
      id: "fixture-source",
      title: "Fixture source",
      publisher: "Fixture publisher",
      url: "https://example.invalid/fixture",
    },
  ],
  checks: [
    { metric: "fixture.status", operator: "equals", expectedValue: "recorded" },
  ],
  ranges: [],
  requires: [],
};

function target(overrides: Record<string, unknown> = {}) {
  return {
    id: targetId,
    revision: "abcdef12",
    sourceFiles: { "data/life-replay/lives/fixture.json": "a".repeat(40) },
    observations: [targetStep],
    testRoute: {
      commandTemplate: "fixture-only-free-runner",
      evaluationContract: "Fixture-only contract; never P9 evidence.",
      implementationStatus: "ready",
    },
    calibrationStatus: "fixture-only; no empirical claim",
    ...overrides,
  };
}

function catalog(targetRow = target()) {
  return {
    sourceRevision: "abcdef12",
    p9SourceFiles: { "data/life-replay/lives/fixture.json": "a".repeat(40) },
    p8ParameterPreimage: {
      path: "src/core2/data/parameters.json",
      sha256: "b".repeat(64),
    },
    targets: [targetRow],
    parameterBindings: [
      {
        parameter: "fixtureTunable",
        checkRange: { ref: targetId },
        mappingStatus: "fixture-only contract binding",
      },
    ],
  };
}

function parameters(checkRange: unknown = { ref: targetId }) {
  return {
    fixtureTunable: {
      value: 0,
      tag: "TUNABLE",
      citation: "Fixture metadata, not an empirical source.",
      spread: {
        status: "unmeasured",
        reason: "No bound in this test fixture.",
      },
      ...(checkRange === undefined ? {} : { checkRange }),
    },
  };
}

describe("generic calibration target references", () => {
  it("accepts a source-backed generic reference but keeps the empirical status false", () => {
    const audit = auditCheckRangeCoverage(parameters(), catalog());
    expect(audit.diagnostics).toEqual([]);
    expect(audit.structuralValid).toBe(true);
    expect(audit.targetReferenceCount).toBe(1);
    expect(audit.empiricalCalibrationPass).toBe(false);
  });

  it("rejects extra target facts, malformed refs, stale refs, and missing routes", () => {
    const extra = auditCheckRangeCoverage(
      parameters({ ref: targetId, expectedValue: "future fact" }),
      catalog(),
    );
    expect(extra.diagnostics.map((row) => row.code)).toContain(
      "checkrange-shape",
    );

    const malformed = auditCheckRangeCoverage(
      parameters({ ref: "P9-person-name-school-2007" }),
      catalog(),
    );
    expect(malformed.diagnostics.map((row) => row.code)).toContain(
      "checkrange-id",
    );

    const missing = auditCheckRangeCoverage(
      parameters({ ref: "P9-NOT-REGISTERED" }),
      catalog(),
    );
    expect(missing.diagnostics.map((row) => row.code)).toContain(
      "checkrange-target-missing",
    );

    const noRoute = auditCheckRangeCoverage(
      parameters(),
      catalog(
        target({
          testRoute: {
            commandTemplate: null,
            evaluationContract: "planned only",
          },
        }),
      ),
    );
    expect(noRoute.blockers.map((row) => row.code)).toContain(
      "calibration-target-route-missing",
    );

    const extraLedgerFact = auditCheckRangeCoverage(parameters(), {
      ...catalog(),
      parameterBindings: [
        {
          parameter: "fixtureTunable",
          checkRange: { ref: targetId, expectedValue: "future fact" },
          mappingStatus: "fixture-only contract binding",
        },
      ],
    });
    expect(extraLedgerFact.diagnostics.map((row) => row.code)).toContain(
      "checkrange-binding-mismatch",
    );

    const changedSource = auditCheckRangeCoverage(
      parameters(),
      catalog(
        target({
          sourceFiles: {
            "data/life-replay/lives/fixture.json": "c".repeat(40),
          },
        }),
      ),
    );
    expect(changedSource.diagnostics.map((row) => row.code)).toContain(
      "calibration-target-evidence",
    );

    const staleP8 = auditCheckRangeCoverage(
      parameters(),
      catalog(),
      "c".repeat(64),
    );
    expect(staleP8.diagnostics.map((row) => row.code)).toContain(
      "calibration-p8-parameter-preimage-stale",
    );
  });

  it("does not treat an unreferenced active TUNABLE as a pass", () => {
    const unreferenced = {
      fixtureTunable: {
        value: 0,
        tag: "TUNABLE",
        citation: "Fixture metadata, not an empirical source.",
        spread: {
          status: "unmeasured",
          reason: "No bound in this test fixture.",
        },
      },
    };
    const audit = auditCheckRangeCoverage(unreferenced, {
      ...catalog(),
      parameterBindings: [],
    });
    expect(audit.diagnostics.map((row) => row.code)).toContain(
      "checkrange-shape",
    );
    expect(audit.empiricalCalibrationPass).toBe(false);
  });
});

describe("free replay receipt evaluator", () => {
  it("accepts a complete full free engine receipt with matching canonical IDs", () => {
    expect(evaluateP9Target(target(), [replayPair()]).status).toBe("pass");
  });

  it("does not pass a target without any sourced result steps", () => {
    const result = evaluateP9Target(
      target({ observations: [{ ...targetStep, kind: "event" }] }),
      [replayPair()],
    );
    expect(result.status).toBe("blocked");
  });

  it("rejects missing preimages, forced choices, initialized facts, and empty record IDs", () => {
    expect(
      evaluateP9Target(target(), [
        replayPair({ sourcePreimagesVerified: false }),
      ]).status,
    ).toBe("fail");
    expect(
      evaluateP9Target(target(), [replayPair({ forced: true })]).status,
    ).toBe("fail");
    expect(
      evaluateP9Target(target(), [replayPair({ initialized: true })]).status,
    ).toBe("fail");
    expect(
      evaluateP9Target(target(), [replayPair({ emptyIds: true })]).status,
    ).toBe("fail");
    expect(
      evaluateP9Target(target(), [
        replayPair({ representation: "records-only" }),
      ]).status,
    ).toBe("fail");
  });
});

function replayPair(
  options: {
    readonly sourcePreimagesVerified?: boolean;
    readonly forced?: boolean;
    readonly initialized?: boolean;
    readonly emptyIds?: boolean;
    readonly representation?: "full" | "records-only" | "missing";
  } = {},
): P9ReplayPair {
  const recordIds = options.emptyIds ? [] : ["record:fixture-result"];
  const representation = options.representation ?? "full";
  const run: P9RunReceipt = {
    lifeId: "fixture-life",
    mode: "free",
    complete: true,
    initialization: { observations: [] },
    advances: [],
    inputs: [],
    steps: [
      {
        stepId: "fixture-result",
        representation,
        forcedDecision: options.forced ? { choiceKey: "fixture-choice" } : null,
        observations: [
          {
            metric: "fixture.status",
            date: "2021-01-01",
            origin: "engine",
            recordIds,
          },
        ],
      },
    ],
  };
  const evaluation: P9Evaluation = {
    lifeId: "fixture-life",
    mode: "free",
    complete: true,
    steps: [
      {
        stepId: "fixture-result",
        representation,
        reproduced: !options.initialized,
        initialized: options.initialized ?? false,
        checkpointPast: options.initialized ?? false,
        checks: [{ metric: "fixture.status", status: "matched", recordIds }],
        ranges: [],
        chainBrokenBy: [],
      },
    ],
  };
  return {
    run,
    evaluation,
    sourcePreimagesVerified: options.sourcePreimagesVerified ?? true,
  };
}

const empiricalId = "EMPIRICAL-FIXTURE-POPULATION";
const empiricalFile = "src/core2/data/fixture-population-observation.json";
const empiricalHash =
  "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
function empiricalTarget() {
  return {
    id: empiricalId,
    kind: "external empirical observable",
    revision: "fixture-independent-source-vintage",
    sourceFiles: { [empiricalFile]: empiricalHash },
    sources: [
      {
        id: "fixture-population-source",
        title: "Fixture population source",
        publisher: "Fixture publisher",
        url: "https://example.invalid/population",
      },
    ],
    observations: [
      {
        quantity: "Fixture population outcome",
        unit: "fixture unit",
        sourceFile: empiricalFile,
        sourceRefs: ["fixture-population-source"],
        dateWindow: { earliest: "2025-01-01", latest: "2025-12-31" },
        observedValue: parameter("one"),
      },
    ],
    testRoute: {
      commandTemplate: "fixture-only-population-evaluator",
      evaluationContract: "Fixture schema only, never empirical evidence.",
      implementationStatus: "ready",
    },
    calibrationStatus: "unmeasured; fixture only",
  };
}
function empiricalCatalog() {
  const base = catalog();
  return {
    ...base,
    empiricalSourceFiles: { [empiricalFile]: empiricalHash },
    targets: [...base.targets, empiricalTarget()],
    parameterBindings: [
      ...base.parameterBindings,
      {
        parameter: "fixturePopulationScale",
        checkRange: { ref: empiricalId },
        mappingStatus:
          "target present; blocked by population/evidence applicability",
      },
    ],
  };
}
function empiricalParameters() {
  return {
    ...parameters(),
    fixturePopulationScale: {
      value: parameter("one"),
      tag: "TUNABLE",
      citation: "Fixture only; no coefficient bound",
      spread: { status: "unmeasured", reason: "Fixture only" },
      checkRange: { ref: empiricalId },
    },
  };
}

describe("external population observable references", () => {
  it("accepts independent pinned population evidence while preserving unmeasured/applicability blockers", () => {
    const result = auditCheckRangeCoverage(
      empiricalParameters(),
      empiricalCatalog(),
      undefined,
      { [empiricalFile]: empiricalHash },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.empiricalCalibrationPass).toBe(false);
    expect(
      result.blockers.some(
        (row) =>
          row.parameter === "fixturePopulationScale" &&
          row.code === "calibration-applicability-blocked",
      ),
    ).toBe(true);
  });
  it("rejects wrong actual source hashes, missing source links and an external reference masquerading as P9", () => {
    const wrong = auditCheckRangeCoverage(
      empiricalParameters(),
      empiricalCatalog(),
      undefined,
      {
        [empiricalFile]:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      },
    );
    expect(
      wrong.diagnostics.some(
        (row) =>
          row.target === empiricalId &&
          row.code === "calibration-target-evidence",
      ),
    ).toBe(true);
    const base = empiricalCatalog();
    const noEvidence = auditCheckRangeCoverage(empiricalParameters(), {
      ...base,
      targets: [target(), { ...empiricalTarget(), observations: [] }],
    });
    expect(
      noEvidence.diagnostics.some(
        (row) =>
          row.target === empiricalId &&
          row.code === "calibration-target-evidence",
      ),
    ).toBe(true);
    expect(evaluateP9Target(empiricalTarget(), [replayPair()]).status).toBe(
      "blocked",
    );
  });
});
