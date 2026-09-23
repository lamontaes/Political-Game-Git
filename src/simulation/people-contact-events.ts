/**
 * The event type a meeting request is recorded under. It lives in its own
 * module so readers such as relationship-absence can name it without
 * importing people-contact, whose transition registry is built at load time
 * and would otherwise close an import cycle through future-transitions.
 */
export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
