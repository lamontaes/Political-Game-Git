/**
 * The names the contact records are written under.
 *
 * Kept in a file that imports nothing, so a reader of contact history (such as
 * `relationship-absence.ts`) can name these records without importing the
 * contact engine. Importing the engine from there closed an import cycle
 * through `queries.ts`, and under the dev tooling's module loader that cycle
 * crashed any script that loaded the whole simulation.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
export const CONTACT_ACCEPTED_EVENT = "life.meeting-accepted";
export const CONTACT_COUNTERED_EVENT = "life.meeting-counter-offered";
export const CONTACT_DECLINED_EVENT = "life.meeting-declined";
export const CONTACT_ANSWER_TRANSITION_KEY = "people:contact-answer";
export const CONTACT_TAG = "contact.v1";
export const CONTACT_LOCATION_KEY = "people-contact:meeting";
export const CONTACT_CALLED_OFF_EVENT = "life.meeting-called-off";
