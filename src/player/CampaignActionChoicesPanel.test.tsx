import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { attendPartyWork } from "../presentation/campaign-life-actions";
import { fileForOffice } from "../presentation/campaign-projection";
import {
  addDays,
  campaignLifeActivityRecords,
  candidacyPackForJurisdiction,
  chooseCampaignWeekAction,
  commitCampaignWeek,
  projectCampaignWeek,
  projectCampaignWeekActions,
  type EntityId,
  type World,
} from "../simulation";
import { CampaignActionChoicesPanel } from "./CampaignActionChoicesPanel";
import { CampaignWorkspace } from "./CampaignWorkspace";

let world: World;
let personId: EntityId;

beforeAll(() => {
  const opening = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ui-campaign-week-choices",
      startAge: 34,
      placeKey: "kentucky",
    }),
  ).game!;
  personId = opening.playerPersonId;
  const office = candidacyPackForJurisdiction(
    opening.world.people[personId]!.homeJurisdictionId,
  )!.offices[0]!;
  world = fileForOffice(
    opening.world,
    personId,
    null,
    office.officeKey,
    addDays(opening.world.currentDate, 28),
  );
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
  it("shows hosted dated choices without guessing a cash cost", () => {
    const view = projectCampaignWeekActions(world, personId)!;
    const html = renderChoices(world);
    expect(html).toContain('data-testid="campaign-action-choices"');
    expect(html).toContain('data-testid="campaign-book-phone-shift"');
    expect(html).toContain('data-testid="campaign-book-door-canvass"');
    for (const choice of view.choices) {
      expect(html).toContain(choice.hostName);
      expect(html).toContain(choice.place);
    }
    expect(html).toContain("cost of these activities is not established");
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
    expect(html).not.toContain('data-testid="campaign-offers"');
    expect(html).toContain('data-testid="campaign-paid-advertising"');
    expect(html).toContain('data-testid="campaign-advertising-buy"');
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
    expect(html).toContain(result.summary);
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
