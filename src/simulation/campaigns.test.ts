import { describe, expect, it } from "vitest";

import {
  GAME_ADULT_CANDIDACY_AGE,
  ageOnDate,
  advanceWorld,
  campaignActionResult,
  campaignForCandidate,
  campaignState,
  campaignTreasuryPosition,
  candidacyAuthority,
  candidacyCoverage,
  candidacyEligibility,
  candidacyPackById,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  deserializeWorld,
  electionContestResult,
  ensureCampaignOpponents,
  fileCampaign,
  lifePlaceByJurisdictionId,
  lifePlaces,
  makeCurrencyCode,
  performCampaignAction,
  requireElectionContest,
  scheduleCampaignAction,
  serializeWorld,
  simulationMomentAtLocalTime,
  addDays,
} from "./index";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import {
  CAMPAIGN_SUPPORT_METRIC_STABLE_KEY,
  canonicalSupportBasisPoints,
} from "./campaigns";
import { SIMULATION_ESTABLISHED_METRIC_STABLE_KEYS } from "./production-catalog";
import { canonicalJson } from "./canonical-json";
import type { CampaignRecord, EntityId, World } from "./types";

const KENTUCKY_PACK = "us-ky-general-assembly-v1:candidacy";

function firstAdult(world: World): EntityId {
  const personId = world.personOrder.find((candidate) => {
    const person = world.people[candidate];
    return (
      person !== undefined &&
      ageOnDate(person.birthDate, world.currentDate) >= GAME_ADULT_CANDIDACY_AGE
    );
  });
  if (!personId) throw new Error("The fixture produced no adult.");
  return personId;
}

function kentuckyOfficeKey(): string {
  const pack = candidacyPackById(KENTUCKY_PACK);
  if (!pack) throw new Error("The Kentucky candidacy pack is missing.");
  const office = pack.offices[0];
  if (!office) throw new Error("The Kentucky candidacy pack has no office.");
  return office.officeKey;
}

function moment(world: World, date: string, hour: number, minute: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay: hour * 60 + minute,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

interface Filed {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly candidatePersonId: EntityId;
}

function fileKentuckyCampaign(seed: string, staffCount = 1): Filed {
  const scenario = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const candidatePersonId = firstAdult(scenario);
  // Campaign work is work somebody does, and the activity engine will not let
  // an unheld person do it. The fixture takes control the way a player does.
  const base: World = {
    ...scenario,
    control: { kind: "person", personId: candidatePersonId },
  };
  const staffPersonIds = base.personOrder
    .filter((personId) => personId !== candidatePersonId)
    .filter((personId) => {
      const person = base.people[personId]!;
      return (
        ageOnDate(person.birthDate, base.currentDate) >=
        GAME_ADULT_CANDIDACY_AGE
      );
    })
    .slice(0, staffCount);
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "test-campaign",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId, ...staffPersonIds],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "test-campaign",
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: kentuckyOfficeKey(),
    electionDate: addDays(base.currentDate, 21),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the test fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds,
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return {
    world: filed.world,
    campaign: filed.campaign,
    candidatePersonId,
  };
}

function doOneSession(
  world: World,
  campaign: CampaignRecord,
  kind: "fundraising" | "outreach" | "advertising",
  dayOffset: number,
  spendMinorUnits: number | null,
): World {
  const date = addDays(world.currentDate, dayOffset);
  const scheduled = scheduleCampaignAction(world, {
    campaignId: campaign.id,
    kind,
    plan: {
      start: moment(world, date, 10, 0),
      end: moment(world, date, 11, 30),
      location: {
        locationKey: `campaign-${kind}`,
        label: "Campaign work",
        jurisdictionId: campaign.jurisdictionId,
      },
      title: `A ${kind} session`,
      summary: `A bounded ${kind} session for the test fixture.`,
    },
    spend:
      spendMinorUnits === null
        ? null
        : { minorUnits: spendMinorUnits, currency: campaign.treasuryCurrency },
  });
  return performCampaignAction(scheduled.world, scheduled.action.id);
}

function supportSnapshot(
  world: World,
  campaign: CampaignRecord,
  candidatePersonIds: readonly EntityId[],
): Record<string, number> {
  return Object.fromEntries(
    [...candidatePersonIds]
      .sort()
      .map((personId) => [
        personId,
        canonicalSupportBasisPoints(world, campaign, personId),
      ]),
  );
}

/* ---------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

describe("candidacy coverage is stated, never assumed", () => {
  it("offers offices only where an accepted rule pack establishes them", () => {
    const coverage = candidacyCoverage();
    expect(coverage.qualificationsAreSourced).toBe(false);
    expect(coverage.packCount).toBeGreaterThan(0);

    for (const place of lifePlaces()) {
      const packId = place.capabilities.candidacyPackId;
      if (packId === null) continue;
      const pack = candidacyPackById(packId);
      expect(pack, place.key).not.toBeNull();
      expect(pack!.offices.length).toBeGreaterThan(0);
    }
  });

  it("keeps every candidate qualification unknown rather than inventing one", () => {
    const pack = candidacyPackById(KENTUCKY_PACK)!;
    for (const office of pack.offices) {
      expect(office.qualification.minimumAge.kind).toBe("unknown");
      expect(office.qualification.residency.kind).toBe("unknown");
      expect(office.qualification.termYears.kind).toBe("unknown");
      expect(office.qualification.filing.kind).toBe("unknown");
      // The office is not invented: it names the accepted pack that records
      // it. It also does not attach one of that pack's procedural citations to
      // the seat count, because none of them establishes it.
      expect(office.recordedBy.packId.length).toBeGreaterThan(0);
      expect(office.recordedBy.packName.length).toBeGreaterThan(0);
      expect(office.seats).toBeGreaterThan(0);
      expect(office.unresolvedGaps.join(" ")).toMatch(
        /no instrument establishing the size of the chamber/i,
      );
      // No district geography exists, so no district is claimed.
      expect(office.office.seatKey).toBeNull();
    }
  });

  it("refuses an office no accepted pack establishes", () => {
    // Lexington declares no office of its OWN — no source describes its
    // council — which is still true and still separate from the Kentucky seats
    // a resident here can stand for through the state above.
    const lexington = lifePlaces().find(
      (place) => place.key === "lexington-fayette",
    )!;
    expect(lexington.capabilities.candidacyPackId).toBeNull();

    const world = createScenarioWorld(
      "lexington-candidacy",
      LEXINGTON_DEMO_CONTEXT,
      {
        peopleCount: 3,
      },
    );
    const eligibility = candidacyEligibility(world, {
      personId: firstAdult(world),
      jurisdictionId: LEXINGTON_DEMO_CONTEXT.jurisdiction.id,
      officeKey: "anything",
      alreadyACandidate: false,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blocks.map((block) => block.kind)).toContain(
      "no-sourced-office",
    );
  });

  it("reaches its own state's pack, and never a different state's", () => {
    // Lexington is IN Kentucky. Reaching the Kentucky General Assembly from a
    // Kentucky city is not borrowing; it is the jurisdiction hierarchy working.
    // The owner play was refused here, and the refusal was the defect.
    const world = createScenarioWorld(
      "lexington-borrow",
      LEXINGTON_DEMO_CONTEXT,
      {
        peopleCount: 3,
      },
    );
    const eligibility = candidacyEligibility(world, {
      personId: firstAdult(world),
      jurisdictionId: LEXINGTON_DEMO_CONTEXT.jurisdiction.id,
      officeKey: kentuckyOfficeKey(),
      alreadyACandidate: false,
    });
    expect(eligibility.pack?.jurisdictionKey).toBe("US-KY");
    expect(eligibility.blocks.map((block) => block.kind)).not.toContain(
      "no-sourced-office",
    );

    // What is still forbidden: the pack is read from the place's own state, so
    // no place can resolve to a state that is not the one it sits in.
    const authority = candidacyAuthority(
      LEXINGTON_DEMO_CONTEXT.jurisdiction.id,
    );
    expect(authority.pack?.jurisdictionKey).toBe(
      lifePlaceByJurisdictionId(LEXINGTON_DEMO_CONTEXT.jurisdiction.id)
        ?.stateJurisdictionKey,
    );
  });
});

describe("filing", () => {
  it("opens a contest, a committee and an empty account", () => {
    const { world, campaign, candidatePersonId } =
      fileKentuckyCampaign("filing-basics");

    expect(campaignState(world, campaign.id).status).toBe("active");
    expect(campaign.candidatePersonId).toBe(candidatePersonId);

    const contest = requireElectionContest(world, campaign.contestId);
    expect(contest.candidatePersonIds).toContain(candidatePersonId);
    expect(contest.candidatePersonIds.length).toBeGreaterThanOrEqual(2);

    const treasury = campaignTreasuryPosition(world, campaign);
    expect(treasury).toBeDefined();
    expect(treasury!.liquidBalance.minorUnits).toBe(0);
    // The money is the committee's, not the candidate's.
    expect(treasury!.owner.kind).toBe("organization");

    // Canonical support exists for everybody and is a whole distribution.
    const total = contest.candidatePersonIds.reduce(
      (sum, personId) =>
        sum + canonicalSupportBasisPoints(world, campaign, personId),
      0,
    );
    expect(total).toBe(10_000);
  });

  it("refuses a second campaign while one is still running", () => {
    const { world, campaign, candidatePersonId } =
      fileKentuckyCampaign("filing-twice");
    expect(campaignState(world, campaign.id).status).toBe("active");
    expect(() =>
      fileCampaign(world, {
        stableKey: "second-campaign",
        candidatePersonId,
        jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
        officeKey: kentuckyOfficeKey(),
        electionDate: addDays(world.currentDate, 30),
        rivalPersonIds: [
          requireElectionContest(
            world,
            campaign.contestId,
          ).candidatePersonIds.find(
            (personId) => personId !== candidatePersonId,
          )!,
        ],
        existingContestId: null,
        committeeName: "Another committee",
        donorPoolName: "Supporters",
        advertisingVendorName: "Advertising",
        staffPersonIds: [],
        treasuryCurrency: makeCurrencyCode("USD"),
      }),
    ).toThrow(/already running/i);
  });
});

describe("campaign work", () => {
  it("raises money into the committee's own account", () => {
    const filed = fileKentuckyCampaign("work-fundraising");
    const after = doOneSession(
      filed.world,
      filed.campaign,
      "fundraising",
      1,
      null,
    );
    const treasury = campaignTreasuryPosition(after, filed.campaign)!;
    expect(treasury.liquidBalance.minorUnits).toBeGreaterThan(0);
  });

  it("spends the committee's own money on an advertising buy", () => {
    const filed = fileKentuckyCampaign("work-advertising");
    const raised = doOneSession(
      filed.world,
      filed.campaign,
      "fundraising",
      1,
      null,
    );
    const before = campaignTreasuryPosition(raised, filed.campaign)!;
    const spent = doOneSession(
      raised,
      filed.campaign,
      "advertising",
      1,
      50_000,
    );
    const after = campaignTreasuryPosition(spent, filed.campaign)!;
    expect(after.liquidBalance.minorUnits).toBe(
      before.liquidBalance.minorUnits - 50_000,
    );
  });

  it("cannot buy advertising the committee has not raised", () => {
    const filed = fileKentuckyCampaign("work-overdraw");
    expect(() =>
      doOneSession(filed.world, filed.campaign, "advertising", 1, 900_000),
    ).toThrow(/overdraw/i);
  });

  it("raises money without moving canonical support at all", () => {
    // Fundraising converts time into committee money. It is not a way to
    // persuade anybody, so it must leave the distribution exactly as it found
    // it — not "almost", and not by a single basis point.
    const filed = fileKentuckyCampaign("fundraising-support-neutral", 3);
    const contest = requireElectionContest(
      filed.world,
      filed.campaign.contestId,
    );
    const before = supportSnapshot(
      filed.world,
      filed.campaign,
      contest.candidatePersonIds,
    );
    const after = doOneSession(
      filed.world,
      filed.campaign,
      "fundraising",
      1,
      null,
    );
    const treasury = campaignTreasuryPosition(after, filed.campaign)!;
    expect(treasury.liquidBalance.minorUnits).toBeGreaterThan(0);
    expect(
      supportSnapshot(after, filed.campaign, contest.candidatePersonIds),
    ).toEqual(before);
  });

  it("does not let the shared action path smuggle support into a raise", () => {
    // The same generic plumbing carries every kind of session. Doing the doors
    // and then the phones must land on exactly the support the doors earned.
    const filed = fileKentuckyCampaign("fundraising-after-outreach", 3);
    const contest = requireElectionContest(
      filed.world,
      filed.campaign.contestId,
    );
    const knocked = doOneSession(
      filed.world,
      filed.campaign,
      "outreach",
      1,
      null,
    );
    const afterOutreach = supportSnapshot(
      knocked,
      filed.campaign,
      contest.candidatePersonIds,
    );
    const raised = doOneSession(
      knocked,
      filed.campaign,
      "fundraising",
      2,
      null,
    );
    expect(
      supportSnapshot(raised, filed.campaign, contest.candidatePersonIds),
    ).toEqual(afterOutreach);
    expect(
      campaignTreasuryPosition(raised, filed.campaign)!.liquidBalance
        .minorUnits,
    ).toBeGreaterThan(
      campaignTreasuryPosition(knocked, filed.campaign)!.liquidBalance
        .minorUnits,
    );
  });

  it("moves more support for more work, not by a flat bonus", () => {
    const lightly = fileKentuckyCampaign("effort-light", 0);
    const heavily = fileKentuckyCampaign("effort-heavy", 3);
    const lightAfter = doOneSession(
      lightly.world,
      lightly.campaign,
      "outreach",
      1,
      null,
    );
    const heavyAfter = doOneSession(
      heavily.world,
      heavily.campaign,
      "outreach",
      1,
      null,
    );
    const lightGain =
      canonicalSupportBasisPoints(
        lightAfter,
        lightly.campaign,
        lightly.candidatePersonId,
      ) -
      canonicalSupportBasisPoints(
        lightly.world,
        lightly.campaign,
        lightly.candidatePersonId,
      );
    const heavyGain =
      canonicalSupportBasisPoints(
        heavyAfter,
        heavily.campaign,
        heavily.candidatePersonId,
      ) -
      canonicalSupportBasisPoints(
        heavily.world,
        heavily.campaign,
        heavily.candidatePersonId,
      );
    expect(heavyGain).toBeGreaterThan(lightGain);
  });

  it("keeps support a distribution rather than a score", () => {
    const filed = fileKentuckyCampaign("distribution");
    const after = doOneSession(
      filed.world,
      filed.campaign,
      "outreach",
      1,
      null,
    );
    const contest = requireElectionContest(after, filed.campaign.contestId);
    const total = contest.candidatePersonIds.reduce(
      (sum, personId) =>
        sum + canonicalSupportBasisPoints(after, filed.campaign, personId),
      0,
    );
    expect(total).toBe(10_000);
  });
});

describe("support truth and what the campaign is told about it", () => {
  it("records the reading as a separate record from the truth", () => {
    const filed = fileKentuckyCampaign("truth-vs-observation");
    const after = doOneSession(
      filed.world,
      filed.campaign,
      "outreach",
      1,
      null,
    );
    const action = (after.history.campaignActions ?? []).at(-1)!;
    const result = campaignActionResult(after, action.id)!;

    const observation = after.history.metricObservations.find(
      (candidate) => candidate.id === result.observationId,
    )!;
    // The observation names the state it is an observation *of*, and they are
    // two different records with two different ids.
    expect(observation.underlyingStateId).not.toBeNull();
    expect(result.supportStateIds).toContain(observation.underlyingStateId!);
    expect(observation.id).not.toBe(observation.underlyingStateId);

    // And the observation carries its own uncertainty rather than certainty.
    expect(observation.uncertainty?.kind).toBe("margin-of-error");
  });

  it("is wrong often enough that reading it is a judgement", () => {
    let disagreements = 0;
    for (let index = 0; index < 12; index += 1) {
      const filed = fileKentuckyCampaign(`observation-error-${index}`);
      const after = doOneSession(
        filed.world,
        filed.campaign,
        "outreach",
        1,
        null,
      );
      const action = (after.history.campaignActions ?? []).at(-1)!;
      const result = campaignActionResult(after, action.id)!;
      const observation = after.history.metricObservations.find(
        (candidate) => candidate.id === result.observationId,
      )!;
      const observed =
        observation.value.kind === "quantity"
          ? (observation.value.quantity.numerator * 10_000) /
            observation.value.quantity.denominator
          : -1;
      const truth = canonicalSupportBasisPoints(
        after,
        filed.campaign,
        filed.candidatePersonId,
      );
      if (observed !== truth) disagreements += 1;
    }
    expect(disagreements).toBeGreaterThan(6);
  });

  it("is the one metric a production world may establish for itself", () => {
    // The production catalog boundary names this key rather than importing it,
    // because importing back would close a cycle. This is the check that keeps
    // the two from drifting apart.
    expect(SIMULATION_ESTABLISHED_METRIC_STABLE_KEYS).toContain(
      CAMPAIGN_SUPPORT_METRIC_STABLE_KEY,
    );
  });

  it("does not export the canonical support reader through the barrel", async () => {
    const barrel = await import("./index");
    expect("canonicalSupportBasisPoints" in barrel).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

/** Same fixture, two ways of playing it, one seed that answers differently. */
function playToElection(seed: string, outreachSessions: number) {
  const filed = fileKentuckyCampaign(seed, 0);
  let world = filed.world;
  for (let index = 0; index < outreachSessions; index += 1) {
    world = doOneSession(world, filed.campaign, "outreach", 1, null);
  }
  // Election day arrives because the world moved, not because anybody pressed
  // a button labelled "hold the election".
  world = advanceWorld(world, 25, createCampaignElectionTransitionRegistry());
  return { ...filed, world };
}

describe("election day", () => {
  it("resolves through the ordinary time advance", () => {
    const played = playToElection("probe-3", 3);
    const result = electionContestResult(
      played.world,
      played.campaign.contestId,
    );
    expect(result).not.toBeUndefined();
    expect(result!.tallies.length).toBeGreaterThanOrEqual(2);
    // The tallies are a whole distribution, not a pair of scores.
    expect(result!.tallies.reduce((sum, tally) => sum + tally.votes, 0)).toBe(
      10_000,
    );
  });

  it("leaves a contest nobody filed for to the substrate's own handler", () => {
    // The registry falls through, so a world with no campaign still resolves.
    const filed = fileKentuckyCampaign("fallthrough");
    const advanced = advanceWorld(
      filed.world,
      25,
      createCampaignElectionTransitionRegistry(),
    );
    expect(
      electionContestResult(advanced, filed.campaign.contestId),
    ).not.toBeUndefined();
  });

  it("records a win and hands back a life that carries on", () => {
    const played = playToElection("probe-3", 3);
    const state = campaignState(played.world, played.campaign.id);
    expect(state.status).toBe("won");
    expect(state.electionResultId).not.toBeNull();

    const result = electionContestResult(
      played.world,
      played.campaign.contestId,
    )!;
    expect(result.winnerPersonId).toBe(played.candidatePersonId);

    // The committee's roles are over, and the person is not.
    for (const workRelationshipId of [
      played.campaign.candidateWorkRelationshipId,
      ...played.campaign.staffWorkRelationshipIds,
    ]) {
      const status = played.world.history.workStatuses
        .filter((record) => record.workRelationshipId === workRelationshipId)
        .at(-1);
      expect(status?.status).toBe("ended");
    }
    const later = advanceWorld(played.world, 30);
    expect(later.people[played.candidatePersonId]).toBeDefined();
    expect(later.currentDate > played.world.currentDate).toBe(true);
  });

  it("records a loss and hands back the same life, not an ending", () => {
    const played = playToElection("probe-3", 0);
    const state = campaignState(played.world, played.campaign.id);
    expect(state.status).toBe("lost");
    expect(state.reason).toMatch(/life is not/i);

    const result = electionContestResult(
      played.world,
      played.campaign.contestId,
    )!;
    expect(result.winnerPersonId).not.toBe(played.candidatePersonId);

    // Nothing about the world says stop. Time keeps moving, the person is
    // still here, and the record of the campaign is still theirs.
    const later = advanceWorld(played.world, 60);
    expect(later.people[played.candidatePersonId]).toBeDefined();
    expect(campaignForCandidate(later, played.candidatePersonId)?.id).toBe(
      played.campaign.id,
    );
    expect(campaignState(later, played.campaign.id).status).toBe("lost");
    // And the life can be lived further still.
    expect(advanceWorld(later, 90).currentDate > later.currentDate).toBe(true);
  });

  it("lets the same seed answer differently depending on the campaign run", () => {
    const idle = playToElection("probe-3", 0);
    const worked = playToElection("probe-3", 3);
    expect(campaignState(idle.world, idle.campaign.id).status).toBe("lost");
    expect(campaignState(worked.world, worked.campaign.id).status).toBe("won");
  });
});

describe("determinism and persistence", () => {
  it("reproduces the same campaign, readings and result from the same seed", () => {
    const first = playToElection("replay-proof", 2);
    const second = playToElection("replay-proof", 2);
    expect(canonicalJson(first.world)).toBe(canonicalJson(second.world));
  });

  it("diverges only because the player did something different", () => {
    const idle = playToElection("replay-proof", 0);
    const worked = playToElection("replay-proof", 2);
    expect(canonicalJson(idle.world)).not.toBe(canonicalJson(worked.world));
  });

  it("carries the whole campaign through a save and a reload", () => {
    const played = playToElection("persistence-proof", 2);
    const reloaded = deserializeWorld(serializeWorld(played.world));

    expect(canonicalJson(reloaded)).toBe(canonicalJson(played.world));
    const campaign = campaignForCandidate(reloaded, played.candidatePersonId)!;
    expect(campaign.id).toBe(played.campaign.id);
    expect(campaignState(reloaded, campaign.id).status).toBe(
      campaignState(played.world, played.campaign.id).status,
    );
    expect(
      campaignTreasuryPosition(reloaded, campaign)!.liquidBalance.minorUnits,
    ).toBe(
      campaignTreasuryPosition(played.world, played.campaign)!.liquidBalance
        .minorUnits,
    );
    // Including the reading the campaign was given, which is history too.
    expect(reloaded.history.metricObservations.length).toBe(
      played.world.history.metricObservations.length,
    );
  });

  it("draws from record identity rather than from how much history exists", () => {
    // Both worlds hold the same fundraising session under the same identity.
    // One of them also has an outreach session on the calendar, so its history
    // is longer and its next sequence is further along. If any draw were taken
    // off a stream that the rest of the world advanced, the money raised would
    // differ between them. It must not.
    const filed = fileKentuckyCampaign("rng-isolation", 0);
    const date = addDays(filed.world.currentDate, 1);
    function addFundraising(world: World) {
      return scheduleCampaignAction(world, {
        campaignId: filed.campaign.id,
        kind: "fundraising",
        plan: {
          start: moment(world, date, 10, 0),
          end: moment(world, date, 11, 30),
          location: {
            locationKey: "campaign-fundraising",
            label: "Campaign work",
            jurisdictionId: filed.campaign.jurisdictionId,
          },
          title: "A fundraising session",
          summary: "A bounded fundraising session for the test fixture.",
        },
        spend: null,
      });
    }

    const plain = addFundraising(filed.world);
    const withExtra = addFundraising(filed.world);
    const busier = scheduleCampaignAction(withExtra.world, {
      campaignId: filed.campaign.id,
      kind: "outreach",
      plan: {
        start: moment(filed.world, date, 14, 0),
        end: moment(filed.world, date, 15, 30),
        location: {
          locationKey: "campaign-outreach",
          label: "Campaign work",
          jurisdictionId: filed.campaign.jurisdictionId,
        },
        title: "An outreach session",
        summary: "A bounded outreach session for the test fixture.",
      },
      spend: null,
    });
    expect(busier.world.history.nextSequence).toBeGreaterThan(
      plain.world.history.nextSequence,
    );
    expect(withExtra.action.id).toBe(plain.action.id);

    const raisedPlain = (
      performCampaignAction(plain.world, plain.action.id).history
        .campaignActionResults ?? []
    ).at(-1)!.raisedAmount!;
    const raisedBusier = (
      performCampaignAction(busier.world, withExtra.action.id).history
        .campaignActionResults ?? []
    ).at(-1)!.raisedAmount!;
    expect(raisedBusier.minorUnits).toBe(raisedPlain.minorUnits);
  });
});
