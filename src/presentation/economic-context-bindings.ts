import type { BrowserEconomicGeographyBinding } from "./economic-context-browser";

/**
 * Exact, reviewed crosswalks from canonical playable places to provider codes.
 *
 * A binding is registered here only when each provider-native geography and
 * its relationship to the playable place are explicit. Callers never infer a
 * binding from a display name, state membership, or a nearby geography.
 */
export const LEXINGTON_ECONOMIC_BINDING: BrowserEconomicGeographyBinding = {
  bindingKey: "economic-context.lexington-ky.v2",
  placeKey: "lexington-fayette",
  placeLabel: "Lexington, Kentucky",
  beaAreas: [
    {
      geographyLevel: "county",
      geoFips: "21067",
      relationship: "same-jurisdiction",
    },
    {
      geographyLevel: "msa",
      geoFips: "30460",
      relationship: "containing-metro",
    },
    {
      geographyLevel: "state",
      geoFips: "21000",
      relationship: "containing-state",
    },
  ],
  lausAreaCodes: [
    { areaCode: "ST2100000000000", relationship: "containing-state" },
  ],
  hudFipsCodes: [
    { hudFipsCode: "2106799999", relationship: "same-jurisdiction" },
  ],
};

const BINDINGS_BY_PLACE = new Map<string, BrowserEconomicGeographyBinding>([
  [LEXINGTON_ECONOMIC_BINDING.placeKey, LEXINGTON_ECONOMIC_BINDING],
]);

export function economicContextBindingForPlace(
  placeKey: string,
): BrowserEconomicGeographyBinding | null {
  return BINDINGS_BY_PLACE.get(placeKey) ?? null;
}
