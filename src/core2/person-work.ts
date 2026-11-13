/**
 * What a person does, from the two records that say it: the job they hold
 * (the jobs table) and each office they serve in (the offices engine's
 * serving terms). One reader for every screen that tells it: the person card,
 * the journal and Travel (pool item
 * play-a-relatives-card-and-journal-disagree-on-her-job; owner, Oct 28: "It's
 * just different ways of displaying the same information"). A public office
 * whose seat is also the person's job (a full-time county commissioner) is one
 * thing, told as the office; a part-time office beside an ordinary job is
 * two, and both are told.
 */
import { OFFICES_MODULE_ID, servingTermsOf } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

export interface PersonJob {
  readonly id: string;
  readonly title: string;
  readonly organizationId: string;
}

export interface PersonOffice {
  readonly termId: string;
  readonly officeId: string;
  readonly title: string;
  /** The government the office belongs to, as the offices table names it. */
  readonly governmentName: string | null;
  /** The body the seat belongs to ("Nelson City Council"), when it is one of several seats. */
  readonly bodyName: string | null;
  /** How many seats the office has: more than one is a seat on a body. */
  readonly seats: number;
  /** The organization that pays the seat where the seat is also a job. */
  readonly organizationId: string | null;
}

export interface PersonWork {
  /** The job held now that is not an office's own seat; null for none. */
  readonly job: PersonJob | null;
  /** Each office served in now, the earliest seat first. */
  readonly offices: readonly PersonOffice[];
}

/**
 * An office title read in running text: "council member", "U.S. senator".
 * Each word is lower case, except one written in capitals ("U.S.", "DA").
 */
export const officeInSentence = (title: string): string =>
  title
    .split(/(\s+)/)
    .map((word) =>
      /^[A-Z]{2,}[a-z]?$/.test(word.replace(/[^A-Za-z]/g, ""))
        ? word
        : word.toLowerCase(),
    )
    .join("");

/**
 * The job prefixes a seat's own job carries: a public seat's
 * (`job:public:office:<seat id>:<person>`) and an elected official's
 * (`job:office:<seat id>:<term>`, the President's, a senator's).
 */
const SEAT_JOBS = ["job:public:office:", "job:office:"] as const;
const seatJobOf = (jobId: string, seatId?: string) =>
  SEAT_JOBS.some((prefix) =>
    jobId.startsWith(seatId ? `${prefix}${seatId}:` : prefix),
  );

export function personWorkOf(
  core: Readonly<CoreState>,
  personId: string,
): PersonWork {
  const person = core.people.get(personId as never);
  const held = person?.jobId ? core.jobs.get(person.jobId) : undefined;
  const api = coreAPI(core as CoreState);
  const table = core.modules.has(OFFICES_MODULE_ID)
    ? api.moduleState(OFFICES_MODULE_ID).table("offices")
    : null;
  const terms = table ? servingTermsOf(api, personId) : [];
  const offices = [...terms]
    .sort(
      (a, b) =>
        (a.serviceStart ?? a.startDate).localeCompare(
          b.serviceStart ?? b.startDate,
        ) || a.id.localeCompare(b.id),
    )
    .flatMap((term): PersonOffice[] => {
      const office = table?.get(term.officeId) as
        | {
            title?: string;
            governmentName?: string;
            bodyName?: string;
            seats?: number;
          }
        | undefined;
      if (!office?.title) return [];
      const seatJob =
        held && seatJobOf(held.id, term.seatId) ? held : undefined;
      return [
        {
          termId: term.id,
          officeId: term.officeId,
          title: office.title,
          governmentName: office.governmentName ?? null,
          bodyName: (office.seats ?? 1) > 1 ? (office.bodyName ?? null) : null,
          seats: office.seats ?? 1,
          organizationId: seatJob?.organizationId ?? null,
        },
      ];
    });
  // A job that is an office's own seat is told as that office.
  const seat = held ? seatJobOf(held.id) : false;
  return {
    job:
      held && !seat
        ? {
            id: held.id,
            title: held.title,
            organizationId: held.organizationId,
          }
        : null,
    offices,
  };
}
