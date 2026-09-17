import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import {
  GAME_ADULT_CANDIDACY_AGE,
  addDays,
  advanceWorld,
  ageOnDate,
  candidacyPackById,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  ensureCampaignOpponents,
  ensurePressDeskSchedule,
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  fileCampaign,
  fileRivalComplaint,
  makeCurrencyCode,
  performCampaignAction,
  scheduleCampaignAction,
  serializeWorld,
  simulationMomentAtLocalTime,
  type CampaignRecord,
  type EntityId,
  type World,
} from "../simulation";
import { KENTUCKY_CONTEXT } from "../simulation/legislation-scenarios";
import { PressDeskPanel } from "./PressDeskPanel";

const KY = KENTUCKY_CONTEXT.jurisdiction.id;
const HANDLERS = createCampaignElectionTransitionRegistry();

interface Fixture {
  readonly world: World;
  readonly playerId: EntityId;
}

interface CampaignFixture extends Fixture {
  readonly campaign: CampaignRecord;
  readonly rivalId: EntityId;
}

/** A funded campaign with a seeded press corps, as ordinary play produces. */
function campaignFixture(seed: string): CampaignFixture {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 7,
  });
  const playerId = created.personOrder.find(
    (id) =>
      ageOnDate(created.people[id]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  const base: World = {
    ...created,
    control: { kind: "person", personId: playerId },
  };
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "press-desk-mount",
    jurisdictionId: KY,
    count: 1,
    excludePersonIds: [playerId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "press-desk-mount",
    candidatePersonId: playerId,
    jurisdictionId: KY,
    officeKey: candidacyPackById("us-ky-general-assembly-v1:candidacy")!
      .offices[0]!.officeKey,
    electionDate: addDays(base.currentDate, 200),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Committee for the press desk mount",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  let world = filed.world;
  world = session(world, filed.campaign, "fundraising", null);
  world = session(world, filed.campaign, "advertising", 20_000);
  world = ensurePressMediaOpening(world, playerId);
  world = ensurePressStateCoverage(world, KY);
  world = ensurePressDeskSchedule(world);
  return {
    world,
    playerId,
    campaign: filed.campaign,
    rivalId: opponents.personIds[0]!,
  };
}

/** One campaign session, so the committee has money moving through it. */
function session(
  world: World,
  campaign: CampaignRecord,
  kind: "fundraising" | "advertising",
  spend: number | null,
): World {
  const date = addDays(world.currentDate, 1);
  const scheduled = scheduleCampaignAction(world, {
    campaignId: campaign.id,
    kind,
    plan: {
      start: moment(world, date, 10),
      end: moment(world, date, 11),
      location: {
        locationKey: `campaign-${kind}`,
        label: "Campaign work",
        jurisdictionId: KY,
      },
      title: `A ${kind} session`,
      summary: `A ${kind} session for the press desk mount.`,
    },
    spend:
      spend === null
        ? null
        : { minorUnits: spend, currency: campaign.treasuryCurrency },
  });
  return performCampaignAction(scheduled.world, scheduled.action.id);
}

function moment(world: World, date: string, hour: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay: hour * 60,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function days(world: World, count: number): World {
  let next = world;
  for (let day = 0; day < count; day += 1)
    next = advanceWorld(next, 1, HANDLERS);
  return next;
}

function render(world: World, personId: EntityId): string {
  return renderToStaticMarkup(
    <PressDeskPanel
      world={world}
      personId={personId}
      onWorldChange={() => {}}
      onOpenPerson={() => {}}
    />,
  );
}

let fresh: Fixture;
let covered: Fixture;

beforeAll(() => {
  fresh = {
    ...((): Fixture => {
      const created = createScenarioWorld(
        "press-desk-empty",
        KENTUCKY_CONTEXT,
        {
          peopleCount: 4,
        },
      );
      const playerId = created.personOrder[0]!;
      return {
        world: { ...created, control: { kind: "person", personId: playerId } },
        playerId,
      };
    })(),
  };
  const base = campaignFixture("press-desk-mount");
  const expenditure = base.world.history.resourceFlows.find(
    (flow) => flow.basisKind === "custom:campaign-expenditure",
  )!;
  const filed = fileRivalComplaint(base.world, {
    stableKey: "press-desk-mount:rival",
    campaign: base.campaign,
    rivalId: base.rivalId,
    playerId: base.playerId,
    expenditureFlowId: expenditure.id,
  });
  covered = { world: days(filed, 110), playerId: base.playerId };
}, 600_000);

describe("PressDeskPanel", () => {
  it("says plainly that nothing is waiting when the life has no press yet", () => {
    const html = render(fresh.world, fresh.playerId);
    expect(html).toContain('data-testid="press-desk-panel"');
    expect(html).toContain("No reporter is waiting on an answer from you.");
    expect(html).toContain("Nothing has been published about you yet.");
    expect(html).toContain("No matter about you is known to you.");
    expect(html).toContain("You have no ground rules agreed with a reporter.");
    expect(html).toContain("No news outlet is recorded here.");
    expect(html).not.toContain('data-testid="press-desk-story"');
  });

  it("shows the newsrooms, what was printed with its byline, and the matter", () => {
    const html = render(covered.world, covered.playerId);
    expect(html).toContain('data-testid="press-desk-outlets"');
    expect(html).not.toContain("No news outlet is recorded here.");
    expect(html).toContain('data-testid="press-desk-stories"');
    expect(html).toContain('data-testid="press-desk-story"');
    expect(html).toContain("· By ");
    expect(html).toContain('data-testid="press-desk-matter"');
    expect(html).not.toContain("Nothing has been published about you yet.");
  });

  it("marks a reporter the player has never met as no acquaintance", () => {
    const html = render(covered.world, covered.playerId);
    const introductions = html.split("— you have spoken").length - 1;
    const reporters = html.split('class="pg-inline-link"').length - 1;
    expect(reporters).toBeGreaterThan(0);
    expect(introductions).toBeLessThan(reporters);
  });

  it("writes nothing to the World when it is only read", () => {
    const before = serializeWorld(covered.world);
    render(covered.world, covered.playerId);
    expect(serializeWorld(covered.world)).toBe(before);
  });
});
