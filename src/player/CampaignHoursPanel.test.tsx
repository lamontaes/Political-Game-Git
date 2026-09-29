import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  addDays,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  makeCurrencyCode,
  searchLifePlaces,
  setCampaignRoutine,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { CampaignHoursPanel } from "./CampaignHoursPanel";

const SLOW = 120_000;

/** An ordinary 40-year-old life in a town in the state, filed for governor. */
function governorRace(usps: string, seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  const jurisdictionId = stateJurisdictionForKey(`US-${usps}`)!.id;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, usps),
    {
      stableKey: `routine-${usps}`,
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: `routine-${usps}`,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: stateExecutiveIdentity(usps)!.officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, 90),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `Committee for the ${usps} fixture`,
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return { world: filed.world, personId };
}

describe("campaign hours panel (D-11)", () => {
  it(
    "offers standing hours to a candidate and shows the hours in force",
    () => {
      const { world, personId } = governorRace("CO", "d11-hours-panel-co");
      const empty = renderToStaticMarkup(
        <CampaignHoursPanel
          world={world}
          personId={personId}
          onWorldChange={() => undefined}
        />,
      );
      expect(empty).toContain("You have no set campaign hours.");
      expect(empty).toContain("Knocking on doors");
      expect(empty).toContain("Fundraising calls");
      expect(empty).toContain("Keep these hours");
      expect(empty).not.toContain("Stop campaign hours");
      // Nothing is chosen yet, so there is nothing to keep.
      expect(empty).toMatch(/data-testid="campaign-hours-keep"[^>]*disabled/);

      const set = setCampaignRoutine(world, personId, [
        { work: "outreach", weekdays: [2, 4], startMinute: 1080, minutes: 120 },
      ]);
      const keeping = renderToStaticMarkup(
        <CampaignHoursPanel
          world={set}
          personId={personId}
          onWorldChange={() => undefined}
        />,
      );
      expect(keeping).toContain(
        "Knocking on doors, Tue, Thu, 6 p.m. to 8 p.m.",
      );
      expect(keeping).toContain("Stop campaign hours");
      expect(keeping).toContain('value="18:00"');
    },
    SLOW,
  );

  it(
    "is absent for someone who is not running",
    () => {
      const { world, personId } = governorRace("MN", "d11-hours-panel-mn");
      const bystander = Object.values(world.people).find(
        (person) => person.id !== personId,
      )!.id;
      expect(
        renderToStaticMarkup(
          <CampaignHoursPanel
            world={world}
            personId={bystander}
            onWorldChange={() => undefined}
          />,
        ),
      ).toBe("");
    },
    SLOW,
  );
});
