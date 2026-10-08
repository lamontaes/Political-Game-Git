/** Keep the destination setting in the key when a neighborhood has no plate. */
export function locationKeyForJourney(
  destinationSetting: string,
  routeId: string,
): string {
  return destinationSetting === "neighborhood"
    ? `journey-to-neighborhood:${routeId}`
    : `journey:${routeId}`;
}

/** Keep legacy and non-neighborhood journeys on their existing main-street art. */
export function placeForJourneyLocationKey(locationKey: string): string | null {
  if (locationKey.startsWith("journey-to-neighborhood:")) return null;
  return locationKey.startsWith("journey:") ? "main-street" : null;
}
