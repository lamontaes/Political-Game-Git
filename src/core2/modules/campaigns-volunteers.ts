/**
 * Volunteers: asking, joining, lapsing, managing and offering to help.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { closenessBetween } from "./people";
import { leanedYes } from "../trait-decisions";
import type { CoreAPI, PersonId, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { addDays, makeIsoDate } from "../kernel/dates";
import { campaignParameter } from "../campaign-data";
import { PRESS_MODULE_ID } from "./press";
import { newsKey } from "./news";
import { standing, type ContestRow, type FilingRow } from "./elections";
import { offerReason, offerWeight } from "./campaigns-asks";
import {
  ageOn,
  campaignFor,
  elections,
  impressionOf,
  rivalFiling,
  save,
  table,
  townRow,
} from "./campaigns-base";
import type { CampaignRow } from "./campaigns-base";
import {
  VOLUNTEER_JOINED_EVENT,
  VOLUNTEER_OFFERED_EVENT,
} from "./campaigns-constants";
import { inTouchSince } from "./campaigns-rival-word";

/**
 * An ask to volunteer that comes through an organization that endorsed the
 * candidate: who asked for it, and how far the person shares its cause.
 */
export interface VolunteerAsk {
  /** The group's speaker: closeness to them counts as closeness to the candidate does. */
  readonly askerId: string;
  /** The person's own agreement with what the group stands for, 0 to 1. */
  readonly stake: number;
}

/**
 * Whether someone gives their evenings to a campaign before personality: how
 * much they like the candidate, how close they are (to the candidate, and to
 * whoever asked on the campaign's behalf), how far they share the cause of a
 * group that asked them, against the hours their work already takes, past
 * the volunteer threshold.
 */
export function volunteerReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
  ask?: VolunteerAsk,
): number {
  const warmth =
    impressionOf(api, person.id, campaign.candidateId)?.warmth ?? 0;
  const core = api.state as CoreState;
  const tie = closenessBetween(core, person.id, campaign.candidateId);
  const family = person.familyIds.has(campaign.candidateId) ? 1 : 0;
  const asker =
    ask && ask.askerId !== person.id
      ? closenessBetween(core, person.id, ask.askerId)
      : 0;
  const weeklyWork = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  return (
    warmth +
    campaignParameter("volunteerClosenessWeight") * (tie + family + asker) +
    (ask
      ? campaignParameter("groupVolunteerStakeWeight") *
        Math.max(0, Math.min(1, ask.stake))
      : 0) -
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes") -
    campaignParameter("volunteerThreshold")
  );
}

/**
 * Writes the record of someone joining a campaign: when, and the ask or the
 * filing that brought them (`causeId`, the group speaker's id when a group's
 * ask did, else the candidate's filing record).
 */
export function recordVolunteerJoined(
  api: CoreAPI,
  campaign: CampaignRow,
  personId: string,
  how: "asked" | "said-so" | "group-ask",
  askerId?: string,
): void {
  // stopgapId: SG-CAMPAIGN-volunteer-joined-lapsed-unread
  api.stopgap("SG-CAMPAIGN-volunteer-joined-lapsed-unread");
  const date = api.state.date;
  const person = api.state.people.get(personId);
  const filed = api.state.durableLog.get(
    `candidate-filed:${campaign.filingId}` as never,
  );
  api.emit({
    id: `${VOLUNTEER_JOINED_EVENT}:${campaign.filingId}:${personId}`,
    date,
    kind: VOLUNTEER_JOINED_EVENT,
    personIds: api.state.people.has(campaign.candidateId)
      ? [campaign.candidateId as PersonId, personId as PersonId]
      : [personId as PersonId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `${person?.givenName ?? ""} ${person?.familyName ?? ""} joins campaign ${campaign.filingId}`,
      asOf: date,
    },
    facts: {
      volunteerId: personId,
      candidateId: campaign.candidateId,
      campaignId: campaign.id,
      filingId: campaign.filingId,
      how,
      causeId: askerId ?? (filed ? String(filed.id) : campaign.filingId),
      ...(askerId ? { askerId } : {}),
    },
  });
}

/**
 * Why a volunteer's reasons have weakened past giving evenings, or null while
 * they hold. The reasons are the ones that brought them (`volunteerReason`:
 * liking, closeness, family, against the hours their work takes); the cause
 * named is the largest one working against them: their work's hours, a
 * candidate they no longer like, or no closeness left to carry them.
 */
export function volunteerLapseReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): "work-hours" | "cooled" | "distant" | null {
  if (volunteerReason(api, campaign, person) > 0) return null;
  const core = api.state as CoreState;
  const warmth =
    impressionOf(api, person.id, campaign.candidateId)?.warmth ?? 0;
  const tie = closenessBetween(core, person.id, campaign.candidateId);
  const weeklyWork = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  const load = weeklyWork / campaignParameter("turnoutWorkWeekMinutes");
  if (load >= Math.max(0, -warmth) && load >= tie) return "work-hours";
  return warmth < 0 ? "cooled" : "distant";
}

/**
 * Ask someone to volunteer. They say yes when liking the candidate,
 * closeness, an outgoing or dutiful temperament (and, asked through a group
 * that endorsed, their tie to its speaker and their share in its cause)
 * outweigh the hours their work already takes. A rival standing in the same
 * race is not asked (`rivalFiling`).
 */
export function askToVolunteer(
  api: CoreAPI,
  filingId: string,
  personId: string,
  ask?: VolunteerAsk,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge") ||
    rivalFiling(api, campaign, personId)
  )
    return false;
  const cast = table(api, "casts").get(
    `${campaign.filingId}|${personId}|volunteer`,
  ) as unknown as { yes: boolean } | undefined;
  const yes = cast
    ? cast.yes
    : leanedYes(
        api.state,
        person,
        "campaigns.volunteer",
        "volunteer",
        "decline",
        volunteerReason(api, campaign, person, ask),
      );
  if (yes && !campaign.volunteerIds.includes(personId)) {
    save(api, {
      ...campaign,
      volunteerIds: [...campaign.volunteerIds, personId],
    });
    recordVolunteerJoined(
      api,
      campaign,
      personId,
      ask ? "group-ask" : "asked",
      ask?.askerId,
    );
  }
  return yes;
}

/**
 * A decision cast for a person on a campaign's volunteer ask, before they are asked (the player's, or a
 * dev pick): `askToVolunteer` reads it in place of their own lean, as the legislature reads a signature
 * cast for a member. A person who is a rival's or under the volunteering age is still not asked.
 */
export function castVolunteer(
  api: CoreAPI,
  filingId: string,
  personId: string,
  yes: boolean,
): void {
  table(api, "casts").put({
    id: `${filingId}|${personId}|volunteer`,
    yes,
  } as unknown as ModuleRow);
}

/**
 * Whether someone gives a campaign more than evenings and runs it (its
 * manager, the point person local campaign guides put first,
 * docs/research/words-scenes-2026-10-26.md section 1): the reasons they would
 * volunteer, with closeness and family counted again, past the manager's own
 * bar. A partner or a best friend clears it where an acquaintance does not.
 * stopgapId: SG-CAMPAIGN-manager-changes-nothing-yet
 */
export function managerReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  const tie = closenessBetween(api.state, person.id, campaign.candidateId);
  const family = person.familyIds.has(campaign.candidateId) ? 1 : 0;
  return (
    volunteerReason(api, campaign, person) +
    campaignParameter("volunteerThreshold") +
    campaignParameter("managerClosenessWeight") * (tie + family) -
    campaignParameter("managerThreshold")
  );
}

/**
 * Ask someone to run the campaign. They say yes by the manager's reasons and
 * their own temperament; a yes puts them on its staff, off its volunteers.
 * A rival standing in the same race is not asked (`rivalFiling`).
 */
export function askToManage(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    personId === campaign.candidateId ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge") ||
    rivalFiling(api, campaign, personId)
  )
    return false;
  const yes = leanedYes(
    api.state,
    person,
    "campaigns.volunteer",
    "volunteer",
    "decline",
    managerReason(api, campaign, person),
  );
  if (yes) save(api, onStaff(campaign, personId));
  return yes;
}

/** The campaign with someone on its staff (and so off its volunteers). */
export const onStaff = (
  campaign: CampaignRow,
  personId: string,
): CampaignRow => ({
  ...campaign,
  staffIds: campaign.staffIds.includes(personId)
    ? campaign.staffIds
    : [...campaign.staffIds, personId],
  volunteerIds: campaign.volunteerIds.filter((id) => id !== personId),
});

/**
 * People who know a candidate offer to help once word of the filing reaches
 * them: the candidate told them (they have been in touch since the filing),
 * or they heard the press's story of it, read in the paper or passed on in
 * talk (the news engine's own spread). Offers arrive over weeks and months as
 * each tie is next in touch. The candidate's own household is already in the
 * filing's scene, so they are not asked again here. Each who has heard weighs it once by the same reasons as an
 * ask to volunteer (liking, closeness, family, against their work hours) and
 * their own temperament. Offers come at least a week apart (the next one
 * waits, unweighed, for its turn). A candidate other than the player takes the help;
 * the player answers in the scene the offer stages (`answerOffer`).
 * stopgapId: SG-CAMPAIGN-offer-full-people-only
 */
export function offersToHelp(api: CoreAPI): void {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return;
  const date = api.state.date;
  const stories = api.moduleState(PRESS_MODULE_ID).table("stories");
  for (const filing of elections(
    api,
    "filings",
  ).rows() as unknown as FilingRow[]) {
    if (!standing(filing)) continue;
    const candidate = api.state.people.get(filing.personId);
    if (!candidate?.alive || !candidate.knownIds.size) continue;
    const contest = elections(api, "contests").get(filing.contestId) as
      ContestRow | undefined;
    if (!contest || contest.electionDate <= date) continue;
    const filedOn = api.state.durableLog.get(
      `candidate-filed:${filing.id}` as never,
    )?.date;
    if (!filedOn || filedOn >= date) continue;
    const told = (
      stories.query("byWire", [`candidate-filed:${filing.id}`]) as unknown as {
        id: string;
      }[]
    ).map((row) => newsKey(row.id));
    // In touch since the filing: the relationship's last contact.
    const toldInPerson = (id: string) =>
      inTouchSince(api.state as CoreState, id, candidate.id, filedOn);
    const existing = table(api, "campaigns").get(filing.id) as unknown as
      CampaignRow | undefined;
    // Offers come a week or more apart: the next waits its turn, unweighed.
    if (
      existing?.lastOfferOn &&
      existing.lastOfferOn >
        addDays(makeIsoDate(date), -campaignParameter("offerSpacingDays"))
    )
      continue;
    const heard = (id: string) =>
      toldInPerson(id) || told.some((key) => api.knows(id, key));
    // While nobody runs the campaign, the closest who have heard (its
    // household too, who heard it first) weigh running it, nearest first,
    // before anyone weighs giving evenings; the first yes is the week's offer.
    // The player is offered a manager once (`answerOffer` staffs the helper
    // on a yes): a no or a walk away is not followed by the next in line
    // asking in the same week, since nothing is decided for the player.
    const offeredToPlayer =
      candidate.id === (api.state as CoreState).playerId &&
      (existing?.managerWeighedIds ?? []).some(
        (id) =>
          api.state.durableLog.get(
            `${VOLUNTEER_OFFERED_EVENT}:${filing.id}:${id}` as never,
          )?.facts?.role === "manager",
      );
    if (!existing?.staffIds.length && !offeredToPlayer) {
      const campaign = campaignFor(api, filing.id);
      const asked = new Set(campaign.managerWeighedIds ?? []);
      const before = asked.size;
      const closeness = (person: Readonly<PersonState>) =>
        closenessBetween(api.state, person.id, candidate.id) +
        (person.familyIds.has(candidate.id) ? 1 : 0);
      const close = [
        ...new Set([
          ...(api.state.households.get(candidate.householdId)?.memberIds ?? []),
          ...candidate.knownIds,
        ]),
      ]
        .filter((id) => id !== candidate.id && !asked.has(id))
        .map((id) => api.state.people.get(id))
        .filter(
          (person): person is PersonState =>
            !!person?.alive &&
            ageOn(person, date) >= campaignParameter("minimumVolunteerAge") &&
            (person.householdId === candidate.householdId ||
              heard(person.id)) &&
            !rivalFiling(api, campaign, person.id),
        )
        .sort(
          (a, b) => closeness(b) - closeness(a) || a.id.localeCompare(b.id),
        );
      let manager: string | null = null;
      for (const person of close) {
        asked.add(person.id);
        if (
          leanedYes(
            api.state,
            person,
            "campaigns.volunteer",
            "volunteer",
            "decline",
            managerReason(api, campaign, person),
          )
        ) {
          manager = person.id;
          break;
        }
      }
      if (asked.size !== before) {
        if (manager)
          offerHelp(api, filing, contest, candidate.id, manager, "manager");
        const current = campaignFor(api, filing.id);
        // A world candidate takes the help; the player's offer is theirs to
        // answer in its scene, and the helper runs the campaign only on a
        // yes (`answerOffer`): nothing is decided for the player.
        const playersOwn = candidate.id === (api.state as CoreState).playerId;
        save(api, {
          ...(manager && !playersOwn ? onStaff(current, manager) : current),
          managerWeighedIds: [...asked],
          ...(manager ? { lastOfferOn: date } : {}),
        });
        if (manager) continue;
      }
    }
    const weighed = new Set(existing?.offerWeighedIds ?? []);
    const helping = new Set(existing?.volunteerIds ?? []);
    const before = weighed.size;
    let offered: string | null = null;
    for (const id of [...candidate.knownIds].sort()) {
      if (offered) break;
      if (weighed.has(id) || helping.has(id)) continue;
      const person = api.state.people.get(id);
      if (
        !person?.alive ||
        person.householdId === candidate.householdId ||
        ageOn(person, date) < campaignParameter("minimumVolunteerAge") ||
        !heard(id) ||
        rivalFiling(api, campaignFor(api, filing.id), id)
      )
        continue;
      weighed.add(id);
      if (
        !leanedYes(
          api.state,
          person,
          "campaigns.volunteer",
          "volunteer",
          "decline",
          offerReason(api, campaignFor(api, filing.id), person),
        )
      )
        continue;
      offered = id;
      offerHelp(api, filing, contest, candidate.id, id, "volunteer");
    }
    if (weighed.size === before) continue;
    const current = campaignFor(api, filing.id);
    save(api, {
      ...current,
      offerWeighedIds: [...weighed],
      ...(offered ? { lastOfferOn: date } : {}),
      // The help offered is taken, the player's campaign's too: the offer
      // stops the player only as a scene its weight earns, where the player
      // may still turn it down (`answerOffer`).
      volunteerIds: offered
        ? [...current.volunteerIds, offered]
        : current.volunteerIds,
    });
  }
}

/**
 * Someone's offer to help a candidate's campaign, on the record: to give
 * evenings ("volunteer") or to run it ("manager"). Its weight is how much it
 * matters to the candidate's story (`offerWeight`).
 */
function offerHelp(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
  candidateId: string,
  helperId: string,
  role: "volunteer" | "manager",
): void {
  const person = api.state.people.get(helperId);
  const date = api.state.date;
  api.emit({
    id: `${VOLUNTEER_OFFERED_EVENT}:${filing.id}:${helperId}`,
    date,
    kind: VOLUNTEER_OFFERED_EVENT,
    personIds: [candidateId, helperId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `${person?.givenName ?? ""} ${person?.familyName ?? ""} offers to ${role === "manager" ? "run" : "help"} campaign ${filing.id}`,
      asOf: date,
    },
    facts: {
      offeredBy: helperId,
      invitedId: candidateId,
      campaignId: filing.id,
      filingId: filing.id,
      contestId: contest.id,
      office: contest.title,
      role,
      weight: String(offerWeight(api, filing, contest, helperId)),
    },
  });
}
