import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  attendPartyWork,
  requestPartyWork,
} from "../presentation/campaign-life-actions";
import { fileForOffice } from "../presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordedDistrictForOffice,
} from "../presentation/district-selection";
import {
  addDays,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  candidacyPackForJurisdiction,
  chooseCampaignWeekAction,
  commitCampaignWeek,
  homePartyChapters,
  joinPartyChapter,
  projectCampaignWeek,
  projectCampaignWeekActions,
  type EntityId,
  type World,
} from "../simulation";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { CampaignActionChoicesPanel } from "./CampaignActionChoicesPanel";
import { CampaignWorkspace } from "./CampaignWorkspace";

let world: World;
let unhostedWorld: World;
let personId: EntityId;

beforeAll(() => {
  const opening = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "campaign-week-recorded-backing",
      startAge: 34,
      placeKey: "kentucky",
    }),
  ).game!;
  personId = opening.playerPersonId;
  const office = candidacyPackForJurisdiction(
    opening.world.people[personId]!.homeJurisdictionId,
  )!.offices[0]!;
  const homeJurisdictionId = opening.world.people[personId]!.homeJurisdictionId;
  // A numbered chamber seat is filed against a recorded Gazetteer district.
  const district =
    recordedDistrictForOffice(opening.world, personId, office.officeKey)
      ?.binding ??
    bindingForDistrict(
      offeredDistricts(opening.world, homeJurisdictionId, office.officeKey)[0]!,
    );
  unhostedWorld = fileForOffice(
    opening.world,
    personId,
    district,
    office.officeKey,
    addDays(opening.world.currentDate, 28),
  );
  const chapter = homePartyChapters(unhostedWorld)[0]!;
  world = joinPartyChapter(unhostedWorld, personId, chapter.organizationId);
  world = requestPartyWork(
    world,
    personId,
    "organization-meeting",
    chapter.organizationId,
  );
  world = attendPartyWork(
    world,
    personId,
    campaignLifeActivityRecords(world).at(-1)!.id,
    "attended",
  );
  world = requestPartyWork(
    world,
    personId,
    "support-request",
    chapter.organizationId,
  );
  world = attendPartyWork(
    world,
    personId,
    campaignLifeActivityRecords(world).at(-1)!.id,
    "attended",
  );
  if (
    campaignLifeOutcomeRecords(world).at(-1)?.supportDecision?.decision !==
    "granted"
  ) {
    throw new Error(
      "The seeded chapter support fixture did not grant support.",
    );
  }
}, 300_000);

function renderChoices(current: World) {
  return renderToStaticMarkup(
    <CampaignActionChoicesPanel
      world={current}
      personId={personId}
      onWorldChange={() => {}}
    />,
  );
}

describe("campaign choices in the player UI", () => {
  it("routes an unhosted candidate to an actual chapter support request", () => {
    const view = projectCampaignWeekActions(unhostedWorld, personId)!;
    const html = renderChoices(unhostedWorld);
    expect(view.availabilityReason).toBe("needs-host");
    expect(view.choices).toEqual([]);
    expect(html).toContain('href="#party-work-title"');
    expect(html).toContain("Ask a local chapter organizer for support");
    expect(html).not.toContain("open calendar");
    expect(html).not.toContain("campaign-book-phone-shift");
  });

  it("shows hosted dated choices without guessing a cash cost", () => {
    const view = projectCampaignWeekActions(world, personId)!;
    const html = renderChoices(world);
    expect(html).toContain('data-testid="campaign-action-choices"');
    expect(html).toContain('data-testid="campaign-book-phone-shift"');
    expect(html).toContain('data-testid="campaign-book-door-canvass"');
    for (const choice of view.choices) {
      expect(html).toContain(choice.hostName);
      expect(html).toContain(choice.place);
      expect(choice.cashCost).toBeNull();
    }
    expect(html).not.toContain("Cost not estimated.");
    expect(html).not.toContain("campaign-choice-cost-");
    expect(html).toContain("The committee opened with no money");
    expect(html).not.toContain("cost of these activities is not established");
    expect(html).not.toContain("$0 cost");
  });

  it("makes the connected choices the Campaign workspace's week route", () => {
    const html = renderToStaticMarkup(
      <CampaignWorkspace
        world={world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain('data-primary-slot="week"');
    expect(html).toContain('data-testid="campaign-book-phone-shift"');
    expect(html).not.toContain('data-testid="campaign-week-field"');
    expect(html).not.toContain('data-testid="campaign-week-commit"');
    // Where the work goes, and doing one piece of it now, stay beside the
    // week: the priority and geography controls and the "Do this now" row,
    // advertising included, with the standing campaign hours above them.
    expect(html).toContain('data-testid="campaign-hours"');
    expect(html).toContain('data-testid="campaign-strategy"');
    expect(html).toContain('data-testid="campaign-offers"');
    expect(html).toContain('data-testid="campaign-advertising"');
    expect(html).toContain('data-testid="campaign-own-money"');
  });

  it("reads a named result after the scheduled activity is attended", () => {
    const view = projectCampaignWeekActions(world, personId)!;
    const choice = view.choices.find((item) => item.form === "phone-shift")!;
    const booked = chooseCampaignWeekAction(world, personId, {
      campaignId: view.campaignId,
      choiceId: choice.id,
      revision: view.revision,
    });
    const activity = campaignLifeActivityRecords(booked).at(-1)!;
    const finished = attendPartyWork(booked, personId, activity.id, "attended");
    const result = projectCampaignWeekActions(
      finished,
      personId,
    )!.recentResults.at(-1)!;
    const html = renderChoices(finished);
    expect(html).toContain('data-testid="campaign-recent-results"');
    expect(html).toContain(result.contactNames[0]!);
    expect(html).toContain("Worked with:");
    expect(result.fieldReach?.estimatedCompletedConversations).toEqual({
      min: 10,
      max: 15,
    });
    expect(html).toContain("Estimated conversations: 10–15");
    expect(renderChoices(deserializeWorld(serializeWorld(finished)))).toContain(
      "Estimated conversations: 10–15",
    );
    expect(html).toContain("Held ");
    expect(html).not.toContain(result.summary);
  });

  it("does not present an unreceived fundraiser gift as campaign cash", () => {
    const view = projectCampaignWeekActions(world, personId)!;
    const choice = view.choices.find((item) => item.form === "fundraiser")!;
    const booked = chooseCampaignWeekAction(world, personId, {
      campaignId: view.campaignId,
      choiceId: choice.id,
      revision: view.revision,
    });
    const activity = campaignLifeActivityRecords(booked).at(-1)!;
    const finished = attendPartyWork(booked, personId, activity.id, "attended");
    const result = projectCampaignWeekActions(
      finished,
      personId,
    )!.recentResults.at(-1)!;
    const html = renderChoices(finished);
    expect(result.raisedAmount).toBeNull();
    expect(html).toContain("No contribution was received by the committee");
    expect(html).not.toContain("Raised:");
    expect(html).not.toContain(result.summary);
  });

  it("keeps an older committed week's sessions available without its count editor", () => {
    const week = projectCampaignWeek(world, personId)!;
    const committed = commitCampaignWeek(world, personId, {
      campaignId: week.campaignId,
      weekStart: week.weekStart,
      proposerPersonId: null,
      revision: week.revision,
      emphasis: "field",
      allocation: {
        fieldShifts: 1,
        fundraisingSessions: 1,
        advertisingBuys: 0,
      },
      advertising: null,
    });
    const html = renderToStaticMarkup(
      <CampaignWorkspace
        world={committed}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("Earlier committed week");
    expect(html).toContain("campaign-week-session-");
    expect(html).not.toContain('data-testid="campaign-week-field"');
    expect(html).not.toContain('data-testid="campaign-week-commit"');
  });
});
