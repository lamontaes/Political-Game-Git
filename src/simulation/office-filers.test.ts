import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { drawRandomPlace } from "../../tests/support/random-place";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import {
  electiveOfficesForJurisdiction,
  candidacyEligibility,
} from "./candidacy";
import { fileCampaign } from "./campaigns";
import { campaignWeeklyEvaluationHandler } from "./campaign-opponents";
import { CAMPAIGN_WEEKLY_EVALUATION_KEY } from "./campaign-life-types";
import { advanceWorld } from "./world";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { makeCurrencyCode } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { filersForOffice, undatedRivalsForOffice } from "./office-filers";

const seed = "session13-office-filers";
const place = drawRandomPlace(seed);

function fixture() {
  const world = createScenarioWorld(
    seed,
    {
      ...place.context,
      initialMoment: simulationMomentOnLocalDate(
        place.context.initialMoment,
        makeIsoDate("2026-10-06"),
      ),
    },
    { peopleCount: 8 },
  );
  const candidatePersonId = world.personOrder[0]!;
  const jurisdictionId = world.people[candidatePersonId]!.homeJurisdictionId;
  const office = electiveOfficesForJurisdiction(jurisdictionId).find(
    (row) =>
      candidacyEligibility(world, {
        personId: candidatePersonId,
        jurisdictionId,
        officeKey: row.officeKey,
        alreadyACandidate: false,
        districtBinding: namedSeatForFixture(
          world,
          candidatePersonId,
          row.officeKey,
        ),
      }).eligible,
  );
  if (!office)
    throw new Error(`No eligible recorded fixture office in ${place.key}`);
  return fileCampaign(world, {
    stableKey: "office-filers:authored-reader-fixture",
    candidatePersonId,
    jurisdictionId,
    officeKey: office.officeKey,
    districtBinding: namedSeatForFixture(
      world,
      candidatePersonId,
      office.officeKey,
    ),
    electionDate: addDays(world.currentDate, 28),
    rivalPersonIds: [world.personOrder[1]!],
    existingContestId: null,
    committeeName: "Authored reader fixture committee",
    donorPoolName: "Authored reader fixture supporters",
    advertisingVendorName: "Authored reader fixture vendor",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
}

describe("office-scoped recorded filers", () => {
  it("keeps an actual rival committee without a filing record undated", () => {
    const f = fixture();
    const world = advanceWorld(
      f.world,
      7,
      createFutureTransitionHandlerRegistry([
        [CAMPAIGN_WEEKLY_EVALUATION_KEY, campaignWeeklyEvaluationHandler],
      ]),
    );
    const rivals = undatedRivalsForOffice(
      world,
      f.campaign.officeKey,
      world.currentDate,
    );
    expect(rivals).toHaveLength(1);
    expect(rivals[0]).toMatchObject({
      candidatePersonId: f.world.personOrder[1],
      filedAt: null,
    });
    expect(
      filersForOffice(world, f.campaign.officeKey, world.currentDate).map(
        (row) => row.candidatePersonId,
      ),
    ).toEqual([f.campaign.candidatePersonId]);
    expect(
      undatedRivalsForOffice(world, f.campaign.officeKey, f.world.currentDate),
    ).toEqual([]);
  });
  it("reads the canonical filing date and source IDs, excluding earlier dates and other offices", () => {
    const { world, campaign } = fixture();
    const rows = filersForOffice(world, campaign.officeKey, world.currentDate);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      candidatePersonId: campaign.candidatePersonId,
      contestId: campaign.contestId,
      filedAt: campaign.filedAt,
      filingEventId: campaign.filingEventId,
      campaignIds: [campaign.id],
    });
    expect(rows[0]!.sourceRecordIds).toEqual(
      expect.arrayContaining([
        campaign.id,
        campaign.filingEventId,
        campaign.contestId,
      ]),
    );
    expect(
      filersForOffice(world, campaign.officeKey, addDays(campaign.filedAt, -1)),
    ).toEqual([]);
    expect(filersForOffice(world, "another-office", world.currentDate)).toEqual(
      [],
    );
    expect(
      filersForOffice(
        world,
        campaign.officeKey,
        addDays(world.currentDate, 30),
      ),
    ).toEqual(rows);
  });

  it("preserves read-only results through save and reload, without treating contest rivals as filers", () => {
    const { world, campaign } = fixture();
    const before = serializeWorld(world);
    const rows = filersForOffice(world, campaign.officeKey, world.currentDate);
    expect(rows.map((row) => row.candidatePersonId)).toEqual([
      campaign.candidatePersonId,
    ]);
    expect(
      undatedRivalsForOffice(world, campaign.officeKey, world.currentDate),
    ).toEqual([]);
    const restored = deserializeWorld(before);
    expect(
      filersForOffice(restored, campaign.officeKey, world.currentDate),
    ).toEqual(rows);
    expect(serializeWorld(world)).toBe(before);
  });
});
