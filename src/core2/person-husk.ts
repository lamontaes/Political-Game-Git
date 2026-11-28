import type { HuskInput, PersonInput } from "./types";

/** What a husk is made from: a person's name, place, birth and ties, as any engine holds them. */
type HuskSource = Pick<
  PersonInput,
  "id" | "givenName" | "familyName" | "placeId" | "source"
> &
  Partial<
    Pick<PersonInput, "countyId" | "looks" | "said" | "birthDate" | "familyIds">
  >;

/**
 * A named face with no life behind it yet: a relative or colleague a person
 * with a full life knows but nobody has met (the ladder's lowest named rung).
 * It keeps the name, the place, the look, what they said, the birth and the
 * family, so opening them later builds the same person every time. The one
 * maker for the engines that hold such a person.
 */
export function huskOf(person: HuskSource): HuskInput {
  return {
    id: person.id,
    givenName: person.givenName,
    familyName: person.familyName,
    placeId: person.placeId,
    ...(person.countyId ? { countyId: person.countyId } : {}),
    looks: { ...(person.looks ?? {}) },
    said: [...(person.said ?? [])],
    birthDate: person.birthDate,
    familyIds: [...(person.familyIds ?? [])],
    source: person.source,
  };
}
