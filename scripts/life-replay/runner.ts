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
    documented &&
    typeof documented === "object" &&
    !Array.isArray(documented) &&
    typeof documented.parameter === "string" &&
    Object.keys(documented).length === ONE &&
    typeof available === "number"
  )
    return parameter(documented.parameter) === available;
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
    decision.mechanism !== step.mechanism ||
    decision.actorKey !== (step.actorKey ?? "subject")
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
  let peakRssBytes = Math.max(
    process.memoryUsage().rss,
    process.resourceUsage().maxRSS * parameter("bytesPerKiB"),
  );
  const sampleMemory = (): void => {
    peakRssBytes = Math.max(
      peakRssBytes,
      process.memoryUsage().rss,
      process.resourceUsage().maxRSS * parameter("bytesPerKiB"),
    );
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
    birthSources: life.sources.filter((source) =>
      life.birth.sourceRefs.includes(source.id),
    ),
    family: life.family.filter((row) => row.role !== "reference"),
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
  const pendingForces = new Map<
    string,
    { choice: { decisionId: string; choiceKey: string }; action: CoreReceipt }
  >();
  const resolvedPending = new Set<string>();
  const queue = [
    ...life.conditions
      .filter(
        (input) => input.role !== "reference" && input.throughDate >= startDate,
      )
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
          "This step was supplied as checkpoint context; the run did not replay it.",
        ),
      ],
    });
  for (const item of queue) {
    if (item.date > endDate) continue;
    if (performance.now() - started > parameter("maxRunMilliseconds"))
      throw new Error("Replay exceeded its documented cloud time budget");
    let pendingAtBoundary = false;
    while (receipt.endDate < item.date || pendingAtBoundary) {
      if (performance.now() - started > parameter("maxRunMilliseconds"))
        throw new Error("Pending decisions exceeded the cloud time budget");
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
      const pending = advanced.pending ?? [];
      pendingAtBoundary = pending.length > ZERO;
      if (pending.length === ZERO) break;
      if (options.mode === "free")
        throw new Error(
          "A free-mode core must resolve its own pending decisions",
        );
      const matches = life.timeline
        .filter(
          (step) =>
            step.kind === "decision" &&
            !pendingForces.has(step.id) &&
            step.date.earliest <= receipt.endDate &&
            receipt.endDate <= step.date.latest,
        )
        .flatMap((step) =>
          matchingChoices(step, pending).map((choice) => ({ step, choice })),
        );
      const match = matches.length === ONE ? matches[ZERO] : undefined;
      const next =
        match?.choice.decisionId ??
        [...pending].sort((left, right) => left.id.localeCompare(right.id))[
          ZERO
        ].id;
      const occurrence = `${receipt.endDate}:${next}`;
      if (resolvedPending.has(occurrence))
        throw new Error(
          "Core returned an already resolved pending decision without advancing",
        );
      resolvedPending.add(occurrence);
      const action = core.resolve(next, match?.choice.choiceKey ?? null);
      advanced.observations.push(...action.observations);
      advanced.recordIds.push(...action.recordIds);
      advanced.gaps.push(...action.gaps);
      if (match)
        pendingForces.set(match.step.id, { choice: match.choice, action });
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
      probeRecordIds: capability.recordIds ?? [],
    };
    const pendingForce = pendingForces.get(step.id);
    if (pendingForce) {
      result.attempted = true;
      result.forcedDecision = pendingForce.choice;
      result.observations.push(...pendingForce.action.observations);
      result.recordIds.push(...pendingForce.action.recordIds);
      result.gaps.push(...pendingForce.action.gaps);
    }
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
    } else if (
      step.kind === "decision" &&
      options.mode === "god" &&
      !pendingForce
    ) {
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
    result.observations.push(
      ...(action?.observations ?? []),
      ...core.observe(),
    );
    result.recordIds.push(...(action?.recordIds ?? []));
    result.gaps.push(...(action?.gaps ?? []));
    sampleMemory();
  }
  receipt.complete = receipt.endDate === endDate;
  receipt.elapsedMilliseconds = performance.now() - started;
  sampleMemory();
  receipt.peakRssBytes = peakRssBytes;
  return receipt;
}
