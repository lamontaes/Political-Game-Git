import {
  EPISODE_FAMILIES,
  auditPlayerModel,
  eligibleEpisodeBeats,
  episodeInstances,
  liveAmbiguities,
  modelFromSetupPriors,
  narrativeThreads,
  nextQuestionnaireStep,
  personName,
  playerModelFor,
  questionnaireItem,
  questionnaireOutcome,
  setupOnlyPlayerModel,
  setupPriorsOf,
  threadPresence,
  type EntityId,
  type PlayerModelAudit,
  type QuestionnaireOutcome,
  type SetupAnswerRecord,
  type SetupPriorStore,
  type World,
} from "../simulation";
import { composeConnectiveNarration, recurringPeople } from "./life-narration";
import {
  lastRecordedMoment,
  projectStoryMoment,
  traceStorySelection,
} from "./life-story";

/**
 * What the game thinks, written down for a developer and for nobody else.
 *
 * The authority is explicit that this wave may not be accepted merely because
 * the systems exist: somebody has to be able to check that the calibration
 * actually moved the adaptive model, and that a beat was composed from the
 * life rather than dealt off a deck. This module answers that.
 *
 * It answers it as a REPORT rather than as a screen, and that is a scoping
 * decision rather than a shortcut. The development causal inspector — the
 * timeline, the record navigation, the trace export, the observer surface — is
 * owned by another branch and is deliberately not rebuilt here; building a
 * second one would be exactly the duplication the routing authority is trying
 * to prevent. What this provides instead is the deterministic content that
 * inspector will read: pure functions over a world, returning plain data and
 * plain Markdown, with every claim carrying the record ids behind it.
 *
 * NOTHING HERE MAY REACH A PLAYER. Every function in this file answers a
 * question the game must stay silent about — what it has concluded, which
 * explanations it is still weighing, why it offered what it offered. A test
 * pins that none of it is imported by the play surface.
 */

/* -------------------------------------------------------------------------- */
/* The calibration                                                             */
/* -------------------------------------------------------------------------- */

export interface CalibrationDimensionMove {
  readonly dimension: PlayerModelAudit["dimension"];
  readonly before: number;
  readonly after: number;
  readonly weightBefore: number;
  readonly weightAfter: number;
  readonly movedBy: number;
}

export interface CalibrationQuestionTrace {
  readonly ordinal: number;
  readonly questionKey: string;
  readonly register: string;
  readonly chosen: string | null;
  /** Why the selector reached for this item rather than another. */
  readonly reason: string;
  /** What the item was worth against the best alternative, at the time. */
  readonly informationValue: number;
  readonly runnerUpKey: string | null;
  readonly moved: readonly CalibrationDimensionMove[];
}

export interface CalibrationReport {
  readonly bankVersion: string;
  readonly path: string;
  readonly asked: number;
  readonly questions: readonly CalibrationQuestionTrace[];
  /** Explanations the answers left level, with how evenly. */
  readonly unresolved: readonly {
    readonly key: string;
    readonly openness: number;
    readonly note: string;
  }[];
  readonly outcome: QuestionnaireOutcome;
  readonly finalModel: readonly PlayerModelAudit[];
}

/**
 * The calibration, replayed one answer at a time.
 *
 * Re-derived from the persisted answers rather than recorded as it happened,
 * which is what makes it survive a save: the same world produces the same
 * report on any machine, and there is no second store to fall out of step.
 */
export function calibrationReport(
  world: World,
  worldSeed: string,
  personKey: string,
): CalibrationReport {
  const priors = setupPriorsOf(world);
  const questions: CalibrationQuestionTrace[] = [];
  const answered: SetupAnswerRecord[] = [];

  for (const answer of priors.answers) {
    const step = nextQuestionnaireStep({
      worldSeed,
      personKey,
      depth: priors.path === "skipped" ? "short" : priors.path,
      answers: answered,
    });
    const before = auditOf(answered, priors);
    answered.push(answer);
    const after = auditOf(answered, priors);
    const item = questionnaireItem(answer.questionKey);
    const scored = step?.candidates.find(
      (candidate) => candidate.item.key === answer.questionKey,
    );
    const runnerUp = step?.candidates
      .filter((candidate) => candidate.item.key !== answer.questionKey)
      .sort((left, right) => right.components.total - left.components.total)
      .at(0);

    questions.push({
      ordinal: answer.ordinal,
      questionKey: answer.questionKey,
      register: item?.register ?? "unknown",
      chosen: answer.choiceId,
      reason: step?.reason ?? "replayed",
      informationValue: scored?.components.informationValue ?? 0,
      runnerUpKey: runnerUp?.item.key ?? null,
      moved: movedDimensions(before, after),
    });
  }

  const model = setupOnlyPlayerModel(world);
  return {
    bankVersion: priors.bankVersion,
    path: priors.path,
    asked: priors.answers.length,
    questions,
    unresolved: liveAmbiguities(model).map((ambiguity) => ({
      key: ambiguity.key,
      openness: ambiguity.openness,
      note: ambiguity.note,
    })),
    outcome: questionnaireOutcome({
      worldSeed,
      personKey,
      depth: priors.path === "skipped" ? "short" : priors.path,
      answers: priors.answers,
    }),
    finalModel: auditPlayerModel(model),
  };
}

/**
 * The model as it stood after a prefix of the answers.
 *
 * Routed through the same function the game uses to turn priors into a model,
 * so a divergence between what the report says and what the game did is
 * impossible rather than unlikely.
 */
function auditOf(
  answers: readonly SetupAnswerRecord[],
  priors: SetupPriorStore,
): readonly PlayerModelAudit[] {
  return auditPlayerModel(
    modelFromSetupPriors({ ...priors, answers: [...answers] }),
  );
}

function movedDimensions(
  before: readonly PlayerModelAudit[],
  after: readonly PlayerModelAudit[],
): readonly CalibrationDimensionMove[] {
  const moves: CalibrationDimensionMove[] = [];
  for (const entry of after) {
    const previous = before.find(
      (candidate) => candidate.dimension === entry.dimension,
    );
    const beforeMean = previous?.mean ?? 0;
    const beforeWeight = previous?.weight ?? 0;
    if (
      Math.abs(entry.mean - beforeMean) < 1e-9 &&
      Math.abs(entry.weight - beforeWeight) < 1e-9
    ) {
      continue;
    }
    moves.push({
      dimension: entry.dimension,
      before: beforeMean,
      after: entry.mean,
      weightBefore: beforeWeight,
      weightAfter: entry.weight,
      movedBy: entry.mean - beforeMean,
    });
  }
  return moves.sort(
    (left, right) => Math.abs(right.movedBy) - Math.abs(left.movedBy),
  );
}

/* -------------------------------------------------------------------------- */
/* The narrative                                                               */
/* -------------------------------------------------------------------------- */

export interface NarrativeBeatTrace {
  readonly sceneKind: string;
  readonly chosenKey: string | null;
  readonly selectionReason: string | null;
  readonly candidateCount: number;
  readonly episodeCandidates: number;
  readonly bankCandidates: number;
  /** True when the winner continues a thread this life already had. */
  readonly continuesThreadKey: string | null;
  /**
   * Whether the adaptive model decided it, or whether the beat was simply due.
   *
   * Read from the selector's own reason rather than guessed: it reports
   * `cross-pressure` only when removing that term would change the winner.
   */
  readonly rankedByPlayerModel: boolean;
  /** One entry per satisfied requirement, each naming its own records. */
  readonly causalInputs: readonly {
    readonly requirement: string;
    readonly detail: string;
    readonly recordIds: readonly EntityId[];
  }[];
  /** The prose the player saw, split by where it came from. */
  readonly composedSentences: readonly {
    readonly sentence: string;
    readonly kind: string;
    readonly recordIds: readonly EntityId[];
    readonly note: string;
  }[];
  /** The scene's own prose, which is authored copy with slots filled. */
  readonly authoredProse: string;
}

/**
 * Why this beat, now, and what of it is composition rather than canon.
 *
 * The last part is the one the authority asks for by name: it wants to be able
 * to detect fabricated connective tissue. So the connective sentences come
 * back separately from the scene's own prose, each with the records that
 * justified it — and a sentence with no records behind it is visible as one.
 */
export function narrativeBeatTrace(
  world: World,
  personId: EntityId,
): NarrativeBeatTrace {
  const moment = projectStoryMoment(world, personId);
  const selection = traceStorySelection(world, personId);
  const previous = lastRecordedMoment(world, personId);
  const narration = composeConnectiveNarration({
    world,
    personId,
    since: previous.at,
    opening: previous.opening,
  });

  const causalInputs =
    moment.scene.kind === "episode"
      ? moment.scene.beat.causalInputs.map((entry) => ({
          requirement: describeRequirement(entry.requirement),
          detail: entry.detail,
          recordIds: entry.satisfiedBy.map((anchor) => anchor.recordId),
        }))
      : [];

  return {
    sceneKind: moment.scene.kind,
    chosenKey: selection.chosenKey,
    selectionReason: selection.reason,
    candidateCount: selection.candidateCount,
    episodeCandidates: selection.episodeCandidates,
    bankCandidates: selection.bankCandidates,
    continuesThreadKey: selection.continuedThreadKey,
    rankedByPlayerModel:
      selection.reason === "cross-pressure" ||
      selection.reason === "follows-from-history",
    causalInputs,
    composedSentences: narration.sentences.map((sentence, index) => {
      const source = narration.sources.find(
        (candidate) => candidate.sentenceIndex === index,
      );
      return {
        sentence,
        kind: source?.kind ?? "unknown",
        recordIds: (source?.anchors ?? []).map((anchor) => anchor.recordId),
        note: source?.note ?? "",
      };
    }),
    authoredProse: moment.scene.prose,
  };
}

function describeRequirement(requirement: {
  readonly kind: string;
  readonly [key: string]: unknown;
}): string {
  const detail = Object.entries(requirement)
    .filter(([key]) => key !== "kind")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  return detail.length > 0 ? `${requirement.kind} ${detail}` : requirement.kind;
}

/* -------------------------------------------------------------------------- */
/* The life, in numbers                                                        */
/* -------------------------------------------------------------------------- */

export interface LifeShapeReport {
  readonly personName: string;
  readonly age: number;
  readonly date: string;
  readonly threads: ReturnType<typeof threadPresence>;
  readonly threadTitles: readonly string[];
  readonly recurringPeople: readonly string[];
  readonly episodeInstances: readonly {
    readonly instanceKey: string;
    readonly stages: readonly string[];
  }[];
  readonly eligibleBeats: readonly string[];
  readonly modelSalience: readonly {
    readonly dimension: string;
    readonly mean: number;
    readonly fromSetup: number;
    readonly fromGameplay: number;
  }[];
}

/**
 * A whole life summarised, for comparing two of them.
 *
 * The authority asks for a way to see that two lives differ for causal reasons
 * rather than in their names. This is the shape a comparison reads: what
 * threads exist, who recurs, what episodes have run, what is currently
 * available, and what the model has come to think.
 */
export function lifeShapeReport(
  world: World,
  personId: EntityId,
): LifeShapeReport {
  const person = world.people[personId];
  const threads = narrativeThreads(world, personId);
  const eligible = eligibleEpisodeBeats({
    world,
    personId,
    families: EPISODE_FAMILIES,
  });
  return {
    personName: person ? personName(person) : "",
    age: projectStoryMoment(world, personId).age,
    date: world.currentDate,
    threads: threadPresence(world, personId),
    threadTitles: threads.map(
      (thread) => `${thread.family}:${thread.title} [${thread.standing}]`,
    ),
    recurringPeople: recurringPeople(world, personId).map(
      (entry) => `${entry.name} (${entry.appearances})`,
    ),
    episodeInstances: episodeInstances(world, personId).map((instance) => ({
      instanceKey: instance.instanceKey,
      stages: instance.stageKeys,
    })),
    eligibleBeats: eligible.beats.map(
      (beat) => `${beat.episodeKey}/${beat.stageKey}`,
    ),
    modelSalience: auditPlayerModel(playerModelFor(world, personId))
      .filter((entry) => entry.weight > 0)
      .map((entry) => ({
        dimension: entry.dimension,
        mean: Number(entry.mean.toFixed(3)),
        fromSetup: entry.fromSetup,
        fromGameplay: entry.fromGameplay,
      })),
  };
}

/* -------------------------------------------------------------------------- */
/* Markdown, for pasting into a review                                         */
/* -------------------------------------------------------------------------- */

/**
 * The calibration report as text.
 *
 * Deterministic for a given world, so two runs of the same save produce
 * byte-identical output and a diff between two saves is a diff between two
 * calibrations rather than between two formatting passes.
 */
export function calibrationReportMarkdown(report: CalibrationReport): string {
  const lines: string[] = [];
  lines.push(`# Calibration — ${report.bankVersion}`);
  lines.push("");
  lines.push(`Path: ${report.path}. Questions asked: ${report.asked}.`);
  lines.push(
    `Stopped because: ${report.outcome.stopped}. Best remaining question was worth ${report.outcome.bestRemainingValue.toFixed(2)}.`,
  );
  lines.push(
    `Dimensions still carrying no observation: ${
      report.outcome.uncoveredDimensions.length === 0
        ? "none"
        : report.outcome.uncoveredDimensions.join(", ")
    }.`,
  );
  lines.push("");
  lines.push("## What each answer moved");
  lines.push("");
  for (const question of report.questions) {
    lines.push(
      `${question.ordinal}. \`${question.questionKey}\` (${question.register}) — chose \`${question.chosen ?? "declined"}\`, selected by ${question.reason}`,
    );
    if (question.runnerUpKey !== null) {
      lines.push(`   - next best was \`${question.runnerUpKey}\``);
    }
    for (const move of question.moved) {
      lines.push(
        `   - ${move.dimension}: ${move.before.toFixed(3)} → ${move.after.toFixed(3)} (weight ${move.weightBefore.toFixed(2)} → ${move.weightAfter.toFixed(2)})`,
      );
    }
  }
  lines.push("");
  lines.push("## Explanations still level");
  lines.push("");
  if (report.unresolved.length === 0) {
    lines.push("None: every declared ambiguity has been separated.");
  }
  for (const entry of report.unresolved) {
    lines.push(
      `- \`${entry.key}\` — openness ${entry.openness.toFixed(2)}. ${entry.note}`,
    );
  }
  return lines.join("\n");
}

/** The beat trace as text, for pasting into a review. */
export function narrativeBeatTraceMarkdown(trace: NarrativeBeatTrace): string {
  const lines: string[] = [];
  lines.push(`# Beat — ${trace.sceneKind}`);
  lines.push("");
  lines.push(
    `Chosen: \`${trace.chosenKey ?? "none"}\` from ${trace.candidateCount} candidates (${trace.episodeCandidates} composed, ${trace.bankCandidates} authored).`,
  );
  lines.push(`Selector's reason: ${trace.selectionReason ?? "none"}.`);
  lines.push(
    trace.rankedByPlayerModel
      ? "The player model decided the ranking."
      : "The beat was causally due; the player model did not decide it.",
  );
  lines.push(
    `Continues thread: ${trace.continuesThreadKey ?? "none — this beat opens something"}.`,
  );
  lines.push("");
  lines.push("## What made it eligible");
  lines.push("");
  if (trace.causalInputs.length === 0) {
    lines.push("Not a composed beat, so it has no requirement trace.");
  }
  for (const input of trace.causalInputs) {
    lines.push(`- \`${input.requirement}\` — ${input.detail}`);
    if (input.recordIds.length > 0) {
      lines.push(`  - records: ${input.recordIds.join(", ")}`);
    } else {
      lines.push("  - records: none (a negative or age requirement)");
    }
  }
  lines.push("");
  lines.push("## Composition against canon");
  lines.push("");
  lines.push(`Authored scene copy: ${trace.authoredProse || "(none)"}`);
  for (const sentence of trace.composedSentences) {
    lines.push(
      `- Composed (${sentence.kind}): ${sentence.sentence} — ${
        sentence.recordIds.length > 0
          ? `from ${sentence.recordIds.join(", ")}`
          : "date arithmetic only, no record"
      }`,
    );
  }
  return lines.join("\n");
}
