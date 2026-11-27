/**
 * Volunteer canvass shifts.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { discretionaryHours } from "./work";
import { keepsWhy } from "../why-kept";
import { leanedScore } from "../trait-decisions";
import type { CoreAPI, PersonId, CoreState, PersonState } from "../types";
import { daysBetweenText as daysBetween } from "../kernel/dates";
import { logistic } from "../kernel/deterministic-math";
import { OPENING_CARRY } from "../turnout";
import { campaignParameter } from "../campaign-data";
import { standing, type ContestRow, type FilingRow } from "./elections";
import {
  ageOn,
  campaignFor,
  elections,
  rivalFiling,
  save,
  table,
  townRow,
} from "./campaigns-base";
import type { CampaignRow } from "./campaigns-base";
import { closeDoorWalk, openDoorWalk, walkWith } from "./campaigns-doors";
import {
  VOLUNTEER_JOINED_EVENT,
  VOLUNTEER_LAPSED_EVENT,
  recordVolunteerJoined,
  volunteerLapseReason,
  volunteerReason,
} from "./campaigns-volunteers";
import { minutesAtWork } from "./campaigns-work";

/**
 * Someone has said, to the candidate's face, that they will work the
 * campaign (a relative's answer in the talk at home after the filing): they
 * are counted among its volunteers, whom the canvass and the turnout read.
 * Returns whether they were newly enlisted; a child, the dead, anyone
 * already counted and a rival standing in the same race (`rivalFiling`) are
 * not.
 */
export function enlistVolunteer(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge") ||
    campaign.volunteerIds.includes(personId) ||
    rivalFiling(api, campaign, personId)
  )
    return false;
  save(api, {
    ...campaign,
    volunteerIds: [...campaign.volunteerIds, personId],
  });
  recordVolunteerJoined(api, campaign, personId, "said-so");
  return true;
}

/**
 * The hours of a canvass evening a volunteer has: a shift's length from the
 * hour canvassing starts, less the minutes of it their scheduled work takes
 * that day, and never more than the discretionary hours their day has left
 * (`discretionaryHours`, the one daily budget every engine's choices draw on).
 */
export function canvassHoursFree(
  api: CoreAPI,
  person: Readonly<PersonState>,
): number {
  const core = api.state as CoreState;
  const perHour = api.parameter("minutesPerHour");
  const from = campaignParameter("canvassStartHour") * perHour;
  const length = campaignParameter("volunteerShiftHours") * perHour;
  let busy = 0;
  for (const id of core.work.commitmentsByPerson.get(person.id) ?? []) {
    const row = core.work.commitments.get(id);
    if (row) busy += minutesAtWork(row, api.state.date, from, from + length);
  }
  return Math.min(
    Math.max(0, length - busy) / perHour,
    discretionaryHours(api, person.id),
  );
}

/**
 * How strong a volunteer's pull to give an evening to the campaign's doors
 * is, before personality: the reasons they volunteered for (liking the
 * candidate, closeness, family, against the hours their work takes each
 * week), against a shift's own bar instead of the ask's.
 */
export function shiftReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  return (
    volunteerReason(api, campaign, person) +
    campaignParameter("volunteerThreshold") -
    campaignParameter("volunteerShiftThreshold")
  );
}

/**
 * The share of the campaign's working days a volunteer gives an evening to
 * its doors: their reasons (`shiftReason`) and temperament, slid by a
 * logistic step, so an eager volunteer goes on most and a reluctant one now
 * and then, never always or never.
 */
export function shiftShare(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  return logistic(
    leanedScore(
      api.state,
      person,
      "campaigns.volunteer",
      "volunteer",
      "decline",
      shiftReason(api, campaign, person),
    ) / campaignParameter("volunteerShiftScale"),
  );
}

/** What one volunteer's evening of doors did. */
export interface VolunteerShift {
  readonly volunteerId: string;
  readonly hours: number;
  readonly doorsKnocked: number;
  /** The causes of the full people who opened, each naming the volunteer as its actor. */
  readonly causeIds: readonly string[];
  /** Counted residents who opened, reached as a count. */
  readonly countedReached: number;
}

/** The kind of a volunteer's evening of doors for a campaign the player's circle is in. */
export const VOLUNTEER_SHIFT_EVENT = "volunteer-shift";

/**
 * A campaign's volunteers walk its doors. On a day the campaign works, each
 * volunteer with hours free that evening (`canvassHoursFree`: someone whose
 * shift at work covers it, or whose day is already spent, stays home) adds
 * their share of working days (`shiftShare`) to what the campaign's days owe
 * them, and goes when it comes to a whole evening, giving those hours out of
 * the day's discretionary budget. Their doors are the campaign's own walk
 * list, after the doors it has knocked, walked by all of the day's
 * volunteers in one pass, and whoever opens meets the volunteer (a
 * `volunteer-door` cause naming them). A counted resident who opens is
 * reached as a count and not filled in, since the player never met them.
 * The player is never sent: their hours are their own choice. `walked`
 * holds who already gave this evening to a campaign's doors, so someone on
 * two campaigns walks one evening, not two.
 */
export function volunteerShifts(
  api: CoreAPI,
  filingId: string,
  walked: Set<string> = new Set(),
): readonly VolunteerShift[] {
  const filing = elections(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
  const held = table(api, "campaigns").get(filingId) as unknown as
    CampaignRow | undefined;
  if (!filing || !standing(filing) || !held?.volunteerIds.length) return [];
  const core = api.state as CoreState;
  const date = api.state.date;
  const perHour = api.parameter("minutesPerHour");
  const campaign = campaignFor(api, filingId);
  const carries: Record<string, number> = { ...(campaign.shiftCarries ?? {}) };
  const going: { readonly person: PersonState; readonly hours: number }[] = [];
  let weighed = false;
  for (const id of held.volunteerIds) {
    const person = api.state.people.get(id);
    if (
      !person?.alive ||
      id === core.playerId ||
      id === held.candidateId ||
      walked.has(id)
    )
      continue;
    // A volunteer whose reasons have weakened past giving evenings is written
    // down once, with the cause that weakened them (a record, not a roll).
    const lapse = volunteerLapseReason(api, campaign, person);
    if (
      lapse &&
      !api.state.durableLog.get(
        `${VOLUNTEER_LAPSED_EVENT}:${filingId}:${id}` as never,
      )
    )
      api.emit({
        id: `${VOLUNTEER_LAPSED_EVENT}:${filingId}:${id}`,
        date,
        kind: VOLUNTEER_LAPSED_EVENT,
        personIds: api.state.people.has(campaign.candidateId)
          ? [campaign.candidateId as PersonId, person.id]
          : [person.id],
        placeId: townRow(api).townPlaceId,
        source: {
          tag: "SOURCED",
          citation: `${person.givenName} ${person.familyName} stops giving evenings to campaign ${filingId}`,
          asOf: date,
        },
        facts: {
          volunteerId: id,
          candidateId: campaign.candidateId,
          campaignId: campaign.id,
          filingId,
          reason: lapse,
          joinedId: `${VOLUNTEER_JOINED_EVENT}:${filingId}:${id}`,
        },
      });
    const hours = canvassHoursFree(api, person);
    if (hours <= 0) continue;
    // Each working day adds their share to what they are owed (starting
    // even); a whole evening owed sends them out and spends it.
    const owed =
      (carries[id] ?? OPENING_CARRY) + shiftShare(api, campaign, person);
    const goes = owed >= 1;
    carries[id] = goes ? owed - 1 : owed;
    weighed = true;
    if (!goes) continue;
    // The evening comes out of the day's discretionary hours, the budget
    // every other engine's choices read.
    api.recordDiscretionaryTime(
      person.id,
      Math.min(hours * perHour, discretionaryHours(api, id) * perHour),
    );
    walked.add(id);
    going.push({ person, hours });
  }
  const shifts: VolunteerShift[] = [];
  if (going.length) {
    const walk = openDoorWalk(api, filingId);
    for (const { person, hours } of going) {
      const doors = walk.walked.length;
      const counted = walk.counted;
      const met = walkWith(api, walk, person.id, hours, false);
      shifts.push({
        volunteerId: person.id,
        hours,
        doorsKnocked: walk.walked.length - doors,
        causeIds: met.map((c) => c.id),
        countedReached: walk.counted - counted,
      });
    }
    closeDoorWalk(api, walk);
  }
  const noted: Record<string, string> = { ...(campaign.shiftNotedOn ?? {}) };
  const contest = elections(api, "contests").get(filing.contestId) as
    ContestRow | undefined;
  for (const shift of shifts) {
    const id = shift.volunteerId;
    // Kept as a cause is: where the player's circle is in it (their own
    // campaign's volunteers, a friend walking for a rival), on a volunteer's
    // first evening and then at most once a week.
    if (!keepsWhy(core, campaign.candidateId, id)) continue;
    const last = noted[id];
    if (
      last !== undefined &&
      daysBetween(last, date) < campaignParameter("volunteerShiftEventDays")
    )
      continue;
    noted[id] = date;
    const person = api.state.people.get(id)!;
    // stopgapId: SG-CAMPAIGN-volunteer-shift-no-scene
    api.stopgap("SG-CAMPAIGN-volunteer-shift-no-scene");
    api.emit({
      id: `${VOLUNTEER_SHIFT_EVENT}:${filingId}:${id}:${date}`,
      date,
      kind: VOLUNTEER_SHIFT_EVENT,
      personIds: api.state.people.has(campaign.candidateId)
        ? [campaign.candidateId as PersonId, person.id]
        : [person.id],
      placeId: townRow(api).townPlaceId,
      source: {
        tag: "SOURCED",
        citation: `${person.givenName} ${person.familyName} canvasses for campaign ${filingId}`,
        asOf: date,
      },
      facts: {
        volunteerId: id,
        candidateId: campaign.candidateId,
        campaignId: campaign.id,
        filingId,
        contestId: filing.contestId,
        ...(contest ? { office: contest.title } : {}),
        firstShift: String(last === undefined),
        hours: String(shift.hours),
        doorsKnocked: String(shift.doorsKnocked),
        met: String(shift.causeIds.length),
        countedReached: String(shift.countedReached),
      },
    });
  }
  if (!weighed) return shifts;
  save(api, {
    ...campaignFor(api, filingId),
    shiftCarries: carries,
    shiftNotedOn: noted,
  });
  return shifts;
}
