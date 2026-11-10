/**
 * The name of the event the housing engine records when a household's housing
 * status changes (housed, doubled up, sheltered, unsheltered). It lives in a
 * file that imports nothing, so an engine that lists the events it listens to
 * while it loads never meets the housing engine half loaded.
 */
export const HOUSING_STATUS_EVENT = "housing.status-changed";
