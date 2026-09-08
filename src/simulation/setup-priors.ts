import { canonicalJson } from "./canonical-json";
import type {
  SetupAnswerRecord,
  SetupPriorStore,
  SetupQuestionnairePath,
  World,
} from "./types";

/**
 * What the player answered before the world began, kept out of the world's
 * history on purpose.
 *
 * These answers are not events. Nobody in the world said them, nobody heard
 * them, and no biography follows from them. They are the player telling the
 * game what kind of situations are worth putting in front of them, and the
 * settled semantics are emphatic about the consequence: a setup answer creates
 * no `HistoricalEvent`, no memory, no personal value, no personality tendency,
 * no belief and no party.
 *
 * They still have to survive a save, because a life that forgets what it was
 * calibrated on stops being the same life on reload. So they live in one
 * declared, optional, non-diegetic corner of the world: read by the adaptive
 * layer, ignored by every canonical query, and visible in the file as exactly
 * what they are.
 *
 * The field is optional, which is what keeps every world written before this
 * existed readable without a format change. A world without it has no priors,
 * which is the truth about those worlds.
 */

/** Bumped when the shape of what is persisted changes. */
export const SETUP_PRIOR_STORE_VERSION = 1;

/**
 * A skip is recorded rather than dropped: the ordinal still advances, the item
 * is not asked again, and no dimension is touched. "They declined to answer"
 * and "they were never asked" are different facts about a calibration, and the
 * trail keeps both.
 */
export type {
  SetupAnswerRecord,
  SetupPriorStore,
  SetupQuestionnairePath,
} from "./types";

export function createSetupPriorStore(
  path: SetupQuestionnairePath,
  bankVersion: string,
  answers: readonly SetupAnswerRecord[] = [],
): SetupPriorStore {
  return {
    version: SETUP_PRIOR_STORE_VERSION,
    path,
    bankVersion,
    answers: answers.map((answer) => ({ ...answer })),
  };
}

export const EMPTY_SETUP_PRIORS: SetupPriorStore = createSetupPriorStore(
  "skipped",
  "none",
  [],
);

export function setupPriorsOf(world: World): SetupPriorStore {
  return world.setupPriors ?? EMPTY_SETUP_PRIORS;
}

export function hasSetupPriors(world: World): boolean {
  return (world.setupPriors?.answers.length ?? 0) > 0;
}

/**
 * Puts the answers in the world.
 *
 * Nothing else in the engine may write here, and nothing here writes anywhere
 * else. That is the whole containment: one field, one writer, no reach into
 * canonical history.
 */
export function attachSetupPriors(
  world: World,
  priors: SetupPriorStore,
): World {
  assertSetupPriorIntegrity(priors);
  return { ...world, setupPriors: clonePriors(priors) };
}

export function clonePriors(priors: SetupPriorStore): SetupPriorStore {
  return {
    version: priors.version,
    path: priors.path,
    bankVersion: priors.bankVersion,
    answers: priors.answers.map((answer) => ({ ...answer })),
  };
}

const PATHS: readonly SetupQuestionnairePath[] = ["skipped", "short", "deep"];

export function assertSetupPriorIntegrity(priors: SetupPriorStore): void {
  if (priors.version !== SETUP_PRIOR_STORE_VERSION) {
    throw new Error(
      `Unsupported setup-prior store version: ${String(priors.version)}`,
    );
  }
  if (!PATHS.includes(priors.path)) {
    throw new Error(`Unknown questionnaire path: ${String(priors.path)}`);
  }
  if (typeof priors.bankVersion !== "string" || priors.bankVersion === "") {
    throw new Error("Setup priors must name the bank they were given against.");
  }
  const seen = new Set<string>();
  priors.answers.forEach((answer, index) => {
    if (answer.ordinal !== index + 1) {
      throw new Error(
        "Setup answers must be a contiguous sequence starting at one.",
      );
    }
    if (typeof answer.questionKey !== "string" || answer.questionKey === "") {
      throw new Error("A setup answer must name its question.");
    }
    if (seen.has(answer.questionKey)) {
      throw new Error(
        `A setup question was asked twice: ${answer.questionKey}`,
      );
    }
    seen.add(answer.questionKey);
    if (answer.choiceId !== null && typeof answer.choiceId !== "string") {
      throw new Error("A setup answer is a choice key or an explicit skip.");
    }
  });
}

/**
 * The priors as one canonical string, for the replay descriptor.
 *
 * Kept apart from the world-identity encoding on purpose. `worldSeedFor` runs
 * while the calibration is still being answered, so a seed that moved with the
 * answers would reshuffle the remaining questions under the player and break
 * replay; that is why this encoding is separate and why it stays separate.
 *
 * Packet 77 narrowed the older rule that sat here. Answers may now shape the
 * household the generator builds, because a normal start generates the family
 * rather than letting the player author it. What they may still never do is
 * write a canonical fact, and the influence is not this encoding: it is the two
 * bounded leans in `setup-generation-inputs.ts`, which are the whole of what
 * reaches generation.
 */
export function canonicalPriorEncoding(priors: SetupPriorStore): string {
  return canonicalJson({
    v: priors.version,
    path: priors.path,
    bank: priors.bankVersion,
    answers: priors.answers.map((answer) => [
      answer.ordinal,
      answer.questionKey,
      answer.choiceId,
    ]),
  });
}

export function decodePriorEncoding(value: unknown): SetupPriorStore | null {
  if (value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.v !== SETUP_PRIOR_STORE_VERSION) return null;
  if (typeof record.bank !== "string" || record.bank === "") return null;
  if (!PATHS.includes(record.path as SetupQuestionnairePath)) return null;
  if (!Array.isArray(record.answers)) return null;
  const answers: SetupAnswerRecord[] = [];
  for (const entry of record.answers) {
    if (!Array.isArray(entry) || entry.length !== 3) return null;
    const [ordinal, questionKey, choiceId] = entry as readonly unknown[];
    if (!Number.isSafeInteger(ordinal) || (ordinal as number) < 1) return null;
    if (typeof questionKey !== "string" || questionKey === "") return null;
    if (choiceId !== null && typeof choiceId !== "string") return null;
    answers.push({
      ordinal: ordinal as number,
      questionKey,
      choiceId: choiceId as string | null,
    });
  }
  const priors = createSetupPriorStore(
    record.path as SetupQuestionnairePath,
    record.bank,
    answers,
  );
  try {
    assertSetupPriorIntegrity(priors);
  } catch {
    return null;
  }
  return priors;
}
