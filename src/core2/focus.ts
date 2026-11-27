import type { CoreInput, CoreState, PersonId } from "./types";

/** Scheduling/trace scope uses recorded links; this grants no actor knowledge. */
export function initialFocusPeople(input: CoreInput): Set<PersonId> {
  const focus = new Set(input.focusPersonIds);
  const player = input.people.find((person) => person.id === input.playerId);
  if (!player) return focus;
  focus.add(player.id);
  for (const id of [...player.familyIds, ...player.knownIds]) focus.add(id);
  const household = input.households.find(
    (row) => row.id === player.householdId,
  );
  for (const id of household?.memberIds ?? []) focus.add(id);
  const job = input.jobs.find(
    (row) => row.id === player.jobId && row.personId === player.id,
  );
  if (job)
    for (const coworker of input.jobs)
      if (coworker.organizationId === job.organizationId)
        focus.add(coworker.personId);
  return focus;
}

/**
 * Put a person in the world's focus (the core's own set: each act from now on
 * keeps every option's reasons, and the person has the daily schedule the
 * player's circle has). True when they were not in it. Dev mode's follow
 * calls this, not the set (CTO, Nov 27, 7:39 a.m.: one door for the focus).
 */
export function putInFocus(core: CoreState, personId: PersonId): boolean {
  if (core.focusPersonIds.has(personId)) return false;
  core.focusPersonIds.add(personId);
  return true;
}

/** Take a person out of the world's focus. True when they were in it. */
export function takeOutOfFocus(core: CoreState, personId: PersonId): boolean {
  return core.focusPersonIds.delete(personId);
}
