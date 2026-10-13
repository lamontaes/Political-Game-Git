/**
 * Encounters during play that come from other engines' records: a person who
 * starts a job meets their new workgroup on the first day (P15 part 5, M1).
 * The jobs engine records the start; this module only meets the coworkers.
 */
import { ENCOUNTERS, meetAtWork } from "../encounters";
import type { CoreModule } from "../types";

export const ENCOUNTERS_MODULE_ID = "encounters";

export const encountersModule: CoreModule = {
  id: ENCOUNTERS_MODULE_ID,
  eventKinds: [ENCOUNTERS.jobStartedEvent],
  onEvent(api, event) {
    if (event.kind !== ENCOUNTERS.jobStartedEvent) return;
    const [personId] = event.personIds;
    const person = personId ? api.state.people.get(personId) : undefined;
    if (!person?.jobId) return;
    meetAtWork(api, person.id, person.jobId, event.id);
  },
};
