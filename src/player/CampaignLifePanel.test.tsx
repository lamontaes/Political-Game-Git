import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { CampaignLifePanel } from "./CampaignLifePanel";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { acceptPartyWork } from "../presentation/campaign-life-actions";
import {
  addDays,
  homePartyChapters,
  offerCampaignLifeActivity,
  projectCampaignLifeActivities,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";

/**
 * Party and community work as it is actually mounted (CRUNCH47 EXPERIENCE).
 *
 * The panel is mounted on Politics > Parties above the local chapters, and the
 * Campaigns surface mounts the same one for a candidate already running. These
 * cover both states it can be in on either mount: nothing on the calendar yet,
 * which must say so rather than draw an empty list, and a real remote phone
 * shift with the control that works it.
 */

interface Life {
  readonly world: World;
  readonly personId: EntityId;
  readonly chapterId: EntityId;
  readonly organizerId: EntityId;
}

function adultLife(): Life {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ui47-campaign-life-mount",
      startAge: 34,
      placeKey: "kentucky",
    }),
  ).game!;
  const chapter = homePartyChapters(game.world)[0]!;
  return {
    world: game.world,
    personId: game.playerPersonId,
    chapterId: chapter.organizationId,
    organizerId: chapter.organizerPersonId!,
  };
}

let life: Life;
let withShift: World;

beforeAll(() => {
  life = adultLife();
  const offered = offerCampaignLifeActivity(life.world, {
    form: "phone-shift",
    hostOrganizationId: life.chapterId,
    hostPersonId: life.organizerId,
    subjectPersonId: life.personId,
    campaignId: null,
    origin: "host-outreach",
    start: simulationMomentAtLocalTime({
      date: addDays(life.world.currentDate, 2) as IsoDate,
      minuteOfDay: 19 * 60,
      timeZone: life.world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: life.world.currentMoment.utcOffsetMinutes,
    }),
    stableKey: "ui47-campaign-life-mount:phone:1",
  });
  const view = projectCampaignLifeActivities(offered, life.personId).at(-1)!;
  withShift = acceptPartyWork(offered, life.personId, view.lifeActivityId);
}, 300_000);

function render(world: World): string {
  return renderToStaticMarkup(
    <CampaignLifePanel
      world={world}
      personId={life.personId}
      onWorldChange={() => {}}
    />,
  );
}

describe("CampaignLifePanel as mounted", () => {
  it("with nothing on the calendar, says so instead of drawing an empty list", () => {
    const html = render(life.world);
    expect(html).toContain('data-testid="party-work"');
    expect(html).toContain('data-testid="party-work-empty"');
    expect(html).toContain(
      "Nothing is on your calendar from a party or campaign yet.",
    );
    // An honest empty state is not a list, and not a disabled row either.
    expect(html).not.toContain('data-state="accepted"');
    expect(html).not.toContain('data-testid="party-work-message"');
  });

  it("keeps the panel's own heading and its standing disclaimer on either mount", () => {
    const html = render(life.world);
    expect(html).toContain('id="party-work-title"');
    expect(html).toContain("Party and community work");
    expect(html).toContain(
      "Coming to any of this is not joining, endorsing or voting.",
    );
  });

  it("with an accepted remote phone shift, draws the row and the control that works it", () => {
    const html = render(withShift);
    expect(html).not.toContain('data-testid="party-work-empty"');
    expect(html).toContain('data-state="accepted"');
    expect(html).toContain("Phone shift");
    // A remote shift is worked from home: the one action is taking the shift,
    // and no journey is disclosed because none is travelled.
    expect(html).toContain("party-work-take-shift-");
    expect(html).toContain("Take the phone shift");
    expect(html).not.toContain("party-work-attend-condensed-");
  });

  it("shows no outcome for a shift that has not happened", () => {
    const html = render(withShift);
    expect(html).not.toContain("party-work-outcome-");
  });
});
