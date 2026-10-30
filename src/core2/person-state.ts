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
