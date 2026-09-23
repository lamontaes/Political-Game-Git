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
  releaseCampaignWeekSession,
  runCondensedCampaignWeek,
  scheduleCampaignAction,
  scheduledActivityState,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "./index";
import type {
  CampaignRecord,
  CampaignWeekView,
  CommitCampaignWeekInput,
  EntityId,
  World,
} from "./index";
import { canonicalJson } from "./canonical-json";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { advanceWorld, assertWorldIntegrity, recordWorldEvent } from "./world";
import { passOrdinaryDays } from "../presentation/ordinary-life";

const KENTUCKY_PACK = "us-ky-general-assembly-v1:candidacy";

interface Filed {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly personId: EntityId;
  readonly staffPersonIds: readonly EntityId[];
}

function moment(world: World, date: string, minuteOfDay: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

/**
 * A Kentucky candidate who has already done one fundraising session on the
 * morning after filing, so the committee has real money and the clock stands
 * at 09:00 with the whole planning day ahead.
 */
function fundedCampaign(
  seed: string,
  options: { staffCount?: number; electionInDays?: number } = {},
): Filed {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const personId = created.personOrder.find(
    (candidate) =>
      ageOnDate(created.people[candidate]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  const base: World = { ...created, control: { kind: "person", personId } };
  const staffPersonIds = base.personOrder
    .filter((candidate) => candidate !== personId)
    .filter(
      (candidate) =>
        ageOnDate(base.people[candidate]!.birthDate, base.currentDate) >=
        GAME_ADULT_CANDIDACY_AGE,
    )
    .slice(0, options.staffCount ?? 0);
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "weekly-plan-test",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [personId, ...staffPersonIds],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "weekly-plan-test",
    candidatePersonId: personId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: candidacyPackById(KENTUCKY_PACK)!.offices[0]!.officeKey,
    electionDate: addDays(base.currentDate, options.electionInDays ?? 45),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the weekly plan test",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds,
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
      summary: "Raising the first money for the test fixture.",
    },
    spend: null,
  });
  return {
    world: performCampaignAction(raise.world, raise.action.id),
    campaign: filed.campaign,
    personId,
    staffPersonIds,
  };
}

function treasury(filed: Filed, world: World): number {
  return campaignTreasuryPosition(world, filed.campaign)!.liquidBalance
    .minorUnits;
}

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

/** Everything a refused plan must leave untouched. */
function untouched(world: World, filed: Filed): string {
  return canonicalJson({
    treasury: treasury(filed, world),
    resourceFlows: world.history.resourceFlows,
    actions: world.history.campaignActions ?? [],
    results: world.history.campaignActionResults ?? [],
    activities: world.history.scheduledActivities,
    activityStates: world.history.scheduledActivityStates,
    metricStates: world.history.metricStates,
    currentMoment: world.currentMoment,
  });
}

function planWeek(filed: Filed, world = filed.world): World {
  const view = projectCampaignWeek(world, filed.personId)!;
  return commitCampaignWeek(world, filed.personId, inputFor(view));
}

describe("weekly campaign plans", { timeout: 900_000 }, () => {
  it("books the no-staff plan on concrete free slots and moves no money until performed", () => {
    const filed = fundedCampaign("weekly-solo");
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    expect(view.proposerPersonId).toBeNull();
    expect(view.attribution).toMatch(/without campaign staff/);
    expect(view.proposal).toBeNull();
    expect(view.proposedEmphasis).toBeNull();
    expect(view.weekStart).toBe(filed.world.currentDate);
    expect(view.weekEnd).toBe(addDays(filed.world.currentDate, 6));
    expect(view.options.map((option) => option.emphasis)).toEqual([
      "field",
      "communications",
      "relationships",
    ]);
    expect(view.options.flatMap((option) => option.reasons).join(" ")).toMatch(
      /committee has \$\d/,
    );
    expect(view.reachNote).toMatch(/not modeled/);
    expect(
      view.channels.every((channel) => channel.reach === "not-modeled"),
    ).toBe(true);
    expect(view.geographyChoices.map((choice) => choice.kind)).toEqual([
      "jurisdiction",
    ]);

    const before = treasury(filed, filed.world);
    const planned = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view),
    );
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    expect(plan.status).toBe("committed");
    expect(plan.proposerPersonId).toBeNull();
    expect(treasury(filed, planned)).toBe(before);
    expect(planned.history.metricStates).toEqual(
      filed.world.history.metricStates,
    );
    const actions = plan.scheduledActionIds.map((id) =>
      campaignActionById(planned, id)!,
    );
    expect(actions.map((action) => action.kind)).toEqual([
      "outreach",
      "fundraising",
      "advertising",
      "advertising",
    ]);
    const today = filed.world.currentDate;
    const tomorrow = addDays(today, 1);
    const slots = actions.map((action) => {
      const state = scheduledActivityState(planned, action.scheduledActivityId);
      return [state.start.date, state.start.minuteOfDay, state.end.minuteOfDay];
    });
    expect(slots).toEqual([
      [today, 600, 690],
      [today, 840, 900],
      [today, 1080, 1110],
      [tomorrow, 600, 630],
    ]);
    expect(actions[0]!.strategy).toMatchObject({
      proposerPersonId: null,
      proposedActionKind: "advertising",
      geographyKind: "jurisdiction",
      approvedSpendCeiling: { minorUnits: 0 },
    });
    expect(actions[2]!.plannedSpend?.minorUnits).toBe(20_000);
    expect(actions[2]!.strategy?.approvedSpendCeiling.minorUnits).toBe(20_000);

    const committedView = projectCampaignWeek(planned, filed.personId)!;
    expect(committedView.committed?.planId).toBe(plan.id);
    expect(committedView.committed?.nextActionId).toBe(actions[0]!.id);
    expect(committedView.revision).not.toBe(view.revision);
    expect(() =>
      commitCampaignWeek(planned, filed.personId, inputFor(committedView)),
    ).toThrow(/already committed/);
  });

  it("spends exactly buys × amount when performed and moves support only through action results", () => {
    const filed = fundedCampaign("weekly-perform");
    const planned = planWeek(filed);
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    const before = treasury(filed, planned);
    const done = runCondensedCampaignWeek(planned, filed.personId, plan.id);

    const results = plan.scheduledActionIds.map((id) =>
      campaignActionResult(done, id)!,
    );
    expect(results.every(Boolean)).toBe(true);
    const raised = results.reduce(
      (sum, result) => sum + (result.raisedAmount?.minorUnits ?? 0),
      0,
    );
    const spent = results.reduce(
      (sum, result) => sum + (result.spentAmount?.minorUnits ?? 0),
      0,
    );
    expect(spent).toBe(2 * 20_000);
    expect(treasury(filed, done)).toBe(before + raised - spent);

    const supportFromResults = new Set(
      results.flatMap((result) => result.supportStateIds),
    );
    const newStates = done.history.metricStates
      .slice(planned.history.metricStates.length)
      .filter((state) => state.metricId === filed.campaign.supportMetricId);
    expect(newStates.length).toBeGreaterThan(0);
    for (const state of newStates) {
      expect(supportFromResults.has(state.id)).toBe(true);
    }
    expect(
      projectCampaignWeek(done, filed.personId)!.committed?.nextActionId,
    ).toBeNull();
  });

  it("records an underfunded plan as refused and leaves money, calendar and support byte-identical", () => {
    const filed = fundedCampaign("weekly-underfunded");
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    const refused = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view, {
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 3,
        },
        advertising: {
          channel: "digital",
          geographyKey: view.geographyChoices[0]!.key,
          amount: { minorUnits: 100_000, currency: view.treasury.currency },
        },
      }),
    );
    const plan = refused.history.campaignWeeklyPlans!.at(-1)!;
    expect(plan).toMatchObject({
      status: "refused",
      refusal: "insufficient-funds",
      scheduledActionIds: [],
      treasuryAtDecision: view.treasury,
    });
    expect(untouched(refused, filed)).toBe(untouched(filed.world, filed));
    const after = projectCampaignWeek(refused, filed.personId)!;
    expect(after.lastRefusal?.refusal).toBe("insufficient-funds");
    expect(after.committed).toBeNull();
    // A refusal does not lock the week: a smaller plan can still be committed.
    const replanned = commitCampaignWeek(
      refused,
      filed.personId,
      inputFor(after),
    );
    expect(replanned.history.campaignWeeklyPlans!.at(-1)!.status).toBe(
      "committed",
    );
  });

  it("records channel capacity, empty and no-free-time refusals without booking anything", () => {
    const filed = fundedCampaign("weekly-refusals");
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    const overCapacity = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view, {
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 3,
        },
        advertising: {
          channel: "radio",
          geographyKey: view.geographyChoices[0]!.key,
          amount: { minorUnits: 20_000, currency: view.treasury.currency },
        },
      }),
    );
    expect(overCapacity.history.campaignWeeklyPlans!.at(-1)!.refusal).toBe(
      "channel-capacity",
    );
    expect(untouched(overCapacity, filed)).toBe(untouched(filed.world, filed));

    const belowMinimum = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view, {
        advertising: {
          channel: "digital",
          geographyKey: view.geographyChoices[0]!.key,
          amount: { minorUnits: 4_000, currency: view.treasury.currency },
        },
      }),
    );
    expect(belowMinimum.history.campaignWeeklyPlans!.at(-1)!.refusal).toBe(
      "channel-capacity",
    );

    const empty = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view, {
        emphasis: "field",
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 0,
        },
        advertising: null,
      }),
    );
    expect(empty.history.campaignWeeklyPlans!.at(-1)!.refusal).toBe(
      "empty-plan",
    );

    // Two days to the election leaves one working day with two open slots.
    const short = fundedCampaign("weekly-no-time", { electionInDays: 2 });
    const shortView = projectCampaignWeek(short.world, short.personId)!;
    expect(shortView.weekEnd).toBe(shortView.weekStart);
    const noTime = commitCampaignWeek(
      short.world,
      short.personId,
      inputFor(shortView, {
        emphasis: "field",
        allocation: {
          fieldShifts: 3,
          fundraisingSessions: 1,
          advertisingBuys: 0,
        },
        advertising: null,
      }),
    );
    expect(noTime.history.campaignWeeklyPlans!.at(-1)!.refusal).toBe(
      "no-free-time",
    );
    expect(untouched(noTime, short)).toBe(untouched(short.world, short));
  });

  it("throws without writing for stale or malformed input", () => {
    const filed = fundedCampaign("weekly-stale");
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    const attempts: Partial<CommitCampaignWeekInput>[] = [
      { revision: `${view.revision}:stale` },
      { weekStart: addDays(view.weekStart, -1) },
      { proposerPersonId: filed.campaign.candidatePersonId },
      {
        allocation: {
          fieldShifts: -1,
          fundraisingSessions: 0,
          advertisingBuys: 2,
        },
      },
      {
        allocation: {
          fieldShifts: 1.5,
          fundraisingSessions: 0,
          advertisingBuys: 2,
        },
      },
      {
        allocation: {
          fieldShifts: 4,
          fundraisingSessions: 2,
          advertisingBuys: 2,
        },
      },
      {
        advertising: {
          channel: "digital",
          geographyKey: "jurisdiction:somewhere-else",
          amount: { minorUnits: 20_000, currency: view.treasury.currency },
        },
      },
      {
        advertising: {
          channel: "billboards" as never,
          geographyKey: view.geographyChoices[0]!.key,
          amount: { minorUnits: 20_000, currency: view.treasury.currency },
        },
      },
      { advertising: null },
    ];
    for (const attempt of attempts) {
      expect(() =>
        commitCampaignWeek(
          filed.world,
          filed.personId,
          inputFor(view, attempt),
        ),
      ).toThrow();
    }
    expect(filed.world.history.campaignWeeklyPlans ?? []).toEqual([]);

    // Money that changed after the proposal makes the proposal stale.
    const later = performCampaignWeekSessionless(filed);
    expect(() =>
      commitCampaignWeek(later, filed.personId, inputFor(view)),
    ).toThrow(/changed/);

    // Only the caller's three counts and the amount are stored, never extra
    // keys a surface happened to pass along.
    const sloppy = commitCampaignWeek(filed.world, filed.personId, {
      ...inputFor(view),
      allocation: {
        fieldShifts: 1,
        fundraisingSessions: 1,
        advertisingBuys: 2,
        note: undefined,
      } as CommitCampaignWeekInput["allocation"],
      advertising: {
        channel: "digital",
        geographyKey: view.geographyChoices[0]!.key,
        amount: {
          minorUnits: 20_000,
          currency: view.treasury.currency,
          extra: "x",
        } as never,
      },
    });
    const stored = sloppy.history.campaignWeeklyPlans!.at(-1)!;
    expect(Object.keys(stored.allocation).sort()).toEqual([
      "advertisingBuys",
      "fieldShifts",
      "fundraisingSessions",
    ]);
    expect(Object.keys(stored.advertising!.amount).sort()).toEqual([
      "currency",
      "minorUnits",
    ]);

    // With nothing in the account, a communications week is not offered and
    // cannot be committed.
    const broke = drainTreasury(filed);
    const brokeView = projectCampaignWeek(broke, filed.personId)!;
    expect(brokeView.treasury.minorUnits).toBe(0);
    expect(brokeView.options.map((option) => option.emphasis)).toEqual([
      "field",
      "relationships",
    ]);
    expect(brokeView.channels.every((channel) => !channel.affordable)).toBe(
      true,
    );
    expect(() =>
      commitCampaignWeek(broke, filed.personId, inputFor(brokeView)),
    ).toThrow(/not one of this week's options/);
    const brokeRefusal = commitCampaignWeek(
      broke,
      filed.personId,
      inputFor(brokeView, { emphasis: "field" }),
    );
    expect(brokeRefusal.history.campaignWeeklyPlans!.at(-1)).toMatchObject({
      status: "refused",
      refusal: "insufficient-funds",
      treasuryAtDecision: { minorUnits: 0 },
    });
  });

  it("returns the same world while an earlier commitment is in the way, and a condensed week stops there", () => {
    const filed = fundedCampaign("weekly-blocked");
    const planned = planWeek(filed);
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    const first = plan.scheduledActionIds[0]!;
    // Something the candidate promised before the first session.
    const other = performCampaignWeekSessionlessSchedule(planned, filed);
    expect(performCampaignWeekSession(other.world, filed.personId, first)).toBe(
      other.world,
    );
    expect(runCondensedCampaignWeek(other.world, filed.personId, plan.id)).toBe(
      other.world,
    );
    const cleared = performCampaignAction(other.world, other.actionId);
    const done = runCondensedCampaignWeek(cleared, filed.personId, plan.id);
    expect(
      plan.scheduledActionIds.every((id) => campaignActionResult(done, id)),
    ).toBe(true);
  });

  it("offers nothing and refuses a commit once the contest is decided", () => {
    const filed = fundedCampaign("weekly-election-day", { electionInDays: 2 });
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    expect(view.electionPassed).toBe(false);
    expect(view.weekEnd).toBe(view.weekStart);
    // Crossing into election day decides the contest in this World, so the
    // recorded "election-passed" refusal is a guard for a still-open contest.
    let world = filed.world;
    for (let day = 0; day < 3; day += 1) {
      if (projectCampaignWeek(world, filed.personId) === null) break;
      world = passOrdinaryDays(world, 1);
    }
    expect(projectCampaignWeek(world, filed.personId)).toBeNull();
    const before = canonicalJson(world);
    expect(() =>
      commitCampaignWeek(
        world,
        filed.personId,
        inputFor(view, {
          emphasis: "field",
          allocation: {
            fieldShifts: 1,
            fundraisingSessions: 0,
            advertisingBuys: 0,
          },
          advertising: null,
        }),
      ),
    ).toThrow();
    expect(canonicalJson(world)).toBe(before);
    expect(world.history.campaignWeeklyPlans ?? []).toEqual([]);
  });

  it("attributes the plan to active staff and books them into the sessions", () => {
    const filed = fundedCampaign("weekly-staffed", { staffCount: 1 });
    const staffPersonId = filed.staffPersonIds[0]!;
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    expect(view.proposerPersonId).toBe(staffPersonId);
    expect(view.attribution).toMatch(/active campaign staff member/);
    expect(view.proposal).toMatch(/proposes/);
    expect(view.proposedEmphasis).toBe("communications");
    const planned = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view),
    );
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    expect(plan.proposerPersonId).toBe(staffPersonId);
    for (const actionId of plan.scheduledActionIds) {
      const action = campaignActionById(planned, actionId)!;
      expect(action.strategy?.proposerPersonId).toBe(staffPersonId);
      const activity = planned.history.scheduledActivities.find(
        (candidate) => candidate.id === action.scheduledActivityId,
      )!;
      expect(activity.participantPersonIds).toContain(staffPersonId);
    }
    expect(() =>
      commitCampaignWeek(
        filed.world,
        filed.personId,
        inputFor(view, { proposerPersonId: null }),
      ),
    ).toThrow(/staff situation changed/);
  });

  it("insists on time order and refuses an unaffordable buy at sign-off without writing", () => {
    const filed = fundedCampaign("weekly-order");
    const view = projectCampaignWeek(filed.world, filed.personId)!;
    const money = treasury(filed, filed.world);
    const planned = commitCampaignWeek(
      filed.world,
      filed.personId,
      inputFor(view, {
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 2,
        },
        advertising: {
          channel: "digital",
          geographyKey: view.geographyChoices[0]!.key,
          amount: {
            minorUnits: Math.floor(money / 2 / 100) * 100,
            currency: view.treasury.currency,
          },
        },
      }),
    );
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    const [first, second] = plan.scheduledActionIds;
    expect(() =>
      performCampaignWeekSession(planned, filed.personId, second!),
    ).toThrow(/earlier session/);

    // Something else drains the committee between the two sign-offs.
    const afterFirst = performCampaignWeekSession(
      planned,
      filed.personId,
      first!,
    );
    const drain = scheduleCampaignAction(afterFirst, {
      campaignId: filed.campaign.id,
      kind: "advertising",
      plan: {
        start: afterFirst.currentMoment,
        end: moment(
          afterFirst,
          afterFirst.currentDate,
          afterFirst.currentMoment.minuteOfDay + 5,
        ),
        location: {
          locationKey: "campaign-office",
          label: "The campaign office",
          jurisdictionId: filed.campaign.jurisdictionId,
        },
        title: "An unplanned buy",
        summary: "Spending what is left outside the weekly plan.",
      },
      spend: {
        minorUnits: treasury(filed, afterFirst),
        currency: view.treasury.currency,
      },
    });
    const drained = performCampaignAction(drain.world, drain.action.id);
    expect(treasury(filed, drained)).toBe(0);
    expect(() =>
      performCampaignWeekSession(drained, filed.personId, second!),
    ).toThrow(/no longer has enough money/);
    expect(campaignActionResult(drained, second!)).toBeFalsy();
  });

  it("gives the same world whether the week is condensed or done session by session", () => {
    const filed = fundedCampaign("weekly-condensed");
    const planned = planWeek(filed);
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    const condensed = runCondensedCampaignWeek(
      planned,
      filed.personId,
      plan.id,
    );
    let oneByOne = planned;
    for (;;) {
      const next = projectCampaignWeek(oneByOne, filed.personId)!.committed!
        .nextActionId;
      if (!next) break;
      oneByOne = performCampaignWeekSession(oneByOne, filed.personId, next);
    }
    expect(canonicalJson(condensed)).toBe(canonicalJson(oneByOne));
  });

  it("continues a week identically after a save and reopen", () => {
    const filed = fundedCampaign("weekly-save");
    const planned = planWeek(filed);
    const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
    const midWeek = performCampaignWeekSession(
      planned,
      filed.personId,
      plan.scheduledActionIds[0]!,
    );
    const reopened = deserializeWorld(serializeWorld(midWeek));
    expect(canonicalJson(reopened)).toBe(canonicalJson(midWeek));
    const straight = runCondensedCampaignWeek(midWeek, filed.personId, plan.id);
    const resumed = runCondensedCampaignWeek(reopened, filed.personId, plan.id);
    expect(canonicalJson(resumed)).toBe(canonicalJson(straight));
    expect(canonicalJson(deserializeWorld(serializeWorld(straight)))).toBe(
      canonicalJson(straight),
    );
  });

  it("is deterministic per seed and differs across seeds", () => {
    const run = (seed: string) => {
      const filed = fundedCampaign(seed);
      const planned = planWeek(filed);
      const plan = planned.history.campaignWeeklyPlans!.at(-1)!;
      return runCondensedCampaignWeek(planned, filed.personId, plan.id);
    };
    const first = run("weekly-seed-a");
    const again = run("weekly-seed-a");
    const other = run("weekly-seed-b");
    expect(canonicalJson(again)).toBe(canonicalJson(first));
    expect(canonicalJson(other)).not.toBe(canonicalJson(first));
    for (const world of [first, other]) {
      const plan = world.history.campaignWeeklyPlans!.at(-1)!;
      expect(plan.status).toBe("committed");
      expect(
        plan.scheduledActionIds.every((id) => campaignActionResult(world, id)),
      ).toBe(true);
    }
  });

  it("plans a new week after each one ends, for six weeks, with ordinary days between", () => {
    const filed = fundedCampaign("weekly-six-weeks");
    let world = filed.world;
    const committed: string[] = [];
    for (let week = 0; week < 6; week += 1) {
      const view = projectCampaignWeek(world, filed.personId);
      expect(view, `week ${week} view`).not.toBeNull();
      expect(view!.committed).toBeNull();
      world = commitCampaignWeek(
        world,
        filed.personId,
        inputFor(view!, {
          emphasis: "field",
          allocation: {
            fieldShifts: 2,
            fundraisingSessions: 1,
            advertisingBuys: 0,
          },
          advertising: null,
        }),
      );
      const plan = world.history.campaignWeeklyPlans!.at(-1)!;
      expect(plan.status, `week ${week}`).toBe("committed");
      committed.push(plan.weekStart);
      world = runCondensedCampaignWeek(world, filed.personId, plan.id);
      expect(
        plan.scheduledActionIds.every((id) => campaignActionResult(world, id)),
      ).toBe(true);
      const nextWeek = addDays(plan.weekEnd, 1);
      const days = Math.round(
        (Date.parse(`${nextWeek}T00:00:00Z`) -
          Date.parse(`${world.currentDate}T00:00:00Z`)) /
          86_400_000,
      );
      world = passOrdinaryDays(world, days);
      expect(world.currentDate).toBe(nextWeek);
    }
    expect(new Set(committed).size).toBe(6);
    assertWorldIntegrity(world);
  });

  it("never dead-ends time when a committed week is never performed", () => {
    // Three weeks of a candidate who plans every week and never does any of
    // it. A booked session is a confirmed commitment, so ordinary time stops
    // at its start; letting it go is an explicit, recorded choice, after which
    // the days keep passing and the next week can still be planned.
    const filed = fundedCampaign("weekly-never-performed");
    const start = filed.world.currentDate;
    const moneyBefore = treasury(filed, filed.world);
    const supportBefore = filed.world.history.metricStates.length;
    const fieldWeek = (view: CampaignWeekView) =>
      inputFor(view, {
        emphasis: "field",
        allocation: {
          fieldShifts: 2,
          fundraisingSessions: 0,
          advertisingBuys: 0,
        },
        advertising: null,
      });
    let world = filed.world;
    let stops = 0;
    let passes = 0;
    const planIds: EntityId[] = [];
    while (world.currentDate < addDays(start, 21)) {
      passes += 1;
      expect(passes, "time must keep moving").toBeLessThan(80);
      const view = projectCampaignWeek(world, filed.personId)!;
      if (!view.committed) {
        world = commitCampaignWeek(world, filed.personId, fieldWeek(view));
        const plan = world.history.campaignWeeklyPlans!.at(-1)!;
        expect(plan.status).toBe("committed");
        planIds.push(plan.id);
        continue;
      }
      const passed = passOrdinaryDays(world, 1);
      if (compareMoments(passed, world) !== 0) {
        world = passed;
        continue;
      }
      // The clock is held by a planned session: it is not done, it is let go.
      const holding = view.committed.holdingActionId;
      expect(holding, `stuck on ${world.currentDate}`).not.toBeNull();
      expect(view.committed.nextActionId).toBe(holding);
      world = releaseCampaignWeekSession(world, filed.personId, holding!);
      stops += 1;
      expect(() =>
        releaseCampaignWeekSession(world, filed.personId, holding!),
      ).toThrow(/no longer on the calendar/);
      expect(() =>
        performCampaignWeekSession(world, filed.personId, holding!),
      ).toThrow(/no longer on the calendar/);
    }
    expect(world.currentDate >= addDays(start, 21)).toBe(true);
    expect(planIds.length).toBeGreaterThanOrEqual(3);
    const actionIds = world.history
      .campaignWeeklyPlans!.filter((plan) => planIds.includes(plan.id))
      .flatMap((plan) => plan.scheduledActionIds);
    expect(stops).toBeGreaterThan(0);
    for (const actionId of actionIds) {
      expect(campaignActionResult(world, actionId)).toBeFalsy();
    }
    const releases = world.history.events.filter(
      (event) => event.type === "campaign.weekly-session-released",
    );
    // Every session of a finished week was let go; the current week's
    // sessions that have not come up yet are still on the calendar.
    expect(releases.length).toBe(stops);
    expect(
      releases.every((event) =>
        event.participants.every((p) => p.role === "agency:candidate"),
      ),
    ).toBe(true);
    // Nothing done means nothing spent, raised or moved.
    expect(treasury(filed, world)).toBe(moneyBefore);
    // Support may still move because the other side campaigns on its own
    // (recorded opponent steps); none of it comes from the released sessions.
    const opponentStateIds = new Set(
      (world.history.campaignOpponentSteps ?? []).flatMap(
        (step) => step.supportStateIds,
      ),
    );
    expect(world.history.campaignActionResults?.length).toBe(
      filed.world.history.campaignActionResults?.length,
    );
    for (const state of world.history.metricStates
      .slice(supportBefore)
      .filter((state) => state.metricId === filed.campaign.supportMetricId)) {
      expect(opponentStateIds.has(state.id), state.stableKey).toBe(true);
    }
    // And the current week still accepts a plan once its own ends.
    const latest = world.history.campaignWeeklyPlans!.at(-1)!;
    expect(latest.status).toBe("committed");
    assertWorldIntegrity(world);
    expect(canonicalJson(deserializeWorld(serializeWorld(world)))).toBe(
      canonicalJson(world),
    );
  });

  it("releases an earlier week's sessions with a recorded reason when the clock jumped past them", () => {
    const filed = fundedCampaign("weekly-jumped");
    const planned = planWeek(filed);
    const first = planned.history.campaignWeeklyPlans!.at(-1)!;
    const moneyBefore = treasury(filed, planned);
    // A date-level jump (the fixture clock) steps over confirmed holds.
    const jumped = advanceWorld(
      planned,
      8,
      createCampaignElectionTransitionRegistry(),
    );
    const view = projectCampaignWeek(jumped, filed.personId)!;
    expect(view.committed).toBeNull();
    expect(
      first.scheduledActionIds.every(
        (id) =>
          scheduledActivityState(
            jumped,
            campaignActionById(jumped, id)!.scheduledActivityId,
          ).status === "scheduled",
      ),
    ).toBe(true);
    expect(() =>
      performCampaignWeekSession(
        jumped,
        filed.personId,
        first.scheduledActionIds[0]!,
      ),
    ).toThrow(/already passed/);

    // A refused plan still releases nothing: the refusal writes only itself.
    const refused = commitCampaignWeek(
      jumped,
      filed.personId,
      inputFor(view, {
        emphasis: "field",
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 0,
        },
        advertising: null,
      }),
    );
    expect(refused.history.events).toEqual(jumped.history.events);
    expect(refused.history.scheduledActivityStates).toEqual(
      jumped.history.scheduledActivityStates,
    );

    const next = commitCampaignWeek(jumped, filed.personId, inputFor(view));
    const second = next.history.campaignWeeklyPlans!.at(-1)!;
    expect(second.status).toBe("committed");
    for (const id of first.scheduledActionIds) {
      const action = campaignActionById(next, id)!;
      expect(
        scheduledActivityState(next, action.scheduledActivityId).status,
      ).toBe("cancelled");
      expect(campaignActionResult(next, id)).toBeFalsy();
    }
    const releases = next.history.events.filter(
      (event) => event.type === "campaign.weekly-session-released",
    );
    expect(releases).toHaveLength(first.scheduledActionIds.length);
    expect(releases[0]!.summary).toMatch(/week ended before it was done/);
    expect(releases[0]!.involvedEntityIds).toContain(first.id);
    expect(treasury(filed, next)).toBe(moneyBefore);
    // The new week is fully doable.
    const done = runCondensedCampaignWeek(next, filed.personId, second.id);
    expect(
      second.scheduledActionIds.every((id) => campaignActionResult(done, id)),
    ).toBe(true);
  });

  it("counts only public opponent campaign events in this contest as known", () => {
    const filed = fundedCampaign("weekly-opponent-facts");
    const reasons = (world: World) =>
      projectCampaignWeek(world, filed.personId)!
        .options.find((option) => option.emphasis === "communications")!
        .reasons.join(" ");
    expect(reasons(filed.world)).toMatch(/No public campaign events/);
    const event = (
      world: World,
      key: string,
      visibility: "public" | "limited",
    ) =>
      recordWorldEvent(world, {
        stableKey: `weekly-test:${key}`,
        type: "campaign.opponent-field-event",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: filed.campaign.jurisdictionId,
        involvedEntityIds: [filed.campaign.contestId],
        participants: [],
        personFactConstraints: [],
        visibility,
        tags: ["campaign.opponent"],
        summary: "The other side held an event.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    const hidden = event(filed.world, "limited", "limited");
    expect(reasons(hidden)).toMatch(/No public campaign events/);
    const known = event(hidden, "public", "public");
    expect(reasons(known)).toMatch(/1 public campaign event by the other side/);
  });

  it("rejects a committed plan whose actions were tampered with", () => {
    const filed = fundedCampaign("weekly-integrity");
    const planned = planWeek(filed);
    const plans = planned.history.campaignWeeklyPlans!;
    const plan = plans.at(-1)!;
    const tampered: World = {
      ...planned,
      history: {
        ...planned.history,
        campaignWeeklyPlans: [
          ...plans.slice(0, -1),
          { ...plan, scheduledActionIds: plan.scheduledActionIds.slice(1) },
        ],
      },
    };
    expect(() => assertWorldIntegrity(tampered)).toThrow(/allocation/);
    const refusedWithActions: World = {
      ...planned,
      history: {
        ...planned.history,
        campaignWeeklyPlans: [
          ...plans.slice(0, -1),
          { ...plan, status: "refused", refusal: "empty-plan" },
        ],
      },
    };
    expect(() => assertWorldIntegrity(refusedWithActions)).toThrow(/status/);
    const wrongEmphasis: World = {
      ...planned,
      history: {
        ...planned.history,
        campaignWeeklyPlans: [
          ...plans.slice(0, -1),
          { ...plan, chosenEmphasis: "field" },
        ],
      },
    };
    expect(() => assertWorldIntegrity(wrongEmphasis)).toThrow(/linkage/);
    const shiftedWeek: World = {
      ...planned,
      history: {
        ...planned.history,
        campaignWeeklyPlans: [
          ...plans.slice(0, -1),
          { ...plan, weekEnd: plan.weekStart },
        ],
      },
    };
    expect(() => assertWorldIntegrity(shiftedWeek)).toThrow(/outside its week/);
    const radioDistrict: World = {
      ...planned,
      history: {
        ...planned.history,
        campaignWeeklyPlans: [
          ...plans.slice(0, -1),
          {
            ...plan,
            advertising: { ...plan.advertising!, channel: "radio" },
          },
        ],
      },
    };
    // Radio is jurisdiction-only, and this fixture's buys are jurisdiction-wide,
    // so the channel change alone stays valid; a district kind would not.
    expect(() => assertWorldIntegrity(radioDistrict)).not.toThrow();
    const badKind: World = {
      ...planned,
      history: {
        ...planned.history,
        campaignWeeklyPlans: [
          ...plans.slice(0, -1),
          {
            ...plan,
            advertising: {
              ...plan.advertising!,
              channel: "radio",
              geographyKind: "district",
            },
          },
        ],
      },
    };
    expect(() => assertWorldIntegrity(badKind)).toThrow(/advertising/);
  });
});

function compareMoments(left: World, right: World): number {
  return canonicalJson(left.currentMoment) ===
    canonicalJson(right.currentMoment)
    ? 0
    : 1;
}

/** A direct session outside any plan, which changes the treasury. */
function performCampaignWeekSessionless(filed: Filed): World {
  const day = filed.world.currentDate;
  const raise = scheduleCampaignAction(filed.world, {
    campaignId: filed.campaign.id,
    kind: "fundraising",
    plan: {
      start: moment(filed.world, day, 9 * 60 + 10),
      end: moment(filed.world, day, 9 * 60 + 40),
      location: {
        locationKey: "campaign-call-desk",
        label: "The campaign's call desk",
        jurisdictionId: filed.campaign.jurisdictionId,
      },
      title: "Another call session",
      summary: "More money for the test fixture.",
    },
    spend: null,
  });
  return performCampaignAction(raise.world, raise.action.id);
}

/** An unplanned confirmed campaign session at 09:10 today. */
function performCampaignWeekSessionlessSchedule(
  world: World,
  filed: Filed,
): { readonly world: World; readonly actionId: EntityId } {
  const day = world.currentDate;
  const scheduled = scheduleCampaignAction(world, {
    campaignId: filed.campaign.id,
    kind: "fundraising",
    plan: {
      start: moment(world, day, 9 * 60 + 10),
      end: moment(world, day, 9 * 60 + 40),
      location: {
        locationKey: "campaign-call-desk",
        label: "The campaign's call desk",
        jurisdictionId: filed.campaign.jurisdictionId,
      },
      title: "An earlier call session",
      summary: "A session promised before the week's first shift.",
    },
    spend: null,
  });
  return { world: scheduled.world, actionId: scheduled.action.id };
}

/** Spends the whole treasury on one unplanned buy at 09:10 today. */
function drainTreasury(filed: Filed): World {
  const day = filed.world.currentDate;
  const buy = scheduleCampaignAction(filed.world, {
    campaignId: filed.campaign.id,
    kind: "advertising",
    plan: {
      start: moment(filed.world, day, 9 * 60 + 10),
      end: moment(filed.world, day, 9 * 60 + 20),
      location: {
        locationKey: "campaign-office",
        label: "The campaign office",
        jurisdictionId: filed.campaign.jurisdictionId,
      },
      title: "An unplanned buy",
      summary: "Spending everything outside the weekly plan.",
    },
    spend: {
      minorUnits: treasury(filed, filed.world),
      currency: makeCurrencyCode("USD"),
    },
  });
  return performCampaignAction(buy.world, buy.action.id);
}
