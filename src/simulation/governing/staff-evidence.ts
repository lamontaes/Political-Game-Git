import { dateAtAge, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import {
  educationHistoryEvidenceForPerson,
  organizationProfileAt,
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
} from "../life-queries";
import { personName } from "../people";
import { SeededRng } from "../rng";
import { applyCharacterHistoryPlan } from "../character-history";
import type { CharacterHistoryTransition } from "../character-history";
import type { EntityId, IsoDate, World } from "../types";

/**
 * What the hiring office actually knows about a staff candidate.
 *
 * An assessment used to be three sentences drawn from a list by person id: the
 * same identifier always "ran a state agency division for years" whether or not
 * that person had ever held a job. Now a candidate's working life is written
 * into canonical history once, before anybody is offered, and the assessment is
 * a reading of those records: where they worked, for how long, what the role
 * was, and what the record does not show. A person with nothing in their
 * history gets a limited assessment that says so, rather than a biography
 * invented at the moment of display.
 */

export const STAFF_EVIDENCE_VERSION = "governing-staff-evidence/v1";

export interface StaffAssessment {
  /** Whether the office is reading real records or has little to read. */
  readonly evidence: "recorded" | "limited";
  readonly background: string;
  readonly strength: string;
  readonly caution: string;
  /** Internal weight for outcomes; never rendered. */
  readonly steadiness: number;
}

interface CareerPost {
  readonly employerKey: string;
  readonly employerName: string;
  readonly sector: "government" | "legislative" | "private";
  readonly title: string;
  readonly occupation: string;
  readonly startedAgo: number;
  readonly endedAgo: number;
}

/**
 * Three working lives, written as ordinary records. The organizations and
 * dates are fiction the game authors, like any other generated person; what
 * matters is that the assessment later reads them instead of a list.
 */
const CAREERS: readonly (readonly CareerPost[])[] = [
  [
    {
      employerKey: "budget-office",
      employerName: "the state budget office",
      sector: "government",
      title: "Budget analyst",
      occupation: "profession:public-budget-analysis",
      startedAgo: 16,
      endedAgo: 11,
    },
    {
      employerKey: "budget-office",
      employerName: "the state budget office",
      sector: "government",
      title: "Deputy budget director",
      occupation: "profession:public-budget-analysis",
      startedAgo: 11,
      endedAgo: 1,
    },
  ],
  [
    {
      employerKey: "legislative-staff",
      employerName: "the legislature's staff office",
      sector: "legislative",
      title: "Committee staff aide",
      occupation: "profession:legislative-staff",
      startedAgo: 13,
      endedAgo: 7,
    },
    {
      employerKey: "legislative-staff",
      employerName: "the legislature's staff office",
      sector: "legislative",
      title: "Senior legislative aide",
      occupation: "profession:legislative-staff",
      startedAgo: 7,
      endedAgo: 1,
    },
  ],
  [
    {
      employerKey: "campaign-firm",
      employerName: "a political consulting firm",
      sector: "private",
      title: "Campaign manager",
      occupation: "profession:campaign-management",
      startedAgo: 9,
      endedAgo: 2,
    },
  ],
];

const EMPLOYERS: Readonly<
  Record<string, { readonly name: string; readonly classification: string }>
> = {
  "budget-office": {
    name: "State budget office",
    classification: "sector:government",
  },
  "legislative-staff": {
    name: "Legislative staff office",
    classification: "sector:government",
  },
  "campaign-firm": {
    name: "Political consulting firm",
    classification: "sector:private",
  },
};

const AUTHORED = {
  kind: "authored" as const,
  note: `${STAFF_EVIDENCE_VERSION}: fictional working history for a generated staff candidate.`,
};

const TIME_DEMAND = (jurisdictionId: EntityId) => ({
  expectedWeekly: { minimumHours: 35, maximumHours: 55 },
  attention: "high" as const,
  concurrency: "mostly-exclusive" as const,
  scheduleRigidity: "mixed" as const,
  interruptibility: "limited" as const,
  locationJurisdictionId: jurisdictionId,
});

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return makeIsoDate(
    `${y - years}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  );
}

/**
 * Writes one candidate's working life into canonical history, once. Posts that
 * would start before the person was 22 are dropped rather than shortened, so a
 * young candidate legitimately has less to show.
 */
export function generateStaffCandidateHistory(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly stableKey: string;
    readonly jurisdictionId: EntityId;
  },
): World {
  const person = world.people[input.personId];
  if (!person) return world;
  if (
    workRelationshipHistoryForPerson(world, input.personId).some((record) =>
      record.stableKey.startsWith(`${STAFF_EVIDENCE_VERSION}:`),
    )
  )
    return world;
  const rng = new SeededRng(world.seed).fork(
    `${STAFF_EVIDENCE_VERSION}:${input.stableKey}`,
  );
  const career = CAREERS[rng.integer(0, CAREERS.length)]!;
  // These institutions are older than anybody's career in them, so a candidate
  // who started earlier than the last one does not predate their employer.
  const institutionsFormedAt = yearsBefore(world.currentDate, 80);
  const earliestWork = dateAtAge(person.birthDate, 22);
  const transitions: CharacterHistoryTransition[] = [];
  const organizations = new Set<string>();
  for (const [index, post] of career.entries()) {
    const startedAt = yearsBefore(world.currentDate, post.startedAgo);
    const endedAt = yearsBefore(world.currentDate, post.endedAgo);
    if (startedAt < earliestWork) continue;
    const employer = EMPLOYERS[post.employerKey]!;
    const organizationKey = `${STAFF_EVIDENCE_VERSION}:${input.jurisdictionId}:${post.employerKey}`;
    if (
      !organizations.has(organizationKey) &&
      !world.history.organizations.some(
        (row) => row.stableKey === organizationKey,
      )
    ) {
      organizations.add(organizationKey);
      transitions.push({
        kind: "organization",
        input: {
          stableKey: organizationKey,
          formedAt: institutionsFormedAt,
          provenance: AUTHORED,
          initialProfile: {
            name: employer.name,
            classification: employer.classification as never,
            locationJurisdictionId: input.jurisdictionId,
          },
        },
      });
    }
    const workKey = `${STAFF_EVIDENCE_VERSION}:${input.stableKey}:post:${index}`;
    transitions.push({
      kind: "work",
      input: {
        stableKey: workKey,
        personId: input.personId,
        organizationId: createStableId(
          "organization",
          `${world.id}:${organizationKey}`,
        ),
        startedAt,
        kind:
          post.sector === "private"
            ? "employment:private-sector"
            : "employment:public-sector",
        compensation: "paid",
        authority: index === career.length - 1 ? "directs-others" : "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: AUTHORED,
        initialRole: {
          title: post.title,
          occupationClassification: post.occupation as never,
          locationJurisdictionId: input.jurisdictionId,
          timeDemand: TIME_DEMAND(input.jurisdictionId),
        },
      },
    });
    transitions.push({
      kind: "work-status",
      input: {
        stableKey: `${workKey}:ended`,
        workStableKey: workKey,
        effectiveAt: endedAt,
        status: "ended",
        reason: "Left the position.",
        provenance: AUTHORED,
      },
    });
  }
  if (transitions.length === 0) return world;
  const schoolKey = `${STAFF_EVIDENCE_VERSION}:${input.jurisdictionId}:university`;
  const graduatedAt = dateAtAge(person.birthDate, 22);
  if (!world.history.organizations.some((row) => row.stableKey === schoolKey))
    transitions.unshift({
      kind: "organization",
      input: {
        stableKey: schoolKey,
        formedAt: institutionsFormedAt,
        provenance: AUTHORED,
        initialProfile: {
          name: "State university",
          classification: "sector:education" as never,
          locationJurisdictionId: input.jurisdictionId,
        },
      },
    });
  const enrollmentKey = `${STAFF_EVIDENCE_VERSION}:${input.stableKey}:degree`;
  transitions.push(
    {
      kind: "education",
      input: {
        stableKey: enrollmentKey,
        personId: input.personId,
        organizationId: createStableId(
          "organization",
          `${world.id}:${schoolKey}`,
        ),
        startedAt: yearsBefore(graduatedAt, 4),
        programKind: "postsecondary:bachelors-degree",
        contextKind: "stage:postsecondary",
        provenance: AUTHORED,
      },
    },
    {
      kind: "education-state",
      input: {
        stableKey: `${enrollmentKey}:completed`,
        enrollmentStableKey: enrollmentKey,
        effectiveAt: graduatedAt,
        status: "completed",
        contextKind: "stage:postsecondary",
        reason: "Completed the program.",
        provenance: AUTHORED,
      },
    },
  );
  return applyCharacterHistoryPlan(world, {
    stableKey: `${STAFF_EVIDENCE_VERSION}:${input.stableKey}`,
    mode: "quick-generated",
    personId: input.personId,
    transitions,
  }).world;
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
      steadiness: 2,
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
