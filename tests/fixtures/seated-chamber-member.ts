import { districtIdentityCatalog } from "../../src/districts/catalog";
import { districtMembershipFromCanonicalHome } from "../../src/districts/query";
import {
  campaignForCandidate,
  candidacyEligibility,
  candidacyPackForJurisdiction,
  electionContestById,
  legislativeTermForRelationship,
  makeIsoDate,
  requireLifePlace,
  searchLifePlaces,
  workRelationshipHistoryForPerson,
} from "../../src/simulation";
import type { EntityId, IsoDate, World } from "../../src/simulation";
import { ensureLivingWorldOpening } from "../../src/simulation/living-world/opening";
import { ensureStateLegislatureOpening } from "../../src/simulation/nationwide-world/state-legislature-opening";
import { ensureWorldStartingConditions } from "../../src/simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../../src/simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../src/simulation/world-setup/types";
import {
  fileForOffice,
  projectCampaign,
} from "../../src/presentation/campaign-projection";
import { buildProductionWorld } from "../../src/presentation/production-world";
import { resolveLegislativeFilingEntry } from "../../src/presentation/legislative-filing-entry";
import {
  completeRecordedCampaignFixture,
  moveToTermDate,
} from "./recorded-legislative-term";

const START_DATE: IsoDate = makeIsoDate("2026-12-30");
const FICTIONAL_ELECTION_DATE: IsoDate = makeIsoDate("2026-12-31");

/**
 * A short, explicitly fictional unit fixture. It begins a generated adult's
 * world in December, then uses the real opening, campaign, term and clock
 * writers. The authored election date makes no claim about a state's calendar.
 */
export function seatedChamberMember(stateUsps: "NE" | "AK" | "KY"): {
  readonly world: World;
  readonly personId: EntityId;
} {
  const stateJurisdictionKey = `US-${stateUsps}`;
  const districtChamber = stateUsps === "NE" ? "state-upper" : "state-lower";
  const candidate = searchLifePlaces("", 500, {
    stateJurisdictionKey,
    scope: "locality",
  }).find((place) =>
    Boolean(
      place.sourceGeoid &&
      districtMembershipFromCanonicalHome({
        homeJurisdictionId: place.context.jurisdiction.id,
        catalog: districtIdentityCatalog(),
        placeGeoid: place.sourceGeoid,
        chamber: districtChamber,
      }).kind === "known",
    ),
  );
  if (!candidate?.sourceGeoid)
    throw new Error(`${stateJurisdictionKey}: no known whole-place district.`);
  const place = requireLifePlace(candidate.key);
  const membership = districtMembershipFromCanonicalHome({
    homeJurisdictionId: place.context.jurisdiction.id,
    catalog: districtIdentityCatalog(),
    placeGeoid: candidate.sourceGeoid,
    chamber: districtChamber,
  });
  if (membership.kind !== "known")
    throw new Error(`${stateJurisdictionKey}: home district became unknown.`);

  const datedPlace = {
    ...place,
    context: {
      ...place.context,
      initialMoment: { ...place.context.initialMoment, date: START_DATE },
    },
  };
  const built = buildProductionWorld({
    seed: `seated-chamber-unit-${stateUsps}`,
    place: datedPlace,
    age: 40,
    givenName: null,
    familyName: null,
    startingLife: "ordinary-life",
    depth: "summarize-earlier-life",
    household: "lives-alone",
  });
  const personId = built.playerPersonId;
  let world = ensureWorldStartingConditions(built.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  world = ensureLivingWorldOpening(world, personId);
  world = ensureStateLegislatureOpening(world, personId, stateUsps);
  if (
    world.people[personId]?.homeJurisdictionId !== place.context.jurisdiction.id
  )
    throw new Error(`${stateJurisdictionKey}: generated home changed.`);

  const pack = candidacyPackForJurisdiction(place.context.jurisdiction.id);
  const office = pack?.offices.find((option) =>
    option.officeKey.endsWith(stateUsps === "NE" ? ":legislature" : ":house"),
  );
  if (!office)
    throw new Error(`${stateJurisdictionKey}: chamber office unavailable.`);
  const eligibility = candidacyEligibility(world, {
    personId,
    jurisdictionId: place.context.jurisdiction.id,
    officeKey: office.officeKey,
    alreadyACandidate: false,
    districtBinding: membership.binding,
  });
  if (!eligibility.eligible)
    throw new Error(
      `${stateJurisdictionKey}: candidate ineligible: ${eligibility.blocks.map((block) => block.reason).join("; ")}`,
    );

  const filed = fileForOffice(
    world,
    personId,
    membership.binding,
    office.officeKey,
    FICTIONAL_ELECTION_DATE,
  );
  const campaign = campaignForCandidate(filed, personId);
  if (!campaign) throw new Error(`${stateJurisdictionKey}: campaign missing.`);
  const decided = completeRecordedCampaignFixture(filed, personId);
  if (projectCampaign(decided, personId).phase !== "won")
    throw new Error(`${stateJurisdictionKey}: supplied result did not win.`);
  const contest = electionContestById(decided, campaign.contestId);
  if (contest?.office.districtBinding?.recordId !== membership.binding.recordId)
    throw new Error(`${stateJurisdictionKey}: campaign lost home district.`);
  const memberWork = workRelationshipHistoryForPerson(decided, personId).find(
    (relationship) =>
      relationship.kind === "employment:legislative-member" &&
      legislativeTermForRelationship(decided, relationship.id) !== null,
  );
  if (!memberWork)
    throw new Error(`${stateJurisdictionKey}: no recorded member term.`);
  const term = legislativeTermForRelationship(decided, memberWork.id)!;
  world = moveToTermDate(decided, term.startsAt);
  const entry = resolveLegislativeFilingEntry(world, personId);
  if (entry.kind !== "available")
    throw new Error(
      `${stateJurisdictionKey}: member filing unavailable on ${world.currentDate}: ${entry.reason}`,
    );
  return { world, personId };
}
