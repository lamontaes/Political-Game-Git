import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import { fixtureMeetsRecordedCandidacyAge } from "../../tests/fixtures/candidacy-age";
import { candidacyPackForJurisdiction } from "./candidacy";
import {
  fileCampaign,
  createCampaignElectionTransitionRegistry,
} from "./campaigns";
import { electionNightWitnesses } from "./speech-reception";
import { workStatusAt } from "./life-queries";
import { addDays } from "./dates";
import { makeCurrencyCode } from "./resources";
import { advanceWorld } from "./world";
import { recordWorkStatus } from "./life";
import { deserializeWorld, serializeWorld } from "./serialization";
void createScenarioWorld;
const seed = "session13-night-staff-next-day";
const place = drawRandomPlace(seed);

describe("campaign staff remain active for the recorded election night", () => {
  it("retains staff through the count and save, then ends their work on the next dated day", () => {
    // A dated regression fixture after the admitted qualification observations.
    // December keeps this existing fixture's winter-zone context consistent.
    const built = smallWorld({
      place: place.key,
      seed,
      people: 6,
      date: "2026-12-01",
    });
    console.log(
      JSON.stringify({
        seed,
        place: place.displayName,
        date: built.world.currentDate,
      }),
    );
    const personId = built.world.personOrder.find((id) =>
      fixtureMeetsRecordedCandidacyAge(built.world, id),
    )!;
    expect(personId).toBeDefined();
    const staff = built.world.personOrder.find((id) => id !== personId)!;
    const rival = built.world.personOrder.find(
      (id) => id !== personId && id !== staff,
    )!;
    const jurisdictionId = built.world.people[personId]!.homeJurisdictionId;
    const office = candidacyPackForJurisdiction(jurisdictionId)!.offices[0]!;
    const electionDate = addDays(built.world.currentDate, 1);
    const filed = fileCampaign(built.world, {
      stableKey: "staff-night",
      candidatePersonId: personId,
      jurisdictionId,
      officeKey: office.officeKey,
      districtBinding: namedSeatForFixture(
        built.world,
        personId,
        office.officeKey,
      ),
      electionDate,
      rivalPersonIds: [rival],
      existingContestId: null,
      committeeName: "Authored staff regression committee",
      donorPoolName: "Fixture supporters",
      advertisingVendorName: "Fixture vendor",
      staffPersonIds: [staff],
      treasuryCurrency: makeCurrencyCode("USD"),
    });
    const registry = createCampaignElectionTransitionRegistry();
    const night = advanceWorld(filed.world, 1, registry);
    expect(
      electionNightWitnesses(night, personId, filed.campaign.contestId),
    ).toContain(staff);
    expect(
      workStatusAt(night, filed.campaign.candidateWorkRelationshipId)!.status,
    ).toBe("ended");
    expect(
      workStatusAt(night, filed.campaign.staffWorkRelationshipIds[0]!)!.status,
    ).toBe("active");
    const loaded = deserializeWorld(serializeWorld(night));
    expect(
      electionNightWitnesses(loaded, personId, filed.campaign.contestId),
    ).toContain(staff);
    // A staff member who ended their own role after the count must not be
    // ended twice by the saved next-day closure.
    const prior = workStatusAt(
      loaded,
      filed.campaign.staffWorkRelationshipIds[0]!,
    )!;
    const left = recordWorkStatus(loaded, {
      stableKey: "staff-night:already-left",
      workRelationshipId: prior.workRelationshipId,
      effectiveAt: loaded.currentDate,
      status: "ended",
      reason: "Authored regression: staff left after the count.",
      provenance: { kind: "authored", note: "Focused staff closure fixture." },
      supersedesStatusId: prior.id,
    });
    const leftTomorrow = advanceWorld(left, 1, registry);
    expect(
      leftTomorrow.history.workStatuses.filter(
        (row) =>
          row.workRelationshipId === prior.workRelationshipId &&
          row.status === "ended",
      ),
    ).toHaveLength(1);
    expect(workStatusAt(leftTomorrow, prior.workRelationshipId)!.id).toBe(
      workStatusAt(left, prior.workRelationshipId)!.id,
    );
    const tomorrow = advanceWorld(loaded, 1, registry);
    const ended = workStatusAt(
      tomorrow,
      filed.campaign.staffWorkRelationshipIds[0]!,
    )!;
    expect(ended.status).toBe("ended");
    expect(ended.effectiveAt).toBe(addDays(electionDate, 1));
    expect(
      tomorrow.history.workStatuses.filter(
        (row) =>
          row.workRelationshipId === ended.workRelationshipId &&
          row.status === "ended",
      ),
    ).toHaveLength(1);
    console.log(
      JSON.stringify({
        seed,
        place: place.displayName,
        staffPersonId: staff,
        electionDate,
        endedAt: ended.effectiveAt,
      }),
    );
  });
});
