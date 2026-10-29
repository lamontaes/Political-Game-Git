/**
 * M2-05 campaigning and M2-06 polls, in a random place.
 *
 * After filing, each campaign activity changes what specific people know and
 * think, each change with a recorded cause; nobody's view moves without one;
 * a rival campaigns with the same tools. A poll reports what the people it
 * contacted said, with a computed margin of error; no contacts, no poll.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  VOLUNTEER_SHIFT_EVENT,
  askForDonation,
  askForEndorsement,
  askToVolunteer,
  campaignFor,
  canvassHoursFree,
  causesFor,
  commissionPoll,
  contributionLimit,
  enlistVolunteer,
  giveSpeech,
  impressionOf,
  knockDoors,
  openCampaigns,
  campaignTurn,
  runAd,
  shiftReason,
  shiftShare,
  volunteerShifts,
  type CauseRow,
  type ImpressionRow,
} from "./modules/campaigns";
import { PLATFORM_QUESTIONS, campaignParameter } from "./campaign-views";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { setKeepEveryonesWhy } from "./why-kept";
import { discretionaryHours } from "./modules/work";
import { OPENING_CARRY } from "./turnout";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoreEventInput, PersonState } from "./types";

// Reads every reached voter's recorded cause for people outside the player's circle.
setKeepEveryonesWhy(true);

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaigns:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace() {
  const state = pick(states, "state");
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, "place");
}

/** File and, where the place asks for signatures, gather them from neighbors. */
function fileAndQualify(
  api: ReturnType<typeof coreAPI>,
  personId: string,
  contestId: string,
  platform: readonly string[],
): FilingRow | null {
  const result = fileCandidacy(api, {
    personId,
    contestId,
    platform,
  });
  if (result.status === "refused") return null;
  const filing = result.filing;
  return ["petitioning", "on-ballot"].includes(filing.status ?? "")
    ? filing
    : null;
}

describe("M2-05 and M2-06 campaigning and polls", () => {
  it("every activity moves specific people with a recorded cause; a rival campaigns; polls report what people said", () => {
    const place = process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace().key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    const api = coreAPI(core);
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    const platformA = [
      `${pick(PLATFORM_QUESTIONS, "q1")}=1`,
      `${pick(PLATFORM_QUESTIONS, "q2")}=-1`,
    ];
    const platformB = platformA.map((s) =>
      s.replace("=1", "=x").replace("=-1", "=1").replace("=x", "=-1"),
    );
    let you: FilingRow | null = null;
    let rival: FilingRow | null = null;
    for (const contest of openContests(api)) {
      you = fileAndQualify(api, adults[0]!.id, contest.id, platformA);
      if (!you) continue;
      rival = fileAndQualify(api, adults[1]!.id, contest.id, platformB);
      if (rival) break;
    }
    expect(
      you,
      `no open contest the two candidates could both qualify for in ${place}`,
    ).not.toBeNull();
    expect(rival).not.toBeNull();
    const candidate = core.people.get(you!.personId)!;

    // Doors: specific people, each with their own reasons.
    const doors = knockDoors(api, {
      filingId: you!.id,
      canvasserId: candidate.id,
      hours: 3,
    });
    expect(doors.length).toBeGreaterThan(0);
    for (const cause of doors) {
      expect(cause.act).toBe("door");
      expect(cause.agreement).not.toBeNull();
      expect(cause.warmthAfter).not.toBe(Number.NaN);
    }
    // A volunteer: family first.
    const relative = [...candidate.familyIds].find((id) =>
      askToVolunteer(api, you!.id, id),
    );
    if (relative) {
      const volunteerDoors = knockDoors(api, {
        filingId: you!.id,
        canvasserId: relative,
        hours: 2,
      });
      expect(volunteerDoors.every((c) => c.act === "volunteer-door")).toBe(
        true,
      );
    }
    // Money within the limit.
    const limit =
      contributionLimit(api, you!.contestId).minor ?? Number.MAX_SAFE_INTEGER;
    const warm = doors.filter((c) => c.warmthAfter > 0).map((c) => c.voterId);
    const before = new Map(
      warm.map((id) => [id, core.people.get(id)!.liquidMinor]),
    );
    let raised = 0;
    for (const id of warm) {
      const gave = askForDonation(api, you!.id, id);
      expect(gave).toBeLessThanOrEqual(limit);
      if (gave)
        expect(core.people.get(id)!.liquidMinor).toBe(before.get(id)! - gave);
      raised += gave;
    }
    // A speech: listeners decide, and their words become promises.
    const speech = giveSpeech(api, {
      filingId: you!.id,
      venue: "town-hall",
      statements: [{ question: pick(PLATFORM_QUESTIONS, "q3"), position: 1 }],
    });
    expect(speech.every((c) => c.act === "speech")).toBe(true);
    const promises = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("promises")
      .query("byCandidate", [candidate.id]);
    expect(promises.length).toBe(1);
    // An ad, if there's money for one.
    const ad =
      raised > 0 ? runAd(api, { filingId: you!.id, amountMinor: raised }) : [];
    expect(ad.every((c) => c.act === "ad")).toBe(true);
    // An endorsement attempt: yes only for the platform they agree with most.
    const endorser = doors[0]!.voterId;
    askForEndorsement(api, you!.id, endorser);
    // The rival campaigns with the same tools.
    const contestRow = api
      .moduleState("core2-elections-v1")
      .table("contests")
      .get(rival!.contestId) as unknown as { electionDate: string };
    const rivalTurn = campaignTurn(api, rival!.id, contestRow.electionDate);
    const rivalReached = rivalTurn.doors;
    expect(rivalReached).toBeGreaterThan(0);
    // Nobody's view moved without a cause.
    const impressions = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("impressions")
      .rows() as unknown as ImpressionRow[];
    for (const impression of impressions)
      expect(
        causesFor(api, impression.voterId, impression.candidateId).length,
      ).toBe(impression.causes);
    // A poll of real people.
    const poll = commissionPoll(api, { filingId: you!.id, sampleSize: 60 });
    const total = Object.values(poll.answers).reduce((a, b) => a + b, 0);
    expect(total).toBe(poll.contacted);
    expect(poll.respondentIds.length).toBe(poll.contacted);
    if (poll.contacted) expect(poll.marginOfError).toBeGreaterThan(0);
    const none = commissionPoll(api, { filingId: you!.id, sampleSize: 0 });
    expect(none.contacted).toBe(0);
    expect(none.marginOfError).toBeNull();
    const voter = doors[0]!;
    govReport(
      "campaigns",
      JSON.stringify({
        place,
        seed,
        contest: you!.contestId,
        doorsMet: doors.length,
        volunteer: Boolean(relative),
        raisedMinor: raised,
        limitMinor: limit,
        speechListeners: speech.length,
        adReached: ad.length,
        rivalReached,
        poll: poll.answers,
        marginOfError: poll.marginOfError,
        whyOneVoter: causesFor(api, voter.voterId, candidate.id),
      }),
    );
  });

  it("volunteers walk the campaign's doors in the evening their work leaves free; one whose shift at work covers it stays home", () => {
    const place = process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace().key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    const api = coreAPI(core);
    const year = (p: Readonly<PersonState>) =>
      Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4));
    const adults = [...core.people.values()]
      .filter((p) => year(p) >= 35)
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    const platform = [`${pick(PLATFORM_QUESTIONS, "shift-q1")}=1`];
    let filing: FilingRow | null = null;
    for (const contest of openContests(api)) {
      filing = fileAndQualify(api, adults[0]!.id, contest.id, platform);
      if (filing) break;
    }
    expect(filing, `no open contest to file for in ${place}`).not.toBeNull();
    const candidateId = filing!.personId;
    const campaign = campaignFor(api, filing!.id);
    const shiftHours = campaignParameter("volunteerShiftHours");
    // Whose own reasons send them out on the campaign's first working day
    // (their share of working days, added to an even start, makes a whole
    // evening), with the whole evening free.
    const goes = (p: Readonly<PersonState>) =>
      OPENING_CARRY + shiftShare(api, campaign, p) >= 1;
    const willing = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== candidateId &&
          p.id !== core.playerId &&
          year(p) >= campaignParameter("minimumVolunteerAge") &&
          canvassHoursFree(api, p) === shiftHours &&
          goes(p),
      )
      .sort(
        (a, b) =>
          shiftReason(api, campaign, b) - shiftReason(api, campaign, a) ||
          a.id.localeCompare(b.id),
      );
    expect(
      willing.length,
      `fewer than three willing volunteers in ${place}`,
    ).toBeGreaterThanOrEqual(3);
    const [busy, first, second] = willing as [
      PersonState,
      PersonState,
      PersonState,
    ];
    // A fixture for the edge case: the most willing works an evening shift
    // that covers the canvass on this very day, once a week.
    const from = campaignParameter("canvassStartHour") * 60;
    const shiftId = `test-evening-shift:${busy.id}`;
    core.work.commitments.set(shiftId, {
      id: shiftId,
      jobId: `test-evening-job:${busy.id}`,
      personId: busy.id,
      organizationId: "test-evening-employer",
      startsAt: core.date,
      anchorDate: core.date,
      periodDays: 7,
      slots: [{ offsetDays: 0, startMinute: from, minutes: shiftHours * 60 }],
      expectedWeeklyMinutes: shiftHours * 60,
      hourlyMinor: 0,
      scheduleSource: {
        tag: "SOURCED",
        citation: "Test fixture: an evening shift on the canvass night",
        asOf: core.date,
      },
      paySource: {
        tag: "SOURCED",
        citation: "Test fixture: an evening shift on the canvass night",
        asOf: core.date,
      },
    });
    core.work.commitmentsByPerson.set(
      busy.id,
      new Set([...(core.work.commitmentsByPerson.get(busy.id) ?? []), shiftId]),
    );
    expect(canvassHoursFree(api, busy)).toBe(0);
    // Their reasons would still send them: only the hours keep them home.
    expect(goes(busy)).toBe(true);
    for (const p of [busy, first, second])
      expect(enlistVolunteer(api, filing!.id, p.id)).toBe(true);
    // The second has spent all but an hour of their day already: the evening
    // gives the doors only what the day's discretionary budget has left.
    const perHour = api.parameter("minutesPerHour");
    api.recordDiscretionaryTime(
      second.id,
      (discretionaryHours(api, second.id) - 1) * perHour,
    );
    expect(canvassHoursFree(api, second)).toBeCloseTo(1, 9);
    const firstBudget = discretionaryHours(api, first.id);

    const events: CoreEventInput[] = [];
    api.subscribeEvents(
      "test-volunteer-shifts",
      [VOLUNTEER_SHIFT_EVENT],
      (_, e) => {
        events.push(e);
      },
    );
    const people = core.people.size;
    const walked = new Set<string>();
    const shifts = volunteerShifts(api, filing!.id, walked);

    // The two with the evening free went; the one at work stayed home.
    expect(shifts.map((s) => s.volunteerId).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    // Nobody was filled in: a volunteer's doors reach the counted as a count.
    expect(core.people.size).toBe(people);
    const causes = api.moduleState(CAMPAIGNS_MODULE_ID).table("causes");
    // The evening came out of the day's budget every engine reads.
    const hoursOf = new Map(shifts.map((s) => [s.volunteerId, s.hours]));
    expect(hoursOf.get(first.id)).toBe(shiftHours);
    expect(hoursOf.get(second.id)).toBeCloseTo(1, 9);
    expect(discretionaryHours(api, first.id)).toBeCloseTo(
      firstBudget - shiftHours,
      9,
    );
    expect(discretionaryHours(api, second.id)).toBeCloseTo(0, 9);
    // What their working day owed them, less the evening it sent them on.
    const held = campaignFor(api, filing!.id);
    expect(held.shiftCarries?.[first.id]).toBeCloseTo(
      OPENING_CARRY + shiftShare(api, campaign, first) - 1,
      9,
    );
    expect(held.shiftCarries?.[busy.id]).toBeUndefined();
    for (const shift of shifts) {
      expect(shift.doorsKnocked).toBeGreaterThan(0);
      if (shift.volunteerId === first.id)
        expect(shift.causeIds.length).toBeGreaterThan(0);
      for (const id of shift.causeIds) {
        const cause = causes.get(id) as unknown as CauseRow;
        expect(cause.act).toBe("volunteer-door");
        expect(cause.actorId).toBe(shift.volunteerId);
        expect(cause.candidateId).toBe(candidateId);
        const impression = impressionOf(api, cause.voterId, candidateId);
        expect(impression?.heardOf).toBe(true);
        expect(causesFor(api, cause.voterId, candidateId).length).toBe(
          impression!.causes,
        );
      }
      const event = events.find(
        (e) => e.facts?.volunteerId === shift.volunteerId,
      );
      expect(event?.personIds).toContain(shift.volunteerId);
      expect(event?.facts?.doorsKnocked).toBe(String(shift.doorsKnocked));
      expect(event?.facts?.firstShift).toBe("true");
      expect(held.shiftNotedOn?.[shift.volunteerId]).toBe(START);
    }
    const byCandidate = causes.query("byCandidate", [
      candidateId,
    ]) as unknown as CauseRow[];
    expect(byCandidate.some((c) => c.actorId === busy.id)).toBe(false);
    expect(campaignFor(api, filing!.id).doorsKnockedCount).toBe(
      shifts.reduce((sum, s) => sum + s.doorsKnocked, 0),
    );
    // An evening given is gone: the same day asks nothing more of them.
    expect(volunteerShifts(api, filing!.id, walked)).toEqual([]);
    // The next day they may walk again, but an evening is kept as an event
    // at most once a week: only the one who stayed home has a first to note.
    const nextDay = addDays(makeIsoDate(START), 1);
    core.date = nextDay;
    const again = volunteerShifts(api, filing!.id);
    const noted = events.filter((e) => e.date === nextDay);
    expect(
      noted.every(
        (e) =>
          e.facts?.volunteerId === busy.id && e.facts?.firstShift === "true",
      ),
    ).toBe(true);
    expect(noted.length).toBe(
      again.filter((s) => s.volunteerId === busy.id).length,
    );
    // A week on, an evening of the two noted on the first day is noted again
    // (the one at work has their evening shift that day again).
    const weekOn = addDays(
      makeIsoDate(START),
      campaignParameter("volunteerShiftEventDays"),
    );
    core.date = weekOn;
    const later = volunteerShifts(api, filing!.id);
    for (const shift of later.filter((s) => s.volunteerId !== busy.id))
      expect(
        events.some(
          (e) =>
            e.date === weekOn &&
            e.facts?.volunteerId === shift.volunteerId &&
            e.facts?.firstShift === "false",
        ),
      ).toBe(true);
    govReport(
      "campaigns-volunteer-shifts",
      JSON.stringify({
        place,
        seed,
        filing: filing!.id,
        shifts,
        stayedHome: busy.id,
      }),
    );
  });
});
