import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { attendPartyWork } from "../presentation/campaign-life-actions";
import {
  campaignById,
  campaignLifeActivityRecords,
  campaignLifeOutcomeRecords,
  campaignTreasuryPosition,
} from "./campaign-queries";
import {
  recordCampaignLifeAttendance,
  requestCampaignLifeActivity,
} from "./campaign-life-activities";
import {
  chooseCampaignWeekAction,
  projectCampaignWeekActions,
} from "./campaign-week-actions";
import { GAME_ADULT_CANDIDACY_AGE, candidacyPackById } from "./candidacy-packs";
import { addDays, ageOnDate, simulationMinutesBetween } from "./dates";
import {
  createScenarioWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
} from "./index";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { createOrganizationParticipation } from "./life";
import {
  homePartyChapters,
  joinPartyChapter,
} from "./living-world/party-chapters";
import { PARTY_AFFILIATION_KIND } from "./living-world/opening";
import { deserializeWorld, serializeWorld } from "./serialization";
import { scheduledActivityState } from "./time-work";
import type { World } from "./types";

function filedLife(seed: string) {
  const opening = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: "kentucky",
    }),
  ).game!;
  return {
    world: fileForOffice(opening.world, opening.playerPersonId),
    personId: opening.playerPersonId,
  };
}

function staffedLife(seed: string) {
  const scenario = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const adults = scenario.personOrder.filter(
    (id) =>
      ageOnDate(scenario.people[id]!.birthDate, scenario.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  );
  const personId = adults[0]!;
  const staffPersonId = adults[1]!;
  const base: World = {
    ...scenario,
    control: { kind: "person", personId },
  };
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "week-test-campaign",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [personId, staffPersonId],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "week-test-campaign",
    candidatePersonId: personId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: candidacyPackById("us-ky-general-assembly-v1:candidacy")!
      .offices[0]!.officeKey,
    electionDate: addDays(base.currentDate, 28),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the test fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [staffPersonId],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return { world: filed.world, personId };
}

describe("concrete campaign week actions", () => {
  it("does not assign an unearned party chapter host to a new candidate", () => {
    const life = filedLife("campaign-week-no-assumed-backing");
    const before = JSON.stringify(life.world.history);
    const view = projectCampaignWeekActions(life.world, life.personId)!;
    expect(view.choices).toEqual([]);
    expect(view.availabilityReason).toBe("needs-host");
    expect(JSON.stringify(life.world.history)).toBe(before);
  });

  it("uses a chapter host only after its recorded support decision", () => {
    const life = filedLife("campaign-week-recorded-backing");
    const chapter = homePartyChapters(life.world)[0]!;
    let world = joinPartyChapter(
      life.world,
      life.personId,
      chapter.organizationId,
    );
    world = createOrganizationParticipation(world, {
      stableKey: "week-test:explicit-public-party-affiliation",
      personId: life.personId,
      organizationId: chapter.partyOrganizationId,
      startedAt: world.currentDate,
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Test fixture public affiliation",
      provenance: { kind: "authored", note: "Test fixture affiliation" },
    });
    world = requestCampaignLifeActivity(world, life.personId, {
      form: "organization-meeting",
      hostOrganizationId: chapter.organizationId,
      earliestDate: world.currentDate,
    });
    const meeting = campaignLifeActivityRecords(world).at(-1)!;
    world = attendPartyWork(world, life.personId, meeting.id, "attended");
    world = requestCampaignLifeActivity(world, life.personId, {
      form: "support-request",
      hostOrganizationId: chapter.organizationId,
      earliestDate: world.currentDate,
    });
    const request = campaignLifeActivityRecords(world).at(-1)!;
    world = attendPartyWork(world, life.personId, request.id, "attended");
    const decision =
      campaignLifeOutcomeRecords(world).at(-1)!.supportDecision?.decision;
    expect(decision).toBe("granted");
    const view = projectCampaignWeekActions(world, life.personId)!;
    expect(view.availabilityReason).toBeNull();
    expect(view.choices).toHaveLength(4);
    expect(
      view.choices.every(
        (choice) => choice.hostOrganizationId === chapter.organizationId,
      ),
    ).toBe(true);
    expect(view.recentResults).toEqual([]);
  });

  it("projects real hosts and free calendar slots, then books exactly the shown choice", () => {
    const life = staffedLife("campaign-week-concrete-choices");
    const before = JSON.stringify(life.world.history);
    const view = projectCampaignWeekActions(life.world, life.personId)!;
    expect(view.choices).toHaveLength(4);
    expect(view.availabilityReason).toBeNull();
    expect(view.choices.map((choice) => choice.form)).toEqual([
      "door-canvass",
      "phone-shift",
      "fundraiser",
      "town-hall",
    ]);
    expect(view.choices.every((choice) => choice.hostName.length > 0)).toBe(
      true,
    );
    expect(view.choices.every((choice) => choice.place.length > 0)).toBe(true);
    expect(view.choices.every((choice) => choice.activityMinutes > 0)).toBe(
      true,
    );
    expect(view.choices.every((choice) => choice.cashCost === null)).toBe(true);
    expect(JSON.stringify(life.world.history)).toBe(before);

    const selected = view.choices.find(
      (choice) => choice.form === "phone-shift",
    )!;
    const booked = chooseCampaignWeekAction(life.world, life.personId, {
      campaignId: view.campaignId,
      choiceId: selected.id,
      revision: view.revision,
    });
    const activity = campaignLifeActivityRecords(booked).at(-1)!;
    expect(activity.form).toBe(selected.form);
    expect(activity.hostPersonId).toBe(selected.hostPersonId);
    expect(activity.campaignId).toBe(view.campaignId);
    const hold = scheduledActivityState(booked, activity.scheduledActivityId);
    expect(hold.start).toEqual(selected.start);
    expect(hold.end).toEqual(selected.end);
    expect(() =>
      chooseCampaignWeekAction(booked, life.personId, {
        campaignId: view.campaignId,
        choiceId: selected.id,
        revision: view.revision,
      }),
    ).toThrow(/calendar changed/);
  });

  it("a completed phone shift yields a named contact through the existing attendance writer", () => {
    const life = staffedLife("campaign-week-named-result");
    const view = projectCampaignWeekActions(life.world, life.personId)!;
    const selected = view.choices.find(
      (choice) => choice.form === "phone-shift",
    )!;
    const booked = chooseCampaignWeekAction(life.world, life.personId, {
      campaignId: view.campaignId,
      choiceId: selected.id,
      revision: view.revision,
    });
    const activity = campaignLifeActivityRecords(booked).at(-1)!;
    const finished = attendPartyWork(
      booked,
      life.personId,
      activity.id,
      "attended",
    );
    const outcome = campaignLifeOutcomeRecords(finished).at(-1)!;
    expect(outcome.activityId).toBe(activity.id);
    expect(outcome.contactPersonIds.length).toBeGreaterThan(0);
    const after = projectCampaignWeekActions(finished, life.personId)!;
    expect(after.recentResults.at(-1)?.contactNames.length).toBeGreaterThan(0);
    expect(after.recentResults.at(-1)?.summary.length).toBeGreaterThan(0);
    expect(
      simulationMinutesBetween(booked.currentMoment, finished.currentMoment),
    ).toBeGreaterThan(0);
    expect(
      scheduledActivityState(finished, activity.scheduledActivityId).status,
    ).toBe("completed");
    expect(
      recordCampaignLifeAttendance(
        finished,
        life.personId,
        activity.scheduledActivityId,
        "attended",
      ),
    ).toBe(finished);
    const resumed = deserializeWorld(serializeWorld(finished));
    const resumedView = projectCampaignWeekActions(resumed, life.personId)!;
    expect(resumedView.recentResults.at(-1)).toEqual(
      after.recentResults.at(-1),
    );
  });

  it("a fundraiser transfers only the lawful recorded amount, once", () => {
    const life = staffedLife("campaign-week-fundraiser-once");
    const view = projectCampaignWeekActions(life.world, life.personId)!;
    const selected = view.choices.find(
      (choice) => choice.form === "fundraiser",
    )!;
    const booked = chooseCampaignWeekAction(life.world, life.personId, {
      campaignId: view.campaignId,
      choiceId: selected.id,
      revision: view.revision,
    });
    const activity = campaignLifeActivityRecords(booked).at(-1)!;
    const campaign = campaignById(booked, view.campaignId)!;
    const before = campaignTreasuryPosition(booked, campaign)!.liquidBalance
      .minorUnits;
    const transferCount = booked.history.resourceTransferOutcomes.length;
    const finished = attendPartyWork(
      booked,
      life.personId,
      activity.id,
      "attended",
    );
    const outcome = campaignLifeOutcomeRecords(finished).at(-1)!;
    // This opening predates the reviewed Kentucky pack, so the donor does
    // not give money through an unknown legal threshold.
    expect(outcome.raisedAmount).toBeNull();
    expect(
      projectCampaignWeekActions(finished, life.personId)!.recentResults.at(-1)
        ?.summary,
    ).toMatch(/itemization threshold is UNKNOWN/);
    const after = campaignTreasuryPosition(finished, campaign)!.liquidBalance
      .minorUnits;
    expect(after - before).toBe(outcome.raisedAmount?.minorUnits ?? 0);
    expect(
      finished.history.resourceTransferOutcomes.length - transferCount,
    ).toBe(outcome.raisedAmount ? 1 : 0);
    expect(
      recordCampaignLifeAttendance(
        finished,
        life.personId,
        activity.scheduledActivityId,
        "attended",
      ),
    ).toBe(finished);
    expect(
      projectCampaignWeekActions(
        deserializeWorld(serializeWorld(finished)),
        life.personId,
      )!.recentResults.at(-1)?.raisedAmount,
    ).toEqual(outcome.raisedAmount);
  });
});
