import {
  applicationOffer,
  applicationBlocked,
  applicationsFor,
  employerDisplayName,
  expectedStart,
  introducersFor,
  jobOpening,
  JOB_MARKET_WORK_KIND,
  latestApplicationStep,
  openJobListings,
  payPhrase,
  startBlocked,
} from "../simulation/job-market";
import type { JobOpeningRecord } from "../simulation/job-market-types";
import { residentNameForJurisdiction } from "../simulation/life-places";
import { workRoleAt, workStatusAt } from "../simulation/life-queries";
import type { EntityId, World } from "../simulation/types";
import { CAREER_SOURCE_CONTEXT } from "./career-path7-provider";
import { nationalMedianWageSentence } from "./career-wage";
import { proseDate } from "./prose-dates";

/**
 * The Jobs screen, as a player reads it: the listings in their town, the
 * applications they have made and the job they hold. Reads only; every line
 * comes from a recorded opening, application step or work record, and a
 * field the world does not know is left out rather than filled in.
 */

export interface JobListingView {
  readonly openingId: EntityId;
  readonly title: string;
  /** "Washoe County · Washoe County" style: employer, then where the work is. */
  readonly employerLine: string;
  readonly termsLine: string;
  readonly details: readonly string[];
  readonly closesLine: string;
  readonly applyBlocked: string | null;
  readonly introducers: readonly {
    readonly personId: EntityId;
    readonly label: string;
  }[];
  /** A national median, for the optional detail only. */
  readonly nationalMedian: string | null;
}

export type JobApplicationAction = "accept" | "refuse" | "start";

export interface JobApplicationView {
  readonly applicationId: EntityId;
  readonly heading: string;
  readonly status: string;
  readonly actions: readonly JobApplicationAction[];
  readonly startBlocked: string | null;
}

export interface HeldJobView {
  readonly workRelationshipId: EntityId;
  readonly heading: string;
  readonly status: string;
}

export interface JobMarketView {
  readonly townName: string;
  readonly listings: readonly JobListingView[];
  readonly applications: readonly JobApplicationView[];
  readonly heldJobs: readonly HeldJobView[];
}

/** Medians the game has on file, by the occupation a listing names. */
const NATIONAL_MEDIAN_BY_OCCUPATION: Readonly<Record<string, string>> = {
  "occupation:office-clerk": "43-9061.00",
};

function areaName(world: World, jurisdictionId: EntityId): string {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return jurisdiction
    ? residentNameForJurisdiction(
        jurisdiction.name,
        jurisdiction.parentName ?? null,
      )
    : "";
}

function hoursPhrase(opening: JobOpeningRecord): string {
  const { minimumHours, maximumHours } = opening.weeklyHours;
  return minimumHours === maximumHours
    ? `usually ${minimumHours} hours a week`
    : `usually ${minimumHours}–${maximumHours} hours a week`;
}

function nationalMedian(opening: JobOpeningRecord): string | null {
  const code = opening.occupationClassification
    ? NATIONAL_MEDIAN_BY_OCCUPATION[opening.occupationClassification]
    : undefined;
  const record = code
    ? CAREER_SOURCE_CONTEXT.find((row) => row.id === code)
    : undefined;
  return record?.wage ? nationalMedianWageSentence(record.wage) : null;
}

function listingView(
  world: World,
  personId: EntityId,
  opening: JobOpeningRecord,
): JobListingView {
  const employer = employerDisplayName(world, opening.organizationId);
  const area = areaName(world, opening.jurisdictionId);
  const details = [
    opening.schedule,
    opening.qualifications,
    opening.earliestStartAt
      ? `Earliest start: ${proseDate(opening.earliestStartAt)}.`
      : null,
  ].filter((line): line is string => !!line);
  const blocked = applicationBlocked(world, personId, opening.id);
  return {
    openingId: opening.id,
    title: opening.title,
    employerLine:
      area && area !== employer ? `${employer} · ${area}` : employer,
    termsLine: `${payPhrase(opening.pay)} · ${hoursPhrase(opening)}`,
    details,
    closesLine: `Taking applications through ${proseDate(opening.closesAt)}.`,
    applyBlocked: blocked,
    introducers: blocked
      ? []
      : introducersFor(world, personId, opening.id).map((id) => {
          const person = world.people[id]!;
          return {
            personId: id,
            label: `Ask ${person.givenName} ${person.familyName} to put in a word`,
          };
        }),
    nationalMedian: nationalMedian(opening),
  };
}

function applicationView(
  world: World,
  applicationId: EntityId,
): JobApplicationView | null {
  const application = world.history.jobApplications?.find(
    (row) => row.id === applicationId,
  );
  if (!application) return null;
  const opening = jobOpening(world, application.openingId)!;
  const employer = employerDisplayName(world, opening.organizationId);
  const heading = `${opening.title}, ${employer}`;
  const latest = latestApplicationStep(world, applicationId);
  const view = (
    status: string,
    actions: readonly JobApplicationAction[] = [],
  ): JobApplicationView => ({
    applicationId,
    heading,
    status,
    actions,
    startBlocked: actions.includes("start")
      ? startBlocked(world, applicationId)
      : null,
  });
  if (!latest)
    return view(
      application.route === "introduced"
        ? "Someone you know put in a word for you. Waiting to hear back."
        : `You applied on ${proseDate(application.submittedAt)}. Waiting to hear back.`,
    );
  switch (latest.kind) {
    case "declined":
      return view(`They turned you down. ${latest.reason ?? ""}`.trim());
    case "offered": {
      const hours = latest.agreedWeeklyHours
        ? `, ${latest.agreedWeeklyHours} hours a week`
        : "";
      return view(
        `They offered you the job at ${payPhrase(opening.pay)}${hours}, starting ${proseDate(latest.startAt!)}. Answer by ${proseDate(latest.replyBy!)}.`,
        ["accept", "refuse"],
      );
    }
    case "accepted":
      return view(`You accepted. You start on ${proseDate(latest.startAt!)}.`, [
        "start",
      ]);
    case "followed-up":
      return view(
        `${employer} called when you did not come in. They still want you, starting ${proseDate(expectedStart(world, applicationId)!)}.`,
        ["start"],
      );
    case "refused":
      return view("You turned down their offer.");
    case "offer-lapsed":
      return view(
        `The offer lapsed: you did not answer by ${proseDate(applicationOffer(world, applicationId)?.replyBy ?? latest.occurredAt)}.`,
      );
    case "withdrawn":
      return view(`They withdrew the offer. ${latest.reason ?? ""}`.trim());
    case "started":
      return view(`You started on ${proseDate(latest.occurredAt)}.`);
  }
}

export function projectJobMarket(
  world: World,
  personId: EntityId,
): JobMarketView {
  const person = world.people[personId];
  const townName = person ? areaName(world, person.homeJurisdictionId) : "";
  const listings = person
    ? openJobListings(world, personId).map((opening) =>
        listingView(world, personId, opening),
      )
    : [];
  const applications = person
    ? applicationsFor(world, personId)
        .map((application) => applicationView(world, application.id))
        .filter((row): row is JobApplicationView => row !== null)
        .reverse()
    : [];
  const heldJobs = world.history.workRelationships
    .filter(
      (work) =>
        work.personId === personId &&
        work.kind === JOB_MARKET_WORK_KIND &&
        workStatusAt(world, work.id)?.status === "active",
    )
    .map((work) => ({
      workRelationshipId: work.id,
      heading: `${workRoleAt(world, work.id)?.title ?? "Job"}, ${employerDisplayName(world, work.organizationId!)}`,
      status: `You have worked here since ${proseDate(work.startedAt)}.`,
    }));
  return { townName, listings, applications, heldJobs };
}
