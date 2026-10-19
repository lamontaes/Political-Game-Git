import { initializePersonCitizenship } from "../simulation/citizenship-creation";
import { carryPeopleReadIndexesAfterAppend } from "../simulation/history-index";
import { makeIsoDate } from "./kernel/dates";
import { createStableId } from "./kernel/ids";
import { startHouseholdMembership } from "../simulation/life";
import {
  householdLocationAt,
  householdMembershipsAt,
} from "../simulation/life-queries";
import {
  appearanceLineageFromPeople,
  derivePersonAppearance,
} from "../simulation/person-appearance";
import { assertWorldIntegrity } from "../simulation/world";
import type {
  EntityId,
  IsoDate,
  Person,
  PersonFact,
  PersonIdentity,
  World,
} from "../simulation/types";

/** The opening's people: names, birth, home and household, written as core person records. */

export interface CharacterHistoryContextPersonInput {
  readonly stableKey: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly birthplaceJurisdictionId?: EntityId;
  /** Actual supplied household evidence; current home alone does not establish an earlier residence. */
  readonly residence?: {
    readonly householdId: EntityId;
    readonly establishedAt: IsoDate;
  };
  /**
   * Gender and pronouns for somebody the world is inventing.
   *
   * Optional because the callers that had no opinion before this existed still
   * have none, and a person the record says nothing about is written down as
   * saying nothing rather than as neutral. Callers that generate people are
   * expected to supply one from their own seeded stream — see
   * `person-identity.ts` for why generating is not the same as inferring.
   */
  readonly identity?: PersonIdentity;
}

export function characterHistoryContextPersonId(
  world: World,
  stableKey: string,
): EntityId {
  return createStableId("person", `${world.id}:life-context-v1:${stableKey}`);
}

/** Lineage follows immutable people tables; external edits get a fresh read. */
const CONTEXT_LINEAGES = new WeakMap<
  World["people"],
  ReturnType<typeof appearanceLineageFromPeople>
>();

function contextAppearanceLineage(world: World) {
  const cached = CONTEXT_LINEAGES.get(world.people);
  if (cached) return cached;
  const lineage = appearanceLineageFromPeople(Object.values(world.people));
  CONTEXT_LINEAGES.set(world.people, lineage);
  return lineage;
}

/** Creates the smallest persistent social context person through one validated writer. */
function buildCharacterHistoryContextPerson(
  world: World,
  input: CharacterHistoryContextPersonInput,
  lineage: ReturnType<typeof appearanceLineageFromPeople>,
): Person | null {
  assertNonEmpty(input.stableKey, "Context-person stable key");
  assertNonEmpty(input.givenName, "Context-person given name");
  assertNonEmpty(input.familyName, "Context-person family name");
  const birthDate = makeIsoDate(input.birthDate);
  if (birthDate > world.currentDate) {
    throw new Error("A context person cannot be born after the current date.");
  }
  if (!world.jurisdictions[input.homeJurisdictionId]) {
    throw new Error("A context person requires an existing home jurisdiction.");
  }
  const residenceAt = makeIsoDate(
    input.residence?.establishedAt ?? world.currentDate,
  );
  if (residenceAt < birthDate || residenceAt > world.currentDate)
    throw new Error(
      "Context residence must fall between birth and the current date.",
    );
  if (
    input.residence &&
    householdLocationAt(world, input.residence.householdId, {
      asOfDate: residenceAt,
      historySequenceExclusive: world.history.nextSequence,
    })?.jurisdictionId !== input.homeJurisdictionId
  )
    throw new Error(
      "Context residence requires the supplied household's dated home.",
    );
  const birthplace = input.birthplaceJurisdictionId ?? input.homeJurisdictionId;
  if (!world.jurisdictions[birthplace]) {
    throw new Error(
      "A context person requires an existing birthplace jurisdiction.",
    );
  }
  const id = characterHistoryContextPersonId(world, input.stableKey);
  if (world.people[id]) return null;
  const fullName = `${input.givenName} ${input.familyName}`;
  const provenance = {
    method: "manual" as const,
    sourceEventId: null,
    note: "Character-history bounded context population.",
  };
  const facts: readonly PersonFact[] = [
    {
      id: createStableId("fact", `${id}:birth-date`),
      stableKey: "birth-date",
      kind: "birth-date",
      occurredAt: birthDate,
      jurisdictionId: null,
      summary: `${fullName}'s birth date is established.`,
      provenance,
    },
    {
      id: createStableId("fact", `${id}:birthplace`),
      stableKey: "birthplace",
      kind: "birthplace",
      occurredAt: birthDate,
      jurisdictionId: birthplace,
      summary: `${fullName}'s birthplace is established.`,
      provenance,
    },
    {
      id: createStableId("fact", `${id}:residence:initial`),
      stableKey: "residence:initial",
      kind: "residence",
      occurredAt: residenceAt,
      endedAt: null,
      jurisdictionId: input.homeJurisdictionId,
      summary: `${fullName} resides in the recorded home jurisdiction.`,
      provenance,
    },
  ];
  const person: Person = {
    id,
    generationKey: `life-context-v1:${input.stableKey}`,
    givenName: input.givenName,
    familyName: input.familyName,
    birthDate,
    homeJurisdictionId: input.homeJurisdictionId,
    ...(input.identity === undefined ? {} : { identity: input.identity }),
    detailLevel: "lightweight",
    /*
     * The household has faces too.
     *
     * `createLightweightPerson` and `createStartingPerson` both derive an
     * appearance; this writer did not, and it is the one that makes the people
     * a life is written around — the guardian, the parent, the sibling. So the
     * player got an appearance and everyone they live with got none, and
     * `resolvePersonPortrait` refused them at its very first check with
     * `appearance-unassigned`. On screen that is initials, and it looks exactly
     * like missing art. It is not: nothing had been asked to draw them.
     *
     * Derived from the person's own id through the same canonical writer, so it
     * is deterministic, stable across saves and reloads, and identical for the
     * same person every time. No seed is chosen here, no demographic is
     * asserted, and nobody is rerolled: an appearance is a stable handle for a
     * renderer, not a claim about who this person is.
     *
     * The recipe follows the PEOPLE already in the world rather than a moving
     * default or "production means v2". A life created under v1 keeps a v1
     * household; a life declared under v2 keeps a v2 household. Mixed stamps
     * fail closed to the default recipe.
     */
    appearance: derivePersonAppearance(
      id,
      lineage.recipeVersion,
      lineage.catalogGeneration,
    ),
    establishedFacts: facts,
  };
  return initializePersonCitizenship(person, world.seed, world.currentDate);
}

export function createCharacterHistoryContextPerson(
  world: World,
  input: CharacterHistoryContextPersonInput,
): World {
  const person = buildCharacterHistoryContextPerson(
    world,
    input,
    contextAppearanceLineage(world),
  );
  if (!person) return admitContextResidences(world, [input]);
  const next: World = {
    ...world,
    people: { ...world.people, [person.id]: person },
    personOrder: [...world.personOrder, person.id],
  };
  const admitted = admitContextResidences(next, [input]);
  assertWorldIntegrity(admitted);
  return admitted;
}

/**
 * The same writer for many people at once, for an opening that seats a whole
 * public body. Each input is validated exactly as the single writer does and
 * receives the lineage the world already declares; adding people stamped with
 * that lineage cannot change it, so it is read once. Integrity is asserted
 * once over the result instead of once per person.
 */
export function createCharacterHistoryContextPeople(
  world: World,
  inputs: readonly CharacterHistoryContextPersonInput[],
): World {
  if (inputs.length === 0) return world;
  const lineage = contextAppearanceLineage(world);
  let people: Record<EntityId, Person> | undefined;
  let personOrder: EntityId[] | undefined;
  let probe = world;
  for (const input of inputs) {
    const person = buildCharacterHistoryContextPerson(probe, input, lineage);
    if (!person) continue;
    // Existing inputs still pass the same validation, but need no table copy.
    if (!people) {
      people = {};
      // Preserve the table's own key order, including after a save reload.
      // An explicit copy avoids V8's slower spread for this large dictionary.
      for (const id of Object.keys(world.people) as EntityId[])
        people[id] = world.people[id]!;
      personOrder = [...world.personOrder];
      probe = { ...world, people };
    }
    people[person.id] = person;
    personOrder!.push(person.id);
  }
  if (!people || !personOrder) return admitContextResidences(world, inputs);
  const next: World = { ...world, people, personOrder };
  // Appended people carry this exact lineage, so they cannot change it.
  CONTEXT_LINEAGES.set(people, lineage);
  carryPeopleReadIndexesAfterAppend(world, next);
  const admitted = admitContextResidences(next, inputs);
  assertWorldIntegrity(admitted);
  return admitted;
}

function admitContextResidences(
  world: World,
  inputs: readonly CharacterHistoryContextPersonInput[],
): World {
  let next = world;
  for (const input of inputs) {
    if (!input.residence) continue;
    const personId = characterHistoryContextPersonId(world, input.stableKey);
    if (
      householdMembershipsAt(next, personId, {
        asOfDate: input.residence.establishedAt,
        historySequenceExclusive: next.history.nextSequence,
      }).some(
        (membership) =>
          membership.household.id === input.residence!.householdId,
      )
    )
      continue;
    next = startHouseholdMembership(next, {
      stableKey: `${input.stableKey}:residence:initial`,
      personId,
      householdId: input.residence.householdId,
      startedAt: input.residence.establishedAt,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: {
        kind: "generated",
        generatorKey: `life-context-v1:${input.stableKey}`,
      },
    });
  }
  return next;
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
