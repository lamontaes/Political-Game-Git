import { districtIdentityCatalog } from "../../src/districts/catalog";
import { districtMembershipFromCanonicalHome } from "../../src/districts/query";
import {
  addDays,
  campaignForCandidate,
  candidacyEligibility,
  candidacyPackForJurisdiction,
  electionContestById,
  legislativeTermForRelationship,
  searchLifePlaces,
  stateJurisdictionForKey,
  workRelationshipHistoryForPerson,
} from "../../src/simulation";
import type {
  DistrictSeatBinding,
  EntityId,
  World,
} from "../../src/simulation";
import {
  fileForOffice,
  projectCampaign,
} from "../../src/presentation/campaign-projection";
import { resolveLegislativeFilingEntry } from "../../src/presentation/legislative-filing-entry";
import {
  adultLifeAt,
  runToElection,
  suppliedWin,
} from "./state-executive-entry";
import { moveToTermDate } from "./recorded-legislative-term";

export type FundedServiceEntryState = "KY" | "MN" | "NV";

export interface OrdinaryStateHouseEntryFixture {
  readonly world: World;
  readonly personId: EntityId;
  readonly stateUsps: FundedServiceEntryState;
  readonly homeJurisdictionId: EntityId;
  readonly governingJurisdictionId: EntityId;
  readonly officeKey: string;
  readonly districtBinding: DistrictSeatBinding;
  readonly contestId: EntityId;
}

/**
 * A normally generated adult resident files for the lower chamber, receives a
 * deterministic fictional test result through the campaign transition, enters
 * the term written by that result, and reaches the same member filing gate the
 * player uses. The bound district comes from the canonical whole-place join;
 * it does not establish a legal district-residency requirement.
 */
export function ordinaryStateHouseFilingEntry(
  stateUsps: FundedServiceEntryState,
): OrdinaryStateHouseEntryFixture {
  const stateJurisdictionKey = `US-${stateUsps}`;
  const place = searchLifePlaces("", 500, {
    stateJurisdictionKey,
    scope: "locality",
  }).find((candidate) => {
    if (!candidate.sourceGeoid) return false;
    return (
      districtMembershipFromCanonicalHome({
        homeJurisdictionId: candidate.context.jurisdiction.id,
        catalog: districtIdentityCatalog(),
        placeGeoid: candidate.sourceGeoid,
        chamber: "state-lower",
      }).kind === "known"
    );
  });
  if (!place?.sourceGeoid)
    throw new Error(
      `${stateJurisdictionKey}: no locality with a known state-lower whole-place district join was found.`,
    );

  const membership = districtMembershipFromCanonicalHome({
    homeJurisdictionId: place.context.jurisdiction.id,
    catalog: districtIdentityCatalog(),
    placeGeoid: place.sourceGeoid,
    chamber: "state-lower",
  });
  if (membership.kind !== "known")
    throw new Error(
      `${stateJurisdictionKey}: the selected locality's state-lower district membership ceased to be known.`,
    );

  const { world: opening, personId } = adultLifeAt(
    place.key,
    `multistate-funded-service-ordinary-${stateUsps}`,
  );
  const homeJurisdictionId = opening.people[personId]!.homeJurisdictionId;
  if (homeJurisdictionId !== place.context.jurisdiction.id)
    throw new Error(
      `${stateJurisdictionKey}: generated resident home does not match the selected locality.`,
    );

  const pack = candidacyPackForJurisdiction(homeJurisdictionId);
  const office = pack?.offices.find((candidate) => {
    const chamber = candidate.officeKey.split(":").at(-1);
    return chamber === "house" || chamber === "assembly";
  });
  if (!pack || !office)
    throw new Error(
      `${stateJurisdictionKey}: no lower-chamber candidacy office is present in the resident's accepted pack.`,
    );

  const eligibility = candidacyEligibility(opening, {
    personId,
    jurisdictionId: homeJurisdictionId,
    officeKey: office.officeKey,
    alreadyACandidate: false,
    districtBinding: membership.binding,
  });
  if (!eligibility.eligible)
    throw new Error(
      `${stateJurisdictionKey}: ordinary generated resident was refused lower-chamber filing: ${eligibility.blocks
        .map((block) => `${block.kind}: ${block.reason}`)
        .join("; ")}`,
    );

  // Keep the authored race short: its date is test scheduling only, while
  // office identity, qualification, campaign and result still use the ordinary
  // writers. The test makes no claim about any state's filing calendar.
  const filed = fileForOffice(
    opening,
    personId,
    membership.binding,
    office.officeKey,
    addDays(opening.currentDate, 28),
  );
  const campaign = campaignForCandidate(filed, personId);
  if (!campaign)
    throw new Error(
      `${stateJurisdictionKey}: ordinary campaign was not recorded.`,
    );
  const decided = runToElection(filed, personId, suppliedWin(personId));
  if (projectCampaign(decided, personId).phase !== "won")
    throw new Error(
      `${stateJurisdictionKey}: supplied fictional campaign result did not record the resident's win.`,
    );

  const contest = electionContestById(decided, campaign.contestId);
  if (!contest)
    throw new Error(
      `${stateJurisdictionKey}: recorded campaign contest is missing.`,
    );
  if (contest.office.districtBinding?.recordId !== membership.binding.recordId)
    throw new Error(
      `${stateJurisdictionKey}: filed campaign did not retain the canonical home district binding.`,
    );

  const memberWork = workRelationshipHistoryForPerson(decided, personId).find(
    (relationship) =>
      relationship.kind === "employment:legislative-member" &&
      legislativeTermForRelationship(decided, relationship.id) !== null,
  );
  if (!memberWork)
    throw new Error(
      `${stateJurisdictionKey}: the recorded win created no dated member term.`,
    );
  const term = legislativeTermForRelationship(decided, memberWork.id)!;
  const world = moveToTermDate(decided, term.startsAt);
  const entry = resolveLegislativeFilingEntry(world, personId);
  if (entry.kind !== "available")
    throw new Error(
      `${stateJurisdictionKey}: ordinary member filing entry unavailable on ${world.currentDate}: ${entry.reason}`,
    );

  const governingJurisdictionId =
    stateJurisdictionForKey(stateJurisdictionKey)?.id;
  if (!governingJurisdictionId)
    throw new Error(`${stateJurisdictionKey}: state jurisdiction is missing.`);

  return {
    world,
    personId,
    stateUsps,
    homeJurisdictionId,
    governingJurisdictionId,
    officeKey: office.officeKey,
    districtBinding: membership.binding,
    contestId: contest.id,
  };
}
