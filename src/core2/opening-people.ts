/**
 * The opening's people: names, birth, home and household, written as the
 * draft's person records (`opening-draft.ts`). Each person's id, generation
 * key, facts and appearance are derived exactly as the old engine's
 * character-history writer derived them, so the opening builds the same
 * people by record id (`core-old-imports-opening-people`).
 *
 * What the old writer did that this one does not: it stamped a citizenship
 * status record nobody in the core read (the core's one citizenship engine is
 * `citizenship.ts`, read at the moment a law cares), and it re-validated the
 * whole world after every batch (bookkeeping, a debug switch in play).
 */
import { makeIsoDate } from "./kernel/dates";
import { createStableId } from "./kernel/ids";
import type { EntityId, IsoDate } from "./kernel/brands";
import {
  DEFAULT_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "./appearance";
import type {
  DraftPerson,
  DraftPersonFact,
  DraftPersonIdentity,
  OpeningDraft,
} from "./opening-draft";

export interface CharacterHistoryContextPersonInput {
  readonly stableKey: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly birthplaceJurisdictionId?: EntityId;
  /**
   * Gender and pronouns for somebody the world is inventing. Optional because
   * a person the record says nothing about is written down as saying nothing
   * rather than as neutral; generators supply one from their own seeded
   * stream (`person-identity.ts`).
   */
  readonly identity?: DraftPersonIdentity;
}

export function characterHistoryContextPersonId(
  draft: { readonly id: EntityId },
  stableKey: string,
): EntityId {
  return createStableId("person", `${draft.id}:life-context-v1:${stableKey}`);
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}

/** One person as the opening writes them; null when the draft already holds them. */
function buildPerson(
  draft: OpeningDraft,
  input: CharacterHistoryContextPersonInput,
): DraftPerson | null {
  assertNonEmpty(input.stableKey, "Context-person stable key");
  assertNonEmpty(input.givenName, "Context-person given name");
  assertNonEmpty(input.familyName, "Context-person family name");
  const birthDate = makeIsoDate(input.birthDate);
  if (birthDate > draft.currentDate)
    throw new Error("A context person cannot be born after the current date.");
  if (!draft.jurisdictions[input.homeJurisdictionId])
    throw new Error("A context person requires an existing home jurisdiction.");
  const birthplace = input.birthplaceJurisdictionId ?? input.homeJurisdictionId;
  if (!draft.jurisdictions[birthplace])
    throw new Error(
      "A context person requires an existing birthplace jurisdiction.",
    );
  const id = characterHistoryContextPersonId(draft, input.stableKey);
  if (draft.people[id]) return null;
  const fullName = `${input.givenName} ${input.familyName}`;
  const residenceAt = draft.currentDate;
  const facts: readonly DraftPersonFact[] = [
    {
      id: createStableId("fact", `${id}:birth-date`),
      stableKey: "birth-date",
      kind: "birth-date",
      occurredAt: birthDate,
      jurisdictionId: null,
      summary: `${fullName}'s birth date is established.`,
    },
    {
      id: createStableId("fact", `${id}:birthplace`),
      stableKey: "birthplace",
      kind: "birthplace",
      occurredAt: birthDate,
      jurisdictionId: birthplace,
      summary: `${fullName}'s birthplace is established.`,
    },
    {
      id: createStableId("fact", `${id}:residence:initial`),
      stableKey: "residence:initial",
      kind: "residence",
      occurredAt: residenceAt,
      endedAt: null,
      jurisdictionId: input.homeJurisdictionId,
      summary: `${fullName} resides in the recorded home jurisdiction.`,
    },
  ];
  return {
    id,
    generationKey: `life-context-v1:${input.stableKey}`,
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate,
    homeJurisdictionId: input.homeJurisdictionId,
    ...(input.identity === undefined ? {} : { identity: input.identity }),
    // The household has faces too: derived from the person's own id through
    // the one appearance writer, under the recipe an empty draft declares
    // (the default), so it is the same handle for the same person every time.
    appearance: derivePersonAppearance(
      id,
      DEFAULT_APPEARANCE_RECIPE_VERSION,
      undefined,
    ),
    establishedFacts: facts,
  };
}

/**
 * The opening's people, written into the draft in input order. An input the
 * draft already holds (the same stable key) is left as it is.
 */
export function createCharacterHistoryContextPeople(
  draft: OpeningDraft,
  inputs: readonly CharacterHistoryContextPersonInput[],
): OpeningDraft {
  for (const input of inputs) {
    const person = buildPerson(draft, input);
    if (!person) continue;
    draft.people[person.id] = person;
    draft.personOrder.push(person.id);
  }
  return draft;
}
