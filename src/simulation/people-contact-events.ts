/**
 * Event type names for arranged contact, in a module that imports nothing.
 *
 * `relationship-absence.ts` reads the proposal type, and `queries.ts` reads
 * `relationship-absence.ts`; importing the name from `people-contact.ts` closed
 * an import cycle that left the future-transition registry uninitialised when
 * `people-contact.ts` built its handlers at load.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
