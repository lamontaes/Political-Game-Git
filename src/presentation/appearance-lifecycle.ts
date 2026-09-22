import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  COHERENT_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";
import type { EntityId, PersonAppearance, World } from "../simulation/types";
import type { CharacterComponentLibrary } from "./character-components";
import { initializeFreshCandidateOutfits } from "./complete-outfit";
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";

/**
 * MODULAR ↔ PEOPLE appearance lifecycle (CRUNCH46 §04/§05).
 *
 * The supported modular bank draws adults only. A life stage is derived from
 * the birth date on read — never stored, never an event per birthday — and an
 * unsupported stage keeps the truthful initials treatment without blocking
 * family mechanics. Nothing here copies a relative's face or infers appearance
 * from a name, family or ancestry.
 */
export type AppearanceLifeStage = "child" | "adult" | "older";

export const ADULT_FIGURE_MIN_AGE = 18;
export const OLDER_ADULT_MIN_AGE = 65;

export interface AppearanceAgeState {
  readonly stage: AppearanceLifeStage;
  /** True only when the current bank can draw this person truthfully. */
  readonly supported: boolean;
  readonly reason?: string;
}

export function appearanceAgeState(
  person: { readonly birthDate?: string | null },
  onDate: string,
): AppearanceAgeState {
  if (!person.birthDate)
    return {
      stage: "adult",
      supported: false,
      reason: "No birth date is recorded, so no figure is drawn.",
    };
  let years: number;
  try {
    years = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(onDate));
  } catch {
    return {
      stage: "adult",
      supported: false,
      reason: "The recorded birth date is not a date.",
    };
  }
  if (years < ADULT_FIGURE_MIN_AGE)
    return {
      stage: "child",
      supported: false,
      reason:
        "Only adult figures are available; a child is shown by name and initials.",
    };
  return {
    stage: years >= OLDER_ADULT_MIN_AGE ? "older" : "adult",
    supported: true,
  };
}

/**
 * The common generator's appearance for a person PEOPLE has just added (an
 * explicit dated family event). Called once at creation. The seed comes from the
 * person's own id, so relatives never share a face. The pin is the library's
 * latest generation, so later library growth cannot redraw them. Returns
 * `undefined` in a checkout without the prepared bank; the caller then leaves
 * the appearance unset (initials).
 */
export function appearanceForNewPerson(
  world: World,
  personId: EntityId,
  context: {
    readonly birthDate: string;
    readonly lifeStage?: AppearanceLifeStage;
  },
  library: CharacterComponentLibrary,
): PersonAppearance | undefined {
  const person = world.people[personId];
  if (!person) throw new Error(`Unknown person '${personId}'.`);
  if (person.appearance)
    throw new Error(
      "This person already has an appearance; it is not rerolled.",
    );
  const base = derivePersonAppearance(
    personId,
    COHERENT_APPEARANCE_RECIPE_VERSION,
    library.catalogGeneration,
  );
  const stage =
    context.lifeStage ??
    appearanceAgeState({ birthDate: context.birthDate }, world.currentDate)
      .stage;
  // A child keeps the seeded identity only; no adult outfit is chosen for them.
  if (!PRIVATE_CANDIDATE_ART_AVAILABLE || stage === "child") return base;
  const single: World = {
    ...world,
    people: { ...world.people, [personId]: { ...person, appearance: base } },
    personOrder: [personId],
  };
  return initializeFreshCandidateOutfits(single, library, "complete-outfit-v2")
    .people[personId]!.appearance;
}
