/** Adds the controlled person to the render roster only when scene records
 * identify them as present. The story's supporting-person list stays intact. */
export function scenePeopleWithControlledPerson<
  T extends { readonly personId: string },
  P extends T,
>(
  people: readonly T[],
  controlledPerson: P | null,
  recordedPresent: boolean,
): readonly (T | P)[] {
  if (
    !controlledPerson ||
    !recordedPresent ||
    people.some((person) => person.personId === controlledPerson.personId)
  )
    return people;
  return [...people, controlledPerson];
}
