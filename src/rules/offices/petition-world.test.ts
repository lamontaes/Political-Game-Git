import { expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { namedSeatForFixture } from "../../../tests/fixtures/campaign-fixture";
import { STATES } from "../../simulation/state-reference";
import {
  candidacyEligibility,
  electiveOfficesForJurisdiction,
} from "../../simulation/candidacy";
import { municipalSeatChoices } from "../../simulation/municipal-seat-identity";
import { fileCampaign } from "../../simulation/campaigns";
import { addDays } from "../../simulation/dates";
import { makeCurrencyCode } from "../../simulation/resources";
import { electionContestById } from "../../simulation/election-contests";
import {
  districtResidenceSince,
  syncDistrictMembershipFromCanonicalHome,
  CONGRESSIONAL_HOME_JOIN_V1,
} from "../../simulation/district-residence";
import { residesForVoting } from "../../simulation/issue-record";
import {
  circulateCandidatePetition,
  petitionAskedPersonIds,
  petitionEventsForCampaign,
} from "../../simulation/candidate-petitions";
import { modelCampaignFieldReach as legacyReach } from "../../simulation/campaign-contact-calibration";
import { modelCampaignFieldReach, type FieldBenchmarks } from "./field-reach";
import { petitionCirculationPlan } from "./petition-circulation";
import calibration from "../../../data/research/campaign-reality/campaign-calibration.json";

const door = calibration.observations.find(
  (row) => row.id === "volunteer-door-conversations",
)!;
const phone = calibration.observations.find(
  (row) => row.id === "blueprints-manual-phone",
)!;
// These input values are the legacy interpretation of the cited observation rows.
const benchmarks: FieldBenchmarks = {
  "door-canvass": {
    completedConversations: { min: door.range!.min, max: door.range!.max },
    sourceObservationIds: [door.id],
  },
  "phone-shift": {
    completedConversations: {
      min: phone.relatedContactsRange!.min,
      max: phone.relatedContactsRange!.max,
    },
    phoneDials: { min: phone.range!.min, max: phone.range!.max },
    sourceObservationIds: [phone.id],
  },
};
it.each(Object.keys(STATES))(
  "petition contact decisions through the filed campaign in %s",
  (place) => {
    const base = smallWorld({
      place,
      people: 8,
      seed: "rules2-sendback-petition:" + place,
    });
    let world = base.world;
    for (const id of world.personOrder)
      world = syncDistrictMembershipFromCanonicalHome(
        world,
        id,
        CONGRESSIONAL_HOME_JOIN_V1,
      );
    for (const form of [
      "door-canvass",
      "phone-shift",
      "petition-circulation",
    ] as const)
      for (const minutes of [1, 59, 60, 120])
        expect(modelCampaignFieldReach(form, minutes, benchmarks)).toEqual(
          legacyReach(form, minutes),
        );
    const selected = electiveOfficesForJurisdiction(base.jurisdictionId)
      .map((option) => {
        const districtBinding = namedSeatForFixture(
          world,
          base.personId,
          option.officeKey,
        );
        const municipalSeatKey =
          municipalSeatChoices(world, base.personId, option.officeKey).find(
            (row) => row.eligible,
          )?.key ?? null;
        return {
          option,
          districtBinding,
          municipalSeatKey,
          eligible: candidacyEligibility(world, {
            personId: base.personId,
            jurisdictionId: base.jurisdictionId,
            officeKey: option.officeKey,
            alreadyACandidate: false,
            districtBinding,
            municipalSeatKey,
          }).eligible,
        };
      })
      .find((row) => row.eligible);
    if (!selected) {
      expect(() =>
        petitionCirculationPlan(
          {
            stableKey: "missing",
            campaignId: "missing",
            candidatePersonId: base.personId,
            people: world.personOrder,
            previouslyAsked: [],
            residentPeople: new Set(),
            alreadyCirculated: false,
            campaignExists: false,
          },
          60,
          benchmarks,
        ),
      ).toThrow("Campaign not found: missing");
      expect(world.history.campaigns ?? []).toHaveLength(0);
      return;
    }
    const filed = fileCampaign(world, {
      stableKey: "rules2:petition-campaign",
      candidatePersonId: base.personId,
      jurisdictionId: base.jurisdictionId,
      officeKey: selected.option.officeKey,
      districtBinding: selected.districtBinding,
      municipalSeatKey: selected.municipalSeatKey,
      electionDate: addDays(world.currentDate, 28),
      rivalPersonIds: [world.personOrder[1]!],
      existingContestId: null,
      committeeName: "Petition control committee",
      donorPoolName: "Petition control supporters",
      advertisingVendorName: "Petition control vendor",
      staffPersonIds: [],
      treasuryCurrency: makeCurrencyCode("USD"),
    });
    world = filed.world;
    const campaign = filed.campaign;
    const binding = electionContestById(world, campaign.contestId)!.office
      .districtBinding;
    for (const [key, minutes] of [
      ["first", 60],
      ["first", 60],
      ["second", 120],
    ] as const) {
      const stableKey = "rules2:petition:" + key;
      const planned = petitionCirculationPlan(
        {
          stableKey,
          campaignId: campaign.id,
          candidatePersonId: campaign.candidatePersonId,
          people: world.personOrder,
          previouslyAsked: [...petitionAskedPersonIds(world, campaign.id)],
          residentPeople: new Set(
            world.personOrder.filter((id) =>
              binding
                ? districtResidenceSince(
                    world,
                    id,
                    binding,
                    world.currentDate,
                  ) !== null
                : residesForVoting(
                    world,
                    id,
                    campaign.jurisdictionId,
                    world.currentDate,
                  ),
            ),
          ),
          alreadyCirculated: world.history.events.some((event) =>
            event.tags.includes("petition-circulation:" + stableKey),
          ),
          campaignExists: true,
        },
        minutes,
        benchmarks,
      );
      const next = circulateCandidatePetition(world, {
        campaignId: campaign.id,
        circulatorPersonId: base.personId,
        stableKey,
        minutes,
        at: world.currentDate,
      });
      expect(
        petitionEventsForCampaign(next, campaign.id)
          .filter((event) => event.sequence >= world.history.nextSequence)
          .flatMap((event) =>
            event.participants
              .filter((row) => row.role === "agency:signer")
              .map((row) => row.personId),
          ),
      ).toEqual(planned);
      world = next;
    }
  },
);
