import { daysBetween } from "./dates";
import {
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
  workStatusAt,
} from "./life-queries";
import type { CampaignRecord, EntityId, IsoDate, World } from "./types";

/**
 * Who reads the campaign's own numbers, and how well.
 *
 * The field memo is the campaign's reckoning of where it stands, and it is only
 * as good as the people producing it. This finds the most experienced survey
 * worker on the campaign, among the candidate and the staff active today, from
 * the work they have actually done: time spent in a survey occupation (survey
 * researcher, statistician, market research analyst, political scientist).
 *
 * BLANKET RULE, not sourced: the tiers and the error each allows. With nobody
 * who has done survey work, the memo is a volunteer's count of the doors and
 * can be wrong by as much as twelve points; with some experience, nine; with
 * three years or more, six, which is what every memo allowed before. The
 * stated margin stays four points, so an amateur memo is more confident than
 * it has any right to be. Not modelled: paying a professional pollster, sample
 * size, house effects and a campaign's lean toward good news. Filed with
 * ChatGPT as `campaign-polling-accuracy-by-who-does-it`.
 */
export const CAMPAIGN_POLLING_PROFILE = "ocd-campaign-polling-game-profile/v1";

const SURVEY_OCCUPATIONS = [
  "19-3022", // Survey researchers
  "15-2041", // Statisticians
  "13-1161", // Market research analysts and marketing specialists
  "19-3094", // Political scientists
] as const;

export type CampaignPollingReader =
  | { readonly kind: "volunteer" }
  | {
      readonly kind: "experienced";
      readonly personId: EntityId;
      readonly surveyDays: number;
    };

export interface CampaignPollingQuality {
  readonly reader: CampaignPollingReader;
  /** Each of three independent draws is uniform on plus or minus this. */
  readonly drawBasisPoints: number;
}

const SEASONED_SURVEY_DAYS = 3 * 365;

function isSurveyOccupation(classification: string | null): boolean {
  if (!classification?.startsWith("custom:onet-")) return false;
  const code = classification.slice("custom:onet-".length);
  return SURVEY_OCCUPATIONS.some((soc) => code.startsWith(soc));
}

/** Days this person has spent working in a survey occupation, up to today. */
export function surveyWorkDays(world: World, personId: EntityId): number {
  let total = 0;
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    const roles = workRoleHistory(world, relationship.id);
    const first = roles.find((role) =>
      isSurveyOccupation(role.occupationClassification),
    );
    if (!first) continue;
    const ended = workStatusHistory(world, relationship.id).find(
      (status) =>
        status.effectiveAt >= first.effectiveAt && status.status === "ended",
    );
    const until: IsoDate =
      ended && ended.effectiveAt < world.currentDate
        ? ended.effectiveAt
        : world.currentDate;
    if (until > first.effectiveAt)
      total += daysBetween(first.effectiveAt, until);
  }
  return total;
}

function activeCampaignPeople(
  world: World,
  campaign: CampaignRecord,
): readonly EntityId[] {
  const staff = campaign.staffWorkRelationshipIds.flatMap((id) => {
    const work = world.history.workRelationships.find(
      (candidate) => candidate.id === id,
    );
    return work && workStatusAt(world, id)?.status === "active"
      ? [work.personId]
      : [];
  });
  return [campaign.candidatePersonId, ...staff];
}

export function campaignPollingQuality(
  world: World,
  campaign: CampaignRecord,
): CampaignPollingQuality {
  let best: CampaignPollingReader = { kind: "volunteer" };
  for (const personId of activeCampaignPeople(world, campaign)) {
    const surveyDays = surveyWorkDays(world, personId);
    if (
      surveyDays > 0 &&
      (best.kind === "volunteer" || surveyDays > best.surveyDays)
    )
      best = { kind: "experienced", personId, surveyDays };
  }
  const drawBasisPoints =
    best.kind === "volunteer"
      ? 400
      : best.surveyDays >= SEASONED_SURVEY_DAYS
        ? 200
        : 300;
  return { reader: best, drawBasisPoints };
}
