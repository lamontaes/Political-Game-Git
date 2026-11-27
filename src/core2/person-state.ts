/** The same initial actor shape for admission and transient counted choices. No world writes. */
import { parameter } from "./parameters";
import { restingStress } from "./resting-stress";
import type { CoreState, PersonInput, PersonState } from "./types";

export function initialPersonState(
  core: CoreState,
  row: PersonInput,
  copyTraits = true,
): PersonState {
  // Each person starts at their own resting stress, read from their situation.
  const resting = restingStress(core, row);
  const table = core.data.parameters,
    zero = parameter("zero", table),
    moodBaseline = parameter("moodBaseline", table);
  const needs: Record<string, number> = {};
  for (const need of core.data.needs) needs[need.id] = zero;
  return {
    ...row,
    traits: copyTraits ? { ...row.traits } : row.traits,
    familyIds: new Set(row.familyIds),
    knownIds: new Set(row.knownIds),
    lastActDate: core.date,
    lastContactDate: core.date,
    alive: true,
    actCount: zero,
    actsByKind: new Map(),
    affect: {
      at: core.date,
      mood: moodBaseline,
      stress: resting,
      moodBaseline,
      stressBaseline: resting,
    },
    needs,
    goals: new Map(),
    drives: new Map(),
  };
}

/** A person's job ended: the job they hold now is cleared when it is the one that ended. The people engine's write, for the jobs engine's and the finance engine's closures. */
export function clearEndedJob(person: PersonState, jobId: string): void {
  if (person.jobId === jobId) delete person.jobId;
}

/** A work commitment ended: the person's goal of keeping it goes. The people engine's write. */
export function dropWorkGoal(person: PersonState, commitmentId: string): void {
  person.goals.delete(`work:${commitmentId}`);
}

/** A person's act is recorded in their own row: the last choice and its reason, how many acts they have made and how many of each kind. The people engine's write, for the work engine's attendance. */
export function recordActChosen(
  person: PersonState,
  act: {
    readonly lastChoice: string;
    readonly lastReason: string;
    readonly actCount: number;
    readonly actsByKind: PersonState["actsByKind"];
  },
): void {
  person.lastChoice = act.lastChoice;
  person.lastReason = act.lastReason;
  person.actCount = act.actCount;
  person.actsByKind = act.actsByKind;
}
