/** Developer-only target validation; core code must not import this module. */

export interface CalibrationDiagnostic {
  readonly code: string;
  readonly file?: string;
  readonly parameter?: string;
  readonly target?: string;
  readonly message: string;
}

export interface CalibrationBlocker {
  readonly code: string;
  readonly parameter?: string;
  readonly target?: string;
  readonly message: string;
}

export interface CalibrationAudit {
  readonly structuralValid: boolean;
  readonly targetReferenceCount: number;
  readonly diagnostics: readonly CalibrationDiagnostic[];
  readonly blockers: readonly CalibrationBlocker[];
  /** Structural references never count as an empirical calibration pass. */
  readonly empiricalCalibrationPass: false;
}

interface TargetRoute {
  readonly commandTemplate?: unknown;
  readonly existingExecutable?: unknown;
  readonly evaluation?: unknown;
  readonly evaluationContract?: unknown;
  readonly implementationStatus?: unknown;
  readonly routeStatus?: unknown;
}

interface CalibrationTarget {
  readonly id?: unknown;
  readonly revision?: unknown;
  readonly sourceFiles?: unknown;
  readonly observations?: unknown;
  readonly testRoute?: TargetRoute;
  readonly calibrationStatus?: unknown;
  readonly parameterApplicability?: unknown;
}

interface CalibrationCatalog {
  readonly sourceRevision?: unknown;
  readonly p9SourceFiles?: unknown;
  readonly p8ParameterPreimage?: unknown;
  readonly parameterBindings?: unknown;
  readonly targets?: unknown;
}

const GENERIC_TARGET_ID = /^P9-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const PARAMETER_FILE = "src/core2/data/parameters.json";
const CATALOG_FILE = "src/core2/tooling/calibration-targets.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha1(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function isRevision(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{7,40}$/i.test(value);
}

function records(value: unknown): Record<string, unknown>[] | undefined {
  return Array.isArray(value) && value.every(isRecord) ? value : undefined;
}

function targetHasSourceEvidence(
  target: CalibrationTarget,
  sourceManifest: Record<string, unknown>,
): boolean {
  if (!nonemptyString(target.revision) || !isRecord(target.sourceFiles))
    return false;
  if (Object.keys(target.sourceFiles).length === 0) return false;
  if (
    !Object.entries(target.sourceFiles).every(
      ([path, hash]) =>
        path.startsWith("data/life-replay/") &&
        isSha1(hash) &&
        sourceManifest[path] === hash,
    )
  )
    return false;
  if (!Array.isArray(target.observations) || target.observations.length === 0)
    return false;
  return target.observations.every((observation) => {
    if (!isRecord(observation)) return false;
    if (
      nonemptyString(observation.lifeFile) &&
      !Object.hasOwn(
        target.sourceFiles as Record<string, unknown>,
        observation.lifeFile,
      )
    )
      return false;
    const dateWindow = observation.dateWindow;
    if (
      !isRecord(dateWindow) ||
      !isIsoDate(dateWindow.earliest) ||
      !isIsoDate(dateWindow.latest) ||
      dateWindow.earliest > dateWindow.latest
    )
      return false;
    if (
      !Array.isArray(observation.sourceRefs) ||
      observation.sourceRefs.length === 0 ||
      !observation.sourceRefs.every(nonemptyString)
    )
      return false;
    const sources = records(observation.sources);
    if (!sources || sources.length === 0) return false;
    const sourceIds = new Set(
      sources.map((source) => source.id).filter(nonemptyString),
    );
    if (!observation.sourceRefs.every((sourceRef) => sourceIds.has(sourceRef)))
      return false;
    if (
      !sources.every(
        (source) =>
          nonemptyString(source.title) &&
          nonemptyString(source.publisher) &&
          typeof source.url === "string" &&
          /^https:\/\//i.test(source.url),
      )
    )
      return false;
    if (
      !Array.isArray(observation.checks) ||
      !Array.isArray(observation.ranges)
    )
      return false;
    if (
      !observation.checks.every(
        (check) =>
          isRecord(check) &&
          nonemptyString(check.metric) &&
          Object.hasOwn(check, "expectedValue"),
      )
    )
      return false;
    return observation.ranges.every(
      (range) =>
        isRecord(range) &&
        nonemptyString(range.metric) &&
        (Object.hasOwn(range, "minimumParameter") ||
          Object.hasOwn(range, "maximumParameter")),
    );
  });
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function routeIsPresent(route: unknown): route is TargetRoute {
  if (!isRecord(route)) return false;
  const command = route.commandTemplate ?? route.existingExecutable;
  const evaluator = route.evaluationContract ?? route.evaluation;
  const routeStatus = route.routeStatus;
  return (
    route.implementationStatus === "ready" &&
    nonemptyString(command) &&
    nonemptyString(evaluator) &&
    !(
      nonemptyString(routeStatus) &&
      /blocked|absent|missing|not implemented|unavailable|unmeasured/i.test(
        routeStatus,
      )
    )
  );
}

function parameterBinding(
  catalog: CalibrationCatalog,
  parameter: string,
): Record<string, unknown> | undefined {
  return records(catalog.parameterBindings)?.find(
    (row) => row.parameter === parameter,
  );
}

/**
 * Validate target references without treating them as measured calibration.
 * Catalog and parameter JSON are passed as data so this stays easy to fixture.
 */
export function auditCheckRangeCoverage(
  parametersInput: unknown,
  catalogInput: unknown,
  actualParameterSourceSha256?: string,
): CalibrationAudit {
  const diagnostics: CalibrationDiagnostic[] = [];
  const blockers: CalibrationBlocker[] = [];
  if (!isRecord(parametersInput)) {
    return {
      structuralValid: false,
      targetReferenceCount: 0,
      diagnostics: [
        {
          code: "parameter-table-shape",
          file: PARAMETER_FILE,
          message: "Expected a named parameter metadata table.",
        },
      ],
      blockers: [],
      empiricalCalibrationPass: false,
    };
  }
  if (!isRecord(catalogInput)) {
    return {
      structuralValid: false,
      targetReferenceCount: 0,
      diagnostics: [
        {
          code: "calibration-catalog-shape",
          file: CATALOG_FILE,
          message: "Expected the developer-only calibration catalog object.",
        },
      ],
      blockers: [],
      empiricalCalibrationPass: false,
    };
  }

  const catalog = catalogInput as CalibrationCatalog;
  if (
    !isRevision(catalog.sourceRevision) ||
    !isRecord(catalog.p9SourceFiles) ||
    Object.keys(catalog.p9SourceFiles).length === 0 ||
    !Object.entries(catalog.p9SourceFiles).every(
      ([path, hash]) => path.startsWith("data/life-replay/") && isSha1(hash),
    )
  ) {
    diagnostics.push({
      code: "calibration-source-manifest",
      file: CATALOG_FILE,
      message: "The catalog needs a pinned P9 source revision and file hashes.",
    });
  }
  const parameterPreimage = catalog.p8ParameterPreimage;
  if (
    !isRecord(parameterPreimage) ||
    parameterPreimage.path !== PARAMETER_FILE ||
    !isSha256(parameterPreimage.sha256)
  ) {
    diagnostics.push({
      code: "calibration-p8-parameter-preimage",
      file: CATALOG_FILE,
      message: "The catalog must pin the exact P8 parameter table preimage.",
    });
  } else if (
    actualParameterSourceSha256 !== undefined &&
    parameterPreimage.sha256 !== actualParameterSourceSha256
  ) {
    diagnostics.push({
      code: "calibration-p8-parameter-preimage-stale",
      file: CATALOG_FILE,
      message:
        "The catalog’s P8 parameter preimage hash does not match the current parameter table.",
    });
  }

  const targetRows = records(catalog.targets);
  if (!targetRows) {
    diagnostics.push({
      code: "calibration-target-list",
      file: CATALOG_FILE,
      message: "The calibration catalog must contain a targets array.",
    });
  }
  const targetById = new Map<string, CalibrationTarget>();
  for (const row of targetRows ?? []) {
    const id = row.id;
    if (!nonemptyString(id) || !GENERIC_TARGET_ID.test(id)) {
      diagnostics.push({
        code: "calibration-target-id",
        file: CATALOG_FILE,
        target: nonemptyString(id) ? id : undefined,
        message: "Catalog target IDs must be generic P9 identifiers.",
      });
      continue;
    }
    if (targetById.has(id)) {
      diagnostics.push({
        code: "calibration-target-duplicate",
        file: CATALOG_FILE,
        target: id,
        message: "A catalog target ID appears more than once.",
      });
      continue;
    }
    targetById.set(id, row as CalibrationTarget);
    if (
      !nonemptyString(row.revision) ||
      row.revision !== catalog.sourceRevision
    ) {
      diagnostics.push({
        code: "calibration-target-revision",
        file: CATALOG_FILE,
        target: id,
        message:
          "The target revision must match the pinned P9 source revision.",
      });
    }
    if (
      !targetHasSourceEvidence(
        row as CalibrationTarget,
        isRecord(catalog.p9SourceFiles) ? catalog.p9SourceFiles : {},
      )
    ) {
      diagnostics.push({
        code: "calibration-target-evidence",
        file: CATALOG_FILE,
        target: id,
        message:
          "A target needs pinned source hashes and dated observations with source references, checks, and ranges.",
      });
    }
    if (!routeIsPresent(row.testRoute)) {
      blockers.push({
        code: "calibration-target-route-missing",
        target: id,
        message:
          "No executable P8 runner/evaluator is available. A planned route cannot count as a pass.",
      });
    }
  }

  const bindings = records(catalog.parameterBindings);
  if (!bindings) {
    diagnostics.push({
      code: "calibration-binding-ledger",
      file: CATALOG_FILE,
      message:
        "The catalog needs a parameterBindings array matching current TUNABLE rows.",
    });
  }
  const bindingRows = bindings ?? [];
  const referencedBindings = new Set<string>();
  const referencedTargets = new Set<string>();
  const seenBindingParameters = new Set<string>();
  let targetReferenceCount = 0;

  for (const [name, row] of Object.entries(parametersInput)) {
    if (!isRecord(row)) continue;
    if (row.tag !== "TUNABLE") {
      if (row.checkRange !== undefined) {
        diagnostics.push({
          code: "checkrange-tag",
          file: PARAMETER_FILE,
          parameter: name,
          message: "checkRange is reserved for TUNABLE rows.",
        });
      }
      continue;
    }
    const checkRange = row.checkRange;
    if (
      !isRecord(checkRange) ||
      Object.keys(checkRange).length !== 1 ||
      !nonemptyString(checkRange.ref)
    ) {
      diagnostics.push({
        code: "checkrange-shape",
        file: PARAMETER_FILE,
        parameter: name,
        message:
          "Every TUNABLE needs checkRange with exactly one nonempty ref string.",
      });
      continue;
    }
    const targetId = checkRange.ref;
    if (!GENERIC_TARGET_ID.test(targetId)) {
      diagnostics.push({
        code: "checkrange-id",
        file: PARAMETER_FILE,
        parameter: name,
        target: targetId,
        message:
          "checkRange.ref must use a generic P9 target ID, without inline values or source metadata.",
      });
      continue;
    }
    targetReferenceCount += 1;
    referencedTargets.add(targetId);
    const target = targetById.get(targetId);
    if (!target) {
      diagnostics.push({
        code: "checkrange-target-missing",
        file: PARAMETER_FILE,
        parameter: name,
        target: targetId,
        message:
          "checkRange.ref does not resolve in the developer-only target catalog.",
      });
      continue;
    }
    const binding = parameterBinding(catalog, name);
    if (
      !binding ||
      !nonemptyString(binding.mappingStatus) ||
      !isRecord(binding.checkRange) ||
      Object.keys(binding.checkRange).length !== 1 ||
      binding.checkRange.ref !== targetId
    ) {
      diagnostics.push({
        code: "checkrange-binding-mismatch",
        file: CATALOG_FILE,
        parameter: name,
        target: targetId,
        message:
          "The developer binding ledger needs a mapping status and exactly the same ref-only target as the parameter row.",
      });
    } else {
      referencedBindings.add(name);
      if (
        nonemptyString(binding.mappingStatus) &&
        /blocked|inapplicable|no-valid|unresolved/i.test(binding.mappingStatus)
      ) {
        blockers.push({
          code: "calibration-applicability-blocked",
          parameter: name,
          target: targetId,
          message: nonemptyString(binding.reviewNote)
            ? binding.reviewNote
            : binding.mappingStatus,
        });
      }
    }
    if (
      !nonemptyString(target.calibrationStatus) ||
      !/^measured\b/i.test(target.calibrationStatus)
    ) {
      blockers.push({
        code: "calibration-not-measured",
        parameter: name,
        target: targetId,
        message: nonemptyString(target.calibrationStatus)
          ? target.calibrationStatus
          : "No measured target receipt is recorded.",
      });
    }
  }

  for (const binding of bindingRows) {
    if (!nonemptyString(binding.parameter)) continue;
    const name = binding.parameter;
    if (seenBindingParameters.has(name)) {
      diagnostics.push({
        code: "calibration-duplicate-binding",
        file: CATALOG_FILE,
        parameter: name,
        message: "A parameter has more than one developer binding row.",
      });
      continue;
    }
    seenBindingParameters.add(name);
    const parameterRow = parametersInput[name];
    if (!isRecord(parameterRow) || parameterRow.tag !== "TUNABLE") {
      diagnostics.push({
        code: "calibration-stale-binding",
        file: CATALOG_FILE,
        parameter: name,
        message:
          "The catalog has a binding for a parameter that is not a current TUNABLE.",
      });
      continue;
    }
    if (!referencedBindings.has(name)) {
      diagnostics.push({
        code: "calibration-unmatched-binding",
        file: CATALOG_FILE,
        parameter: name,
        message:
          "Every TUNABLE must have exactly one matching developer binding row.",
      });
    }
  }
  for (const targetId of targetById.keys()) {
    if (!referencedTargets.has(targetId)) {
      diagnostics.push({
        code: "calibration-unused-target",
        file: CATALOG_FILE,
        target: targetId,
        message:
          "Every target must be referenced by at least one current TUNABLE or be removed from the catalog.",
      });
    }
  }

  return {
    structuralValid: diagnostics.length === 0,
    targetReferenceCount,
    diagnostics,
    blockers,
    empiricalCalibrationPass: false,
  };
}

export interface P9CheckEvaluation {
  readonly metric: string;
  readonly status: "matched" | "different" | "unmeasured";
  readonly recordIds: readonly string[];
}

export interface P9RangeEvaluation {
  readonly metric: string;
  readonly status: "inside" | "outside" | "unmeasured";
  readonly recordIds: readonly string[];
}

export interface P9StepEvaluation {
  readonly stepId: string;
  readonly representation: "full" | "records-only" | "missing";
  readonly reproduced: boolean;
  readonly initialized: boolean;
  readonly checkpointPast: boolean;
  readonly checks: readonly P9CheckEvaluation[];
  readonly ranges: readonly P9RangeEvaluation[];
  readonly chainBrokenBy: readonly string[];
}

export interface P9Evaluation {
  readonly lifeId: string;
  readonly mode: "god" | "free";
  readonly complete: boolean;
  readonly steps: readonly P9StepEvaluation[];
}

export interface P9Observation {
  readonly metric: string;
  readonly date: string;
  readonly origin: "initialized" | "forced" | "engine";
  readonly recordIds: readonly string[];
}

export interface P9RunStep {
  readonly stepId: string;
  readonly representation: "full" | "records-only" | "missing";
  readonly forcedDecision: unknown | null;
  readonly observations: readonly P9Observation[];
}

export interface P9RunReceipt {
  readonly lifeId: string;
  readonly mode: "god" | "free";
  readonly complete: boolean;
  readonly initialization: { readonly observations: readonly P9Observation[] };
  readonly advances: readonly {
    readonly observations: readonly P9Observation[];
  }[];
  readonly inputs: readonly {
    readonly receipt: { readonly observations: readonly P9Observation[] };
  }[];
  readonly steps: readonly P9RunStep[];
}

export interface P9ReplayPair {
  readonly run: P9RunReceipt;
  readonly evaluation: P9Evaluation;
  /** The runner must verify pinned LifeFile/parameter source hashes before replay. */
  readonly sourcePreimagesVerified: boolean;
}

export interface P9TargetResult {
  readonly status: "blocked" | "pass" | "fail";
  readonly reasons: readonly string[];
  /** Even a target pass is not an independently identified coefficient bound. */
  readonly coefficientCalibration: "not-inferred";
}

/**
 * Evaluates ordinary post-start P9 replay outcomes. Historical generated-prior
 * targets need a separate adapter/evaluator and cannot pass through this path.
 */
export function evaluateP9Target(
  target: CalibrationTarget,
  pairs: readonly P9ReplayPair[],
): P9TargetResult {
  const route = target.testRoute;
  if (
    !route ||
    route.implementationStatus !== "ready" ||
    !routeIsPresent(route)
  ) {
    return {
      status: "blocked",
      reasons: ["The P8 adapter/evaluator route is absent or not enabled."],
      coefficientCalibration: "not-inferred",
    };
  }
  if (
    !isRecord(target.sourceFiles) ||
    !targetHasSourceEvidence(target, target.sourceFiles)
  ) {
    return {
      status: "blocked",
      reasons: [
        "The target source manifest or dated observations are incomplete.",
      ],
      coefficientCalibration: "not-inferred",
    };
  }
  const targetSteps = (target.observations as Record<string, unknown>[]).filter(
    (step) => step.kind === "decision" || step.kind === "outcome",
  );
  if (targetSteps.length === 0) {
    return {
      status: "blocked",
      reasons: ["The target has no sourced decision/outcome steps to compare."],
      coefficientCalibration: "not-inferred",
    };
  }
  const byLife = new Map(pairs.map((pair) => [pair.run.lifeId, pair]));
  const reasons: string[] = [];
  const lifeIds = [
    ...new Set(targetSteps.map((step) => step.lifeId).filter(nonemptyString)),
  ];
  for (const lifeId of lifeIds) {
    const pair = byLife.get(lifeId);
    if (!pair) {
      reasons.push("A target LifeFile has no replay receipt.");
      continue;
    }
    const { run, evaluation } = pair;
    if (!pair.sourcePreimagesVerified)
      reasons.push(
        "LifeFile/parameter preimages do not match the pinned target catalog.",
      );
    if (run.mode !== "free" || evaluation.mode !== "free")
      reasons.push("Target replay was not free mode.");
    if (!run.complete || !evaluation.complete)
      reasons.push("Target replay horizon is incomplete.");
    if (run.lifeId !== evaluation.lifeId || run.lifeId !== lifeId)
      reasons.push("Run receipt and evaluation belong to different LifeFiles.");

    const lifeSteps = targetSteps.filter((step) => step.lifeId === lifeId);
    for (const targetStep of lifeSteps) {
      const stepId = targetStep.stepId;
      const window = isRecord(targetStep.dateWindow)
        ? targetStep.dateWindow
        : undefined;
      if (
        !nonemptyString(stepId) ||
        !window ||
        !nonemptyString(window.earliest) ||
        !nonemptyString(window.latest)
      ) {
        reasons.push("A target outcome lacks a step ID or source date window.");
        continue;
      }
      const earliest = window.earliest;
      const latest = window.latest;
      const evaluated = evaluation.steps.find((step) => step.stepId === stepId);
      const recorded = run.steps.find((step) => step.stepId === stepId);
      if (!evaluated || !recorded) {
        reasons.push("A target outcome has no evaluation or step receipt.");
        continue;
      }
      if (
        evaluated.representation !== "full" ||
        recorded.representation !== "full"
      )
        reasons.push("A target outcome is not fully represented.");
      if (
        !evaluated.reproduced ||
        evaluated.initialized ||
        evaluated.checkpointPast
      )
        reasons.push(
          "A target outcome was initialized/past or not independently reproduced.",
        );
      if (evaluated.chainBrokenBy.length > 0)
        reasons.push("A target outcome has a broken dependency chain.");
      if (recorded.forcedDecision !== null)
        reasons.push("A target outcome includes a forced choice.");

      const expectedChecks = (
        Array.isArray(targetStep.checks) ? targetStep.checks : []
      )
        .filter(isRecord)
        .map((row) => row.metric)
        .filter(nonemptyString);
      const expectedRanges = (
        Array.isArray(targetStep.ranges) ? targetStep.ranges : []
      )
        .filter(isRecord)
        .map((row) => row.metric)
        .filter(nonemptyString);
      for (const metric of expectedChecks) {
        const check = evaluated.checks.find((row) => row.metric === metric);
        if (
          !check ||
          check.status !== "matched" ||
          check.recordIds.length === 0
        )
          reasons.push(
            "A target check is unmatched or lacks canonical record IDs.",
          );
      }
      for (const metric of expectedRanges) {
        const range = evaluated.ranges.find((row) => row.metric === metric);
        if (!range || range.status !== "inside" || range.recordIds.length === 0)
          reasons.push(
            "A target range is outside/unmeasured or lacks canonical record IDs.",
          );
      }
      if (
        evaluated.checks.some(
          (row) => row.status !== "matched" || row.recordIds.length === 0,
        ) ||
        evaluated.ranges.some(
          (row) => row.status !== "inside" || row.recordIds.length === 0,
        )
      )
        reasons.push(
          "The P9 evaluator has an unmatched check or range for this step.",
        );

      const raw = [
        ...run.initialization.observations,
        ...run.advances.flatMap((advance) => advance.observations),
        ...run.inputs.flatMap((input) => input.receipt.observations),
        ...run.steps.flatMap((step) => step.observations),
      ];
      const evaluatedIds = new Set([
        ...evaluated.checks.flatMap((row) => row.recordIds),
        ...evaluated.ranges.flatMap((row) => row.recordIds),
      ]);
      for (const metric of [...expectedChecks, ...expectedRanges]) {
        const engineRows = raw.filter(
          (observation) =>
            observation.metric === metric &&
            observation.origin === "engine" &&
            observation.recordIds.length > 0 &&
            observation.date >= earliest &&
            observation.date <= latest,
        );
        if (
          !engineRows.some((row) =>
            row.recordIds.some((recordId) => evaluatedIds.has(recordId)),
          )
        ) {
          reasons.push(
            "A target metric lacks matching engine-origin evidence in its source date window.",
          );
        }
      }
    }
  }
  return reasons.length === 0
    ? { status: "pass", reasons: [], coefficientCalibration: "not-inferred" }
    : {
        status: "fail",
        reasons: [...new Set(reasons)],
        coefficientCalibration: "not-inferred",
      };
}
