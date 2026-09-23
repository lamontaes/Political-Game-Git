/**
 * The event names a contact request writes, in a file that imports nothing.
 *
 * `relationship-absence.ts` reads contact history, and `people-contact.ts`
 * builds a transition registry when it loads. Importing a name from the second
 * into the first put the registry's construction inside an import cycle, and
 * any test that reached `relationship-absence.ts` first failed to load.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
export const CONTACT_ACCEPTED_EVENT = "life.meeting-accepted";
export const CONTACT_COUNTERED_EVENT = "life.meeting-counter-offered";
export const CONTACT_DECLINED_EVENT = "life.meeting-declined";
