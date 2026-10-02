import {
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "../life-places";
import { isEligibleVoterIn } from "../issue-record";
import { publicPartyAffiliation } from "../living-world/congress";
import { partyUnits } from "../living-world/party-registry";
import type { World } from "../types";
import {
  primaryVoterAccessFor,
  recordedPrimaryPartyRegistrationAt,
  recordPrimaryPartyRegistration,
} from "./primary-voter-access";

/** CTO's opening contract: an existing recorded affiliation initializes a
 * distinct registration receipt where party access needs registration.
 * This opening writer is not a continuing inference from public identity.
 * No affiliation record means no invented enrollment or unaffiliated status.
 */
export function recordOpeningPrimaryRegistrations(world: World): World {
  const parties = new Map(
    partyUnits(world).map((unit) => [unit.organizationId, unit.partyKey]),
  );
  let next = world;
  for (const personId of world.personOrder) {
    const home =
      world.jurisdictions[world.people[personId]!.homeJurisdictionId];
    const stateKey = home ? stateKeyForJurisdiction(home) : null;
    if (!stateKey) continue;
    const state = stateJurisdictionForKey(stateKey);
    if (!state || !world.jurisdictions[state.id]) continue;
    const access = primaryVoterAccessFor(stateKey);
    if (
      !access ||
      access === "Open" ||
      ![
        "Closed",
        "Open to unaffiliated voters",
        "Partially closed",
        "Partially open",
      ].includes(access)
    )
      continue;
    if (!isEligibleVoterIn(world, personId, state.id, world.currentDate))
      continue;
    const input = {
      personId,
      jurisdictionId: state.id,
      electionDate: world.currentDate,
    };
    if (recordedPrimaryPartyRegistrationAt(world, input) !== undefined)
      continue;
    const affiliation = publicPartyAffiliation(world, personId);
    const party = affiliation ? parties.get(affiliation) : undefined;
    if (!party) continue;
    next = recordPrimaryPartyRegistration(next, {
      stableKey: `primary-access-opening:${state.id}:${personId}`,
      personId,
      jurisdictionId: state.id,
      registeredPartyId: party,
    });
  }
  return next;
}
