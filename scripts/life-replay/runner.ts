import type {
  CoreDecision,
  CorePastFact,
  CoreReceipt,
  DataValue,
  Gap,
  LifeFile,
  LifeStep,
  ReplayCore,
  RunReceipt,
  StepReceipt,
} from "./contract";
import { ONE, REPLAY_API_VERSION, ZERO, parameter } from "./parameters";
import { lifeProblems } from "./life-file";

export interface RunOptions {
  mode: "god" | "free";
  seed: string;
  checkpoint?: string;
  maxSimulatedDays?: number;
}

export function daysBetween(from: string, through: string): number {
  return (
    (Date.parse(`${through}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    parameter("millisecondsPerDay")
  );
}

export function pastFact(step: LifeStep): CorePastFact {
  return structuredClone({
    date: step.date,
    kind: step.kind,
    mechanism: step.mechanism,
    payload: step.payload,
    sourceRefs: step.sourceRefs,
  });
}

/** A documented action must match the core's actual intent, not its display label. */
export function matchesIntent(
  documented: DataValue,
  available: DataValue,
): boolean {
  if (documented === available) return true;
  if (
    !documented ||
    !available ||
    typeof documented !== "object" ||
    typeof available !== "object"
  )
    return false;
  if (Array.isArray(documented))
    return (
      Array.isArray(available) &&
      documented.length === available.length &&
      documented.every((item, index) => matchesIntent(item, available[index]))
    );
  if (Array.isArray(available)) return false;
  return Object.entries(documented).every(
    ([key, value]) => key in available && matchesIntent(value, available[key]),
  );
}

export function matchingChoices(
  step: LifeStep,
  decisions: CoreDecision[],
): { decisionId: string; choiceKey: string }[] {
  return decisions.flatMap((decision) =>
    decision.mechanism !== step.mechanism
      ? []
      : decision.choices
          .filter(
            (choice) =>
              choice.enabled &&
              choice.blockers.length === ZERO &&
              matchesIntent(step.payload, choice.intent),
          )
          .map((choice) => ({
            decisionId: decision.id,
            choiceKey: choice.key,
          })),
  );
}

function gap(code: string, detail: string): Gap {
  return { code, detail, evidence: ["scripts/life-replay/runner.ts"] };
}

export function runLife(
  life: LifeFile,
  core: ReplayCore,
  options: RunOptions,
): RunReceipt {
  const problems = lifeProblems(life);
  if (problems.length !== ZERO) throw new Error(problems.join("\n"));
  if (core.metadata.apiVersion !== REPLAY_API_VERSION)
    throw new Error(
      `Core API ${core.metadata.apiVersion} cannot read ${REPLAY_API_VERSION}; supply an explicit migration adapter`,
    );
  if (!["god", "free"].includes(options.mode))
    throw new Error("Unknown replay mode");
  const checkpoint = options.checkpoint
    ? life.checkpoints.find((row) => row.id === options.checkpoint)
    : undefined;
  if (options.checkpoint && !checkpoint)
    throw new Error(`Unknown checkpoint: ${options.checkpoint}`);
  const startDate = checkpoint?.date ?? life.birth.value.date;
  const endDate = life.timeline.at(-ONE)?.date.latest ?? startDate;
  const maximumDays =
    options.maxSimulatedDays ?? daysBetween(startDate, endDate);
  if (!Number.isSafeInteger(maximumDays) || maximumDays < ZERO)
    throw new Error("Replay day budget must be a nonnegative whole number");
  const started = performance.now();
  let peakRssBytes = process.memoryUsage().rss;
  const sampleMemory = (): void => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  };
  const stopgaps: RunReceipt["stopgaps"] = [];
  const setup = structuredClone({
    seed: options.seed,
    controller: options.mode,
    startDate,
    subject: {
      name: life.identity.value.name,
      birthDate: life.birth.value.date,
      birthPlace: life.birth.value.place,
    },
    family: life.family,
    household: life.household,
    past: life.timeline
      .filter((step) => step.date.latest < startDate)
      .map(pastFact),
    knownState: checkpoint?.knownState ?? {},
  });
  const initialization = core.initialize({
    ...setup,
    stopgapSink: (banner) => stopgaps.push(banner),
  });
  const receipt: RunReceipt = {
    version: REPLAY_API_VERSION,
    lifeId: life.id,
    mode: options.mode,
    seed: options.seed,
    core: { ...core.metadata },
    startDate,
    endDate: startDate,
    simulatedDays: ZERO,
    complete: false,
    elapsedMilliseconds: ZERO,
    peakRssBytes,
    initialization,
    advances: [],
    inputs: [],
    steps: [],
    stopgaps,
  };
  const queue = [
    ...life.conditions
      .filter((input) => input.throughDate >= startDate)
      .map((input) => ({
        date: input.fromDate < startDate ? startDate : input.fromDate,
        input,
        step: undefined,
      })),
    ...life.timeline
      .filter((step) => step.date.latest >= startDate)
      .map((step) => ({ date: step.date.latest, step, input: undefined })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  for (const step of life.timeline.filter((row) => row.date.latest < startDate))
    receipt.steps.push({
      stepId: step.id,
      representation: core.capability(step.mechanism).representation,
      attempted: false,
      forcedDecision: null,
      observations: [],
      recordIds: [],
      gaps: [
        gap(
          "checkpoint-past",
          "This step establishes the checkpoint; it was not reproduced in this run.",
        ),
      ],
    });
  for (const item of queue) {
    if (item.date > endDate) continue;
    if (performance.now() - started > parameter("maxRunMilliseconds"))
      throw new Error("Replay exceeded its documented cloud time budget");
    if (receipt.endDate < item.date) {
      const advanced = core.advance(
        item.date,
        maximumDays - receipt.simulatedDays,
      );
      if (
        !Number.isSafeInteger(advanced.simulatedDays) ||
        advanced.simulatedDays < ZERO ||
        advanced.simulatedDays > maximumDays - receipt.simulatedDays ||
        advanced.throughDate < receipt.endDate ||
        advanced.throughDate > item.date ||
        daysBetween(receipt.endDate, advanced.throughDate) !==
          advanced.simulatedDays
      )
        throw new Error("Core returned an invalid advancement receipt");
      receipt.advances.push(advanced);
      receipt.simulatedDays += advanced.simulatedDays;
      receipt.endDate = advanced.throughDate;
      sampleMemory();
    }
    if (item.input) {
      if (receipt.endDate < item.date)
        receipt.inputs.push({
          inputId: item.input.id,
          receipt: {
            gaps: [
              gap(
                "unreached-condition",
                "The run ended before this condition could enter the world.",
              ),
            ],
            observations: [],
            recordIds: [],
          },
        });
      else
        receipt.inputs.push({
          inputId: item.input.id,
          receipt: core.input(structuredClone(item.input)),
        });
      continue;
    }
    const step = item.step;
    if (!step) continue;
    const capability = core.capability(step.mechanism);
    const result: StepReceipt = {
      stepId: step.id,
      representation: capability.representation,
      attempted: false,
      forcedDecision: null,
      observations: [],
      gaps: [...capability.gaps],
      recordIds: [],
    };
    receipt.steps.push(result);
    if (receipt.endDate < item.date) {
      result.gaps.push(
        gap(
          "unreached-step",
          "The measured run ended before this documented window.",
        ),
      );
      continue;
    }
    let action: CoreReceipt | undefined;
    if (step.kind === "event") {
      result.attempted = true;
      action = core.event(pastFact(step));
    } else if (step.kind === "decision" && options.mode === "god") {
      const choices = matchingChoices(step, core.decisions());
      if (choices.length === ONE) {
        result.attempted = true;
        result.forcedDecision = choices[ZERO];
        action = core.resolve(
          choices[ZERO].decisionId,
          choices[ZERO].choiceKey,
        );
      } else
        result.gaps.push(
          gap(
            choices.length === ZERO
              ? "no-forceable-choice"
              : "ambiguous-forceable-choice",
            choices.length === ZERO
              ? "The core offered no enabled choice matching the documented action. No outcome was inserted."
              : "Several enabled choices match. The harness cannot silently choose a different action.",
          ),
        );
    }
    // Free mode never receives a documented choice or expected outcome.
    result.observations = [...(action?.observations ?? []), ...core.observe()];
    result.recordIds = action?.recordIds ?? [];
    result.gaps.push(...(action?.gaps ?? []));
    sampleMemory();
  }
  receipt.complete = receipt.endDate === endDate;
  receipt.elapsedMilliseconds = performance.now() - started;
  receipt.peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  return receipt;
}
