import {
  educationHistoryEvidenceForPerson,
  organizationProfileAt,
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
} from "../life-queries";
import { personName } from "../people";
import type { EntityId, IsoDate, World } from "../types";

/**
 * What the hiring office actually knows about a staff candidate.
 * Only existing canonical work and education records support an assessment.
 * Offering a candidate never supplies a working life. Without recorded posts,
 * the office has no evidence of steadiness.
 */

export const STAFF_EVIDENCE_VERSION = "governing-staff-evidence/v1";

export interface StaffAssessment {
  /** Whether the office is reading real records or has little to read. */
  readonly evidence: "recorded" | "limited";
  readonly background: string;
  readonly strength: string;
  readonly caution: string;
  /** Internal weight for outcomes; never rendered. */
  readonly steadiness: number | null;
}

interface ReadPost {
  readonly title: string;
  readonly employer: string;
  readonly classification: string | null;
  readonly occupation: string | null;
  readonly startedAt: IsoDate;
  readonly endedAt: IsoDate | null;
  readonly years: number;
}

function yearsBetween(start: IsoDate, end: IsoDate): number {
  return Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / (365.2425 * 86_400_000)),
  );
}

/** Every recorded post, oldest first, read from canonical work records. */
export function staffCareerEvidence(
  world: World,
  personId: EntityId,
): readonly ReadPost[] {
  return workRelationshipHistoryForPerson(world, personId)
    .map((relationship) => {
      const role = workRoleHistory(world, relationship.id).at(-1);
      const ended = workStatusHistory(world, relationship.id)
        .filter((status) => status.status === "ended")
        .at(-1);
      const profile = relationship.organizationId
        ? organizationProfileAt(world, relationship.organizationId)
        : undefined;
      const endedAt = ended?.effectiveAt ?? null;
      return {
        title: role?.title ?? "an unrecorded role",
        employer: profile?.name ?? "an organization the record does not name",
        classification: profile?.classification ?? null,
        occupation: role?.occupationClassification ?? null,
        startedAt: relationship.startedAt,
        endedAt,
        years: yearsBetween(
          relationship.startedAt,
          endedAt ?? world.currentDate,
        ),
      };
    })
    .sort((left, right) => (left.startedAt < right.startedAt ? -1 : 1));
}

const yearWord = (years: number) =>
  years <= 1 ? "under a year" : `${years} years`;

/** Whether the record shows work inside the legislature. */
export function staffKnowsLegislature(
  world: World,
  personId: EntityId,
): boolean {
  return staffCareerEvidence(world, personId).some(
    (post) => post.occupation === "profession:legislative-staff",
  );
}

/**
 * The office's reading of one candidate. Only recorded facts are used, and
 * what is absent is named as absence rather than filled in.
 */
export function staffAssessment(
  world: World,
  personId: EntityId,
): StaffAssessment {
  const posts = staffCareerEvidence(world, personId);
  const degrees = educationHistoryEvidenceForPerson(world, personId).filter(
    (row) => row.source === "canonical" && row.state.status === "completed",
  );
  if (posts.length === 0) {
    const person = world.people[personId];
    return {
      evidence: "limited",
      background: `The office has no record of ${person ? personName(person) : "this person"}'s working life.`,
      strength: "nothing recorded speaks for or against them",
      caution: "hiring them would be a decision made without evidence",
      steadiness: null,
    };
  }
  const latest = posts.at(-1)!;
  const publicYears = posts
    .filter((post) => post.classification === "sector:government")
    .reduce((total, post) => total + post.years, 0);
  const legislative = posts.some(
    (post) => post.occupation === "profession:legislative-staff",
  );
  const budget = posts.some(
    (post) => post.occupation === "profession:public-budget-analysis",
  );
  const campaign = posts.some(
    (post) => post.occupation === "profession:campaign-management",
  );
  const awayYears = latest.endedAt
    ? yearsBetween(latest.endedAt, world.currentDate)
    : 0;
  const background = `${latest.title} at ${latest.employer} for ${yearWord(latest.years)}${
    posts.length > 1
      ? `, after ${posts.length - 1} earlier post${posts.length > 2 ? "s" : ""} there`
      : ""
  }${degrees.length > 0 ? ", with a completed degree" : ""}.`;
  const strength = budget
    ? "reads a budget quickly, and the record shows years of doing it"
    : legislative
      ? "has worked inside the legislature and knows its staff"
      : campaign
        ? "has run a campaign organization under pressure"
        : publicYears > 0
          ? "has spent years inside government offices"
          : "brings experience from outside government";
  const caution = !legislative
    ? "has never worked in the legislature, by the record"
    : publicYears === 0
      ? "has no recorded time inside an executive agency"
      : awayYears >= 2
        ? `has been out of public office work for ${yearWord(awayYears)}`
        : "has always worked in one institution, and knows little of the others";
  return {
    evidence: "recorded",
    background,
    strength,
    caution,
    steadiness: Math.max(
      1,
      Math.min(4, 1 + Math.floor((publicYears + latest.years) / 6)),
    ),
  };
}

/**
 * One reading of an assessment for a person weighing a hire. The background
 * is already a full sentence; the strength and caution follow it as a second
 * one, with the person named, rather than being spliced onto its period.
 */
export function staffAssessmentSummary(
  name: string,
  assessment: StaffAssessment,
): string {
  return assessment.evidence === "limited"
    ? `${assessment.background} ${capitalize(assessment.strength)}, and ${assessment.caution}.`
    : `${assessment.background} ${name} ${assessment.strength}, but ${assessment.caution}.`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
