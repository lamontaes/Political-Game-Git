import {
  addDays,
  candidacyEligibility,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  homeStateUsps,
  makeCurrencyCode,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import type {
  CandidacyBlock,
  EntityId,
  StateExecutiveIdentity,
  World,
} from "../simulation";

export {
  qualifyForStateExecutiveTerm,
  stateExecutiveEntryStatus,
} from "../simulation";

export interface StateExecutiveCandidacy {
  readonly identity: StateExecutiveIdentity;
  readonly jurisdictionId: EntityId;
  readonly eligible: boolean;
  readonly blocks: readonly CandidacyBlock[];
}

/**
 * The executive office of the state this person lives in, and whether the
 * facts RULES has admitted let them stand for it today. Reading is free and
 * writes nothing.
 */
export function stateExecutiveCandidacyForPerson(
  world: World,
  personId: EntityId,
  alreadyACandidate = false,
): StateExecutiveCandidacy | null {
  const usps = homeStateUsps(world, personId);
  const identity = usps ? stateExecutiveIdentity(usps) : null;
  const jurisdiction = identity
    ? stateJurisdictionForKey(identity.jurisdictionKey)
    : null;
  if (!identity || !jurisdiction) return null;
  const eligibility = candidacyEligibility(world, {
    personId,
    jurisdictionId: jurisdiction.id,
    officeKey: identity.officeKey,
    alreadyACandidate,
  });
  return {
    identity,
    jurisdictionId: jurisdiction.id,
    eligible: eligibility.eligible,
    blocks: eligibility.blocks,
  };
}

/**
 * Standing for governor of one's own state, through the same campaign and
 * contest route a legislative filing uses. The contest is statewide, so it is
 * run from the state's jurisdiction; the candidate still lives where they live.
 */
export function fileForStateExecutiveOffice(
  world: World,
  personId: EntityId,
): World {
  const person = world.people[personId];
  if (!person) throw new Error("This character is not in the world.");
  const candidacy = stateExecutiveCandidacyForPerson(world, personId);
  if (!candidacy)
    throw new Error("This character does not live in one of the fifty states.");
  const stableKey = `candidacy:${personId}:${world.currentDate}`;
  const registered = ensureStateJurisdiction(
    world,
    candidacy.identity.stateUsps,
  );
  const opponents = ensureCampaignOpponents(registered, {
    stableKey,
    jurisdictionId: candidacy.jurisdictionId,
    count: 1,
    excludePersonIds: [personId],
  });
  return fileCampaign(opponents.world, {
    stableKey,
    candidatePersonId: personId,
    jurisdictionId: candidacy.jurisdictionId,
    officeKey: candidacy.identity.officeKey,
    districtBinding: null,
    // The same authored campaign calendar a legislative filing uses; it is not
    // an admitted real election date, and the term that follows is dated only
    // by admitted term facts.
    electionDate: addDays(world.currentDate, 28),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `${person.familyName} for ${candidacy.identity.displayName}`,
    donorPoolName: "People who might give",
    advertisingVendorName: "Whoever sells the advertising",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  }).world;
}
