import type { CoreInput, PersonId } from "./types";

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
