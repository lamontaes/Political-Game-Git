import { executiveProfileForOfficeKey } from "../executive-authority-game-profile";
import type { RuleSourceRef } from "../legislature-rules";

/** Named posts add their special statute to the shared executive rule path.
 * An inventory row establishes a post, never an empty seat or a vacancy. */
export interface ExecutiveAppointmentPost {
  readonly officeKey: string;
  readonly title: string;
  readonly appointerOfficeKey: string;
  readonly jurisdictionKey: string;
  readonly seats: number;
  readonly termYears: number | null;
  readonly termEndMonthDay: string | null;
  readonly vacancyTerm: "unexpired-remainder" | "new-term";
  readonly confirmation: "none" | "senate" | "joint-legislature";
  readonly confirmationMajority: "all-members" | "members-voting";
  readonly citizenshipRequired: boolean;
  readonly stateEmploymentBarred: boolean;
  readonly samePartyLimit: number | null;
  readonly sources: readonly RuleSourceRef[];
}

const PERSONNEL_BOARD_SOURCES: readonly RuleSourceRef[] = [
  {
    authority: "statute",
    citation: "Alaska Statutes 39.05.053",
    sourceTitle: "Alaska Statutes, Title 39",
    sourceUrl: "https://www.akleg.gov/statutesPDF/Title-39.pdf",
    retrievedAt: "2026-10-06",
    verification: "partial",
    note: "Official indexed text establishes March 1 as a board term's expiration date unless a specific statute provides otherwise. Direct PDF access returned 403. No current incumbent, expiration year, or seat stagger is inferred from this provision.",
  },
  {
    authority: "statute",
    citation: "Alaska Statutes 39.25.060",
    sourceTitle: "Alaska Personnel Board",
    sourceUrl: "https://doa.alaska.gov/dop/personnelBoard/",
    retrievedAt: "2026-10-06",
    verification: "verified",
    note: "The Department of Administration describes three governor-appointed members, joint legislative confirmation, six-year terms, the state-employment bar, and the two-member party limit. The statutory PDF was indexed but its direct download returned 403.",
  },
  {
    authority: "constitution",
    citation: "Alaska Constitution, Article III, Section 26",
    sourceTitle: "Alaska's Constitution",
    sourceUrl: "https://ltgov.alaska.gov/information/alaskas-constitution/",
    retrievedAt: "2026-10-06",
    verification: "verified",
    note: "Covered board appointments require confirmation by a majority of the legislature's members in joint session and United States citizenship. This source does not establish any individual's citizenship or actual attendance.",
  },
];

const NAMED_POSTS: readonly ExecutiveAppointmentPost[] = [
  {
    officeKey: "us-ak-personnel-board",
    title: "Personnel Board member",
    appointerOfficeKey: "us-ak-governor",
    jurisdictionKey: "US-AK",
    seats: 3,
    termYears: 6,
    termEndMonthDay: "03-01",
    vacancyTerm: "unexpired-remainder",
    confirmation: "joint-legislature",
    confirmationMajority: "all-members",
    citizenshipRequired: true,
    stateEmploymentBarred: true,
    samePartyLimit: 2,
    sources: PERSONNEL_BOARD_SOURCES,
  },
];

export function executiveAppointmentPost(
  officeKey: string,
): ExecutiveAppointmentPost | null {
  const post = NAMED_POSTS.find(
    (candidate) => candidate.officeKey === officeKey,
  );
  if (!post) return null;
  const profile = executiveProfileForOfficeKey(post.appointerOfficeKey);
  if (
    !profile ||
    profile.pack.jurisdictionKey !== post.jurisdictionKey ||
    profile.pack.appointment.executiveAppoints.kind !== "known" ||
    !profile.pack.appointment.executiveAppoints.value
  )
    return null;
  return post;
}

export function executiveAppointmentPostsForOffice(
  appointerOfficeKey: string,
): readonly ExecutiveAppointmentPost[] {
  return NAMED_POSTS.filter(
    (post) =>
      post.appointerOfficeKey === appointerOfficeKey &&
      executiveAppointmentPost(post.officeKey) !== null,
  );
}
