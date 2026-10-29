/** The same initial actor shape for admission and transient counted choices. No world writes. */
import { parameter } from "./parameters";
import { restingStress } from "./resting-stress";
import type { CoreState, PersonInput, PersonState } from "./types";

export function initialPersonState(
  core: CoreState,
  row: PersonInput,
  copyTraits = true,
): PersonState {
  const p = (key: string) => parameter(key, core.data.parameters);
  // Each person starts at their own resting stress, read from their situation.
  const resting = restingStress(core, row);
  return {
    ...row,
    traits: copyTraits ? { ...row.traits } : row.traits,
    familyIds: new Set(row.familyIds),
    knownIds: new Set(row.knownIds),
    lastActDate: core.date,
    lastContactDate: core.date,
    alive: true,
    actCount: p("zero"),
    actsByKind: new Map(),
    affect: {
      at: core.date,
      mood: p("moodBaseline"),
      stress: resting,
      moodBaseline: p("moodBaseline"),
      stressBaseline: resting,
    },
    needs: Object.fromEntries(
      core.data.needs.map((need) => [need.id, p("zero")]),
    ),
    goals: new Map(),
    drives: new Map(),
  };
}
