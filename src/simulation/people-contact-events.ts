/**
 * The contact event types, in a module that imports nothing.
 *
 * `relationship-absence.ts` reads proposals by type. Importing the constant
 * from `people-contact.ts` pulled that module's future-transition registry into
 * `world-metrics`' import cycle, which built the registry before
 * `assertSemanticTransitionKey` existed and failed every file that imported
 * the simulation index first.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
