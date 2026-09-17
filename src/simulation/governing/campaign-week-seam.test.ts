import { describe, expect, it } from "vitest";

import {
  GAME_ADULT_CANDIDACY_AGE,
  addDays,
  ageOnDate,
  campaignActionById,
  campaignActionResult,
  campaignTreasuryPosition,
  candidacyPackById,
  commitCampaignWeek,
  createScenarioWorld,
  deserializeWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  performCampaignAction,
  performCampaignWeekSession,
  projectCampaignWeek,
  runCondensedCampaignWeek,
  scheduleCampaignAction,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "../index";
import type {
  CampaignRecord,
  CampaignWeekView,
  CommitCampaignWeekInput,
  EntityId,
  World,
} from "../index";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";

/**
 * The weekly plan across the shared clock.
 *
 * CAMPAIGN owns the plan and its own lane's proofs. This is the seam GOVERNING
 * owns: one immutable plan and revision, edit, commit and perform as separate
 * commands, and money that leaves the committee exactly once no matter which
 * way the week is played — session by session, condensed, or with the ordinary
 * clock running over the top of it. "Do this now" must never be a second
 * expenditure on a session that already happened.
 */

const PACK = "us-ky-general-assembly-v1:candidacy";

interface Filed {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly personId: EntityId;
}

function moment(world: World, date: string, minuteOfDay: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function fundedCampaign(seed: string): Filed {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const personId = created.personOrder.find(
    (candidate) =>
      ageOnDate(created.people[candidate]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  const base: World = { ...created, control: { kind: "person", personId } };
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "week-seam",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [personId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "week-seam",
    candidatePersonId: personId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: candidacyPackById(PACK)!.offices[0]!.officeKey,
    electionDate: addDays(base.currentDate, 45),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the week-seam test",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  const day = addDays(base.currentDate, 1);
  const raise = scheduleCampaignAction(filed.world, {
    campaignId: filed.campaign.id,
    kind: "fundraising",
    plan: {
      start: moment(filed.world, day, 8 * 60),
      end: moment(filed.world, day, 9 * 60),
      location: {
        locationKey: "campaign-call-desk",
        label: "The campaign's call desk",
        jurisdictionId: filed.campaign.jurisdictionId,
      },
      title: "A first call session",
      summary: "Raising the first money for the seam fixture.",
    },
    spend: null,
  });
  return {
    world: performCampaignAction(raise.world, raise.action.id),
    campaign: filed.campaign,
    personId,
  };
}

const treasury = (filed: Filed, world: World) =>
  campaignTreasuryPosition(world, filed.campaign)!.liquidBalance.minorUnits;

function inputFor(
  view: CampaignWeekView,
  overrides: Partial<CommitCampaignWeekInput> = {},
): CommitCampaignWeekInput {
  return {
    campaignId: view.campaignId,
    weekStart: view.weekStart,
    proposerPersonId: view.proposerPersonId,
    revision: view.revision,
    emphasis: "communications",
    allocation: { fieldShifts: 1, fundraisingSessions: 1, advertisingBuys: 2 },
    advertising: {
      channel: "digital",
      geographyKey: view.geographyChoices[0]!.key,
      amount: { minorUnits: 20_000, currency: view.treasury.currency },
    },
    ...overrides,
  };
}

describe("GOVERNING D2: the weekly plan across the shared clock", () => {
  it("commits one version, and a session's money leaves the committee once", () => {
    const filed = fundedCampaign("week-seam-once");
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    const committed = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view),
    );

    // Editing is a separate command: a plan drawn up against an older
    // revision is refused, and nothing is written.
    const before = serializeWorld(committed);
    expect(() =>
      commitCampaignWeek(
        committed,
        filed.personId,
        inputFor(view, { revision: view.revision }),
      ),
    ).toThrow();
    expect(serializeWorld(committed)).toBe(before);

    // Committing reserves nothing: the money is still the committee's.
    expect(treasury(filed, committed)).toBe(treasury(filed, filed.world));

    const plan = projectCampaignWeek(committed, filed.personId)!;
    const buy = plan.committed!.sessions.find(
      (session) => session.kind === "advertising",
    )!;
    // The plan insists on its own order, so the week is played in it.
    let performed = committed;
    let spent = 0;
    for (const session of plan.committed!.sessions) {
      const before = treasury(filed, performed);
      performed = performCampaignWeekSession(
        performed,
        filed.personId,
        session.actionId,
      );
      if (session.actionId === buy.actionId)
        spent = before - treasury(filed, performed);
      if (session.actionId === buy.actionId) break;
    }
    expect(spent).toBeGreaterThan(0);
    const afterBuy = treasury(filed, performed);

    // "Do this now" on a session that already happened is refused, and the
    // committee's money does not move a second time.
    expect(() =>
      performCampaignWeekSession(performed, filed.personId, buy.actionId),
    ).toThrow(/already done/);
    expect(treasury(filed, performed)).toBe(afterBuy);
    expect(campaignActionResult(performed, buy.actionId)).toBeTruthy();

    // The ordinary clock running over the week does not pay for it again.
    const afterTime = passOrdinaryDays(performed, 9);
    expect(treasury(filed, afterTime)).toBe(afterBuy);
    expect(
      (afterTime.history.campaignActionResults ?? []).filter(
        (row) => row.campaignActionId === buy.actionId,
      ),
    ).toHaveLength(1);

    // And a condensed run afterwards does not re-spend what is already done.
    const condensed = runCondensedCampaignWeek(
      performed,
      filed.personId,
      plan.committed!.planId,
    );
    expect(
      (condensed.history.campaignActionResults ?? []).filter(
        (row) => row.campaignActionId === buy.actionId,
      ),
    ).toHaveLength(1);
    expect(campaignActionById(condensed, buy.actionId)).toBeTruthy();

    // Reopening the save keeps exactly one payment for that session.
    const reopened = deserializeWorld(serializeWorld(condensed));
    expect(treasury(filed, reopened)).toBe(treasury(filed, condensed));
  }, 900_000);
});
