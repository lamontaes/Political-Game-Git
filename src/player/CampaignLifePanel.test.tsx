import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { CampaignLifePanel } from "./CampaignLifePanel";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  acceptPartyWork,
  requestPartyWork,
} from "../presentation/campaign-life-actions";
import { projectPartyAndCommunityWork } from "../presentation/campaign-life-surface";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { drawRandomPlace } from "../../tests/support/random-place";
import { smallWorld } from "../../tests/fixtures/small-world";
import { ensureHomePartyChapters } from "../simulation/living-world/party-chapters";
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

const SEED = "ui47-campaign-life-mount";
const PLACE = drawRandomPlace(SEED);

function adultLife(): Life {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      startAge: 34,
      placeKey: PLACE.key,
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

function render(world: World, personId = life.personId): string {
  return renderToStaticMarkup(
    <CampaignLifePanel
      world={world}
      personId={personId}
      onWorldChange={() => {}}
    />,
  );
}

describe(`CampaignLifePanel as mounted (${PLACE.displayName}, seed ${SEED})`, () => {
  it("connects one Go to a canonical small-world saved request", () => {
    const fixture = smallWorld({
      place: PLACE.key,
      seed: SEED,
      offices: ["congress"],
      household: true,
    });
    const ready = ensureHomePartyChapters(fixture.world, fixture.personId);
    const chapter = homePartyChapters(ready)[0]!;
    expect(chapter).toBeDefined();
    const requested = requestPartyWork(
      ready,
      fixture.personId,
      "organization-meeting",
      chapter.organizationId,
    );
    const reopened = deserializeWorld(serializeWorld(requested));
    const row = projectPartyAndCommunityWork(reopened, fixture.personId)
      .rows[0]!;
    expect(row.actions).toEqual(["attend"]);
    expect(render(reopened, fixture.personId)).toContain(
      `party-work-attend-${row.lifeActivityId}`,
    );
    expect(projectCampaignLifeActivities(reopened, fixture.personId)).toEqual(
      projectCampaignLifeActivities(requested, fixture.personId),
    );
  });
  it("keeps a chapter visible after every request is saved and reopened", () => {
    let requested = life.world;
    const options = projectPartyAndCommunityWork(
      requested,
      life.personId,
    ).requestable.filter(
      (option) => option.hostOrganizationId === life.chapterId,
    );
    expect(options.map((option) => option.form)).toEqual([
      "organization-meeting",
      "door-canvass",
      "phone-shift",
      "candidate-guidance",
      "town-hall",
    ]);
    for (const option of options) {
      requested = requestPartyWork(
        requested,
        life.personId,
        option.form,
        life.chapterId,
      );
      const saved = projectCampaignLifeActivities(
        requested,
        life.personId,
      ).find(
        (activity) =>
          activity.form === option.form &&
          activity.hostOrganizationId === life.chapterId,
      );
      expect(saved).toBeDefined();
      expect(render(requested)).toContain(
        `party-work-${saved!.lifeActivityId}`,
      );
    }
    expect(
      projectPartyAndCommunityWork(requested, life.personId).requestable.filter(
        (option) => option.hostOrganizationId === life.chapterId,
      ),
    ).toHaveLength(0);
    const reopened = deserializeWorld(serializeWorld(requested));
    expect(render(reopened)).toContain(`party-work-requests-${life.chapterId}`);
    expect(projectCampaignLifeActivities(reopened, life.personId)).toEqual(
      projectCampaignLifeActivities(requested, life.personId),
    );
  });
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

  it("keeps the panel's own heading on either mount, with no standing disclaimer", () => {
    const html = render(life.world);
    expect(html).toContain('id="party-work-title"');
    expect(html).toContain("Party and community work");
    expect(html).not.toContain("not joining, endorsing or voting");
  });

  it("with an accepted remote phone shift, draws the row and the control that works it", () => {
    const html = render(withShift);
    expect(html).not.toContain('data-testid="party-work-empty"');
    expect(html).toContain('data-state="accepted"');
    expect(html).toContain("Phone shift");
    // A remote shift is worked from home: the one action is taking the shift,
    // and no journey is disclosed because none is traveled.
    expect(html).toContain("party-work-take-shift-");
    expect(html).toContain("Take the phone shift");
    expect(html).not.toContain("party-work-attend-condensed-");
  });

  it("shows no outcome for a shift that has not happened", () => {
    const html = render(withShift);
    expect(html).not.toContain("party-work-outcome-");
  });

  it("offers one Go for a saved in-person request, without mechanical travel prose", () => {
    const requested = requestPartyWork(
      life.world,
      life.personId,
      "organization-meeting",
      life.chapterId,
    );
    const row = projectPartyAndCommunityWork(requested, life.personId).rows[0]!;
    const html = render(requested);
    expect(row.actions).toEqual(["attend"]);
    expect(html).toContain(`party-work-attend-${row.lifeActivityId}`);
    expect(html).not.toContain(
      `party-work-attend-condensed-${row.lifeActivityId}`,
    );
    expect(html).not.toMatch(
      /Go briefly|same outcome|20-minute|no fare|Going briefly/,
    );
    expect(html).toContain(row.placeLabel);
  });
});
