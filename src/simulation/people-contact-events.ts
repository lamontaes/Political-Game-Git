/**
 * The contact proposal event type, on its own so that readers of the record
 * (relationship fading among them) need not import the whole contact file,
 * which sits in the future-transition registry's import graph.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
