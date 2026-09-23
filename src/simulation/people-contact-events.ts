/**
 * The event type a contact proposal is recorded under, in a module of its
 * own. `relationship-absence.ts` reads it, and importing it from
 * `people-contact.ts` closed a load-order loop (queries ->
 * relationship-standing -> relationship-absence -> people-contact ->
 * future-transitions -> world-metrics) that left world-metrics uninitialized
 * when people-contact built its handler registry.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
