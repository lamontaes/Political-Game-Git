import type { CoreObservation, Gap, LifeFile, RunReceipt } from "./contract";
import { matchesIntent } from "./runner";
import { REPLAY_API_VERSION, ZERO, parameter } from "./parameters";

export interface StepEvaluation {
  stepId: string;
  representation: "full" | "records-only" | "missing";
  reproduced: boolean;
  initialized: boolean;
  checkpointPast: boolean;
  checks: {
    metric: string;
    status: "matched" | "different" | "unmeasured";
    recordIds: string[];
  }[];
  ranges: {
    metric: string;
    status: "inside" | "outside" | "unmeasured";
    actual?: number;
    minimum?: number;
    maximum?: number;
    recordIds: string[];
  }[];
  chainBrokenBy: string[];
  gaps: Gap[];
}

export interface Evaluation {
  version: string;
  lifeId: string;
  mode: "god" | "free";
  complete: boolean;
  steps: StepEvaluation[];
  summary: {
    total: number;
    full: number;
    recordsOnly: number;
    missing: number;
    reproduced: number;
    outOfRange: number;
    unmeasuredRanges: number;
  };
  firstBreak: { stepId: string; reason: string } | null;
}

function sameValue(
  expected: CoreObservation["value"],
  actual: CoreObservation["value"],
): boolean {
  if (
    expected &&
    typeof expected === "object" &&
    !Array.isArray(expected) &&
    typeof expected.parameter === "string" &&
    Object.keys(expected).length === parameter("one")
  )
    return parameter(expected.parameter) === actual;
  if (typeof expected === "number" || typeof actual === "number")
    return expected === actual;
  return matchesIntent(expected, actual) && matchesIntent(actual, expected);
}

export function evaluateLife(life: LifeFile, run: RunReceipt): Evaluation {
  if (
    run.version !== REPLAY_API_VERSION ||
    run.core.apiVersion !== REPLAY_API_VERSION ||
    life.version !== REPLAY_API_VERSION
  )
    throw new Error("Mismatched replay versions");
  if (run.lifeId !== life.id)
    throw new Error("Receipt belongs to another life");
  const observations = [
    ...run.initialization.observations,
    ...run.inputs.flatMap((input) => input.receipt.observations),
    ...run.advances.flatMap((advance) => advance.observations),
    ...run.steps.flatMap((step) => step.observations),
  ];
  const result: Evaluation = {
    version: REPLAY_API_VERSION,
    lifeId: life.id,
    mode: run.mode,
    complete: run.complete,
    steps: [],
    summary: {
      total: life.timeline.length,
      full: ZERO,
      recordsOnly: ZERO,
      missing: ZERO,
      reproduced: ZERO,
      outOfRange: ZERO,
      unmeasuredRanges: ZERO,
    },
    firstBreak: null,
  };
  const successful = new Set<string>();
  for (const step of life.timeline) {
    const receipt = run.steps.find((row) => row.stepId === step.id);
    const eligible = observations.filter(
      (observation) =>
        observation.date >= step.date.earliest &&
        observation.date <= step.date.latest &&
        observation.origin === "engine" &&
        observation.recordIds.length > ZERO,
    );
    const checks = step.checks.map(
      (check): StepEvaluation["checks"][number] => {
        const candidates = eligible.filter(
          (observation) => observation.metric === check.metric,
        );
        const matched = candidates.filter((observation) =>
          sameValue(check.equals, observation.value),
        );
        return {
          metric: check.metric,
          status:
            matched.length > ZERO
              ? "matched"
              : candidates.length > ZERO
                ? "different"
                : "unmeasured",
          recordIds: matched.flatMap((observation) => observation.recordIds),
        };
      },
    );
    const ranges = step.ranges.map(
      (range): StepEvaluation["ranges"][number] => {
        const minimum = range.minimumParameter
          ? parameter(range.minimumParameter)
          : undefined;
        const maximum = range.maximumParameter
          ? parameter(range.maximumParameter)
          : undefined;
        const candidates = eligible.filter(
          (observation) =>
            observation.metric === range.metric &&
            typeof observation.value === "number",
        );
        const actual = candidates.at(-parameter("one"));
        if (
          !actual ||
          typeof actual.value !== "number" ||
          !Number.isFinite(actual.value)
        )
          return {
            metric: range.metric,
            status: "unmeasured",
            minimum,
            maximum,
            recordIds: [],
          };
        return {
          metric: range.metric,
          status:
            (minimum === undefined || actual.value >= minimum) &&
            (maximum === undefined || actual.value <= maximum)
              ? "inside"
              : "outside",
          actual: actual.value,
          minimum,
          maximum,
          recordIds: actual.recordIds,
        };
      },
    );
    const chainBrokenBy = [
      ...new Set(
        step.requires
          .filter((id) => !successful.has(id))
          .flatMap((id) => [
            id,
            ...(result.steps.find((prior) => prior.stepId === id)
              ?.chainBrokenBy ?? []),
          ]),
      ),
    ];
    const checkpointPast = step.date.latest < run.startDate;
    const initialized =
      checkpointPast &&
      step.checks.length > ZERO &&
      step.checks.every((check) =>
        run.initialization.observations.some(
          (observation) =>
            observation.origin === "initialized" &&
            observation.date >= step.date.earliest &&
            observation.date <= step.date.latest &&
            observation.recordIds.length > ZERO &&
            observation.metric === check.metric &&
            sameValue(check.equals, observation.value),
        ),
      );
    const reproduced =
      !checkpointPast &&
      checks.length > ZERO &&
      checks.every((check) => check.status === "matched") &&
      ranges.every((range) => range.status === "inside");
    if ((reproduced || initialized) && chainBrokenBy.length === ZERO)
      successful.add(step.id);
    const evaluation: StepEvaluation = {
      stepId: step.id,
      representation: receipt?.representation ?? "missing",
      reproduced,
      initialized,
      checkpointPast,
      checks,
      ranges,
      chainBrokenBy,
      gaps: receipt?.gaps ?? [
        {
          code: "missing-step-receipt",
          detail: "No measured receipt exists for this step.",
          evidence: ["scripts/life-replay/evaluator.ts"],
        },
      ],
    };
    result.steps.push(evaluation);
    if (
      !result.firstBreak &&
      !checkpointPast &&
      (!reproduced || chainBrokenBy.length > ZERO)
    )
      result.firstBreak = {
        stepId: step.id,
        reason:
          chainBrokenBy.length > ZERO
            ? `Earlier links were not reproduced: ${chainBrokenBy.join(", ")}.`
            : checks.some((check) => check.status === "unmeasured")
              ? "The core emitted no decision or consequence record matching this documented step."
              : "The measured outcome differed from its public target.",
      };
  }
  result.summary.full = result.steps.filter(
    (step) => step.representation === "full",
  ).length;
  result.summary.recordsOnly = result.steps.filter(
    (step) => step.representation === "records-only",
  ).length;
  result.summary.missing = result.steps.filter(
    (step) => step.representation === "missing",
  ).length;
  result.summary.reproduced = result.steps.filter(
    (step) => step.reproduced,
  ).length;
  result.summary.outOfRange = result.steps
    .flatMap((step) => step.ranges)
    .filter((range) => range.status === "outside").length;
  result.summary.unmeasuredRanges = result.steps
    .flatMap((step) => step.ranges)
    .filter((range) => range.status === "unmeasured").length;
  return result;
}
