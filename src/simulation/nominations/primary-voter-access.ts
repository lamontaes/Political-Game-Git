import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };

/** The sourced access category, not a person's affiliation or registration. */
export function primaryVoterAccessFor(stateUsps: string): string | null {
  const key = stateUsps.toUpperCase();
  const place = Object.entries(nominationRules.places).find(
    ([placeKey]) => placeKey === (key.startsWith("US-") ? key : `US-${key}`),
  )?.[1];
  return place?.voterAccess ?? null;
}

/**
 * Party-ballot admission after the shared counter's ordinary voter admission.
 * Inputs must be actual registration and ballot-selection records. Public party
 * affiliation is not registration. A missing selection does not assign a voter
 * to a primary; the shared voter decision must choose their one ballot first.
 * Party-dependent and crossover rules retain their sourced category until the
 * required party invitation or registration-change record is supplied by its
 * existing producer. They never silently become an open or closed primary.
 */
export function primaryPartyBallotAdmission(
  stateUsps: string,
  primaryPartyId: string,
  registeredPartyId: string | null | undefined,
  selectedPrimaryPartyId: string | null | undefined,
): "eligible" | "ineligible" | "requires-record" {
  const access = primaryVoterAccessFor(stateUsps);
  if (access === null) return "requires-record";
  if (selectedPrimaryPartyId == null) return "requires-record";
  if (selectedPrimaryPartyId !== primaryPartyId) return "ineligible";
  switch (access) {
    case "Open":
      return "eligible";
    case "Closed":
      if (registeredPartyId === undefined) return "requires-record";
      return registeredPartyId === primaryPartyId ? "eligible" : "ineligible";
    case "Open to unaffiliated voters":
      if (registeredPartyId === undefined) return "requires-record";
      return registeredPartyId === null || registeredPartyId === primaryPartyId
        ? "eligible"
        : "ineligible";
    default:
      return "requires-record";
  }
}
