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
import { governmentProperName } from "./government-proper-name";
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
  /** The government the office belongs to, by its place record's proper name ("City of McCall"). */
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

/** A form's note in parentheses, innermost first so a nested note goes whole. */
const FORM_NOTE = /\s*\([^()]*\)/;
/** A title that names a body of several members, not one seat in it. */
const BODY_TITLE = /\b(?:board|commission|council|committee)\b/i;
/** A body named first and then by what it serves ("Board of Elections"). */
const LEADS_WITH_BODY = /^(?:board|commission|council|committee)\s+of\b/i;
/** A word that already names one seat in a body ("Council Member", "Chairman of the Council"). */
const SEAT_WORD =
  /\b(?:member|chair|chairman|chairwoman|chairperson|president|speaker|clerk|secretary|commissioner|director|delegate)s?\b/i;

/**
 * An office title read in running text: "council member", "U.S. senator".
 * Each word is lower case, except one written in capitals ("U.S.", "DA"),
 * and a form's note in parentheses is left out. A title that names a body
 * ("State Board of Education") is said as one seat in it, the way the
 * council's own seat is "council member": "state board of education member", or
 * "member of the board of elections" for a body named first; it reads in every frame ("served as", "the race for", "sworn in as").
 */
export const officeInSentence = (title: string): string => {
  let plain = title;
  // A form's note ("(nonpartisan)", "(3 members, statewide, staggered 6-year
  // terms)") is never said, as `seatSaid` drops it.
  while (FORM_NOTE.test(plain)) plain = plain.replace(FORM_NOTE, "");
  const said = plain
    .trim()
    .split(/(\s+)/)
    .map((word) =>
      /^[A-Z]{2,}[a-z]?$/.test(word.replace(/[^A-Za-z]/g, ""))
        ? word
        : word.toLowerCase(),
    )
    .join("");
  if (!BODY_TITLE.test(said) || SEAT_WORD.test(said)) return said;
  // "Council of the District of Columbia" is said "member of the council of
  // the district of columbia"; "Railroad Commission", "railroad commission
  // member", as "Council" is "council member".
  return LEADS_WITH_BODY.test(said)
    ? `member of the ${said}`
    : `${said} member`;
};

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
            jurisdiction?: string;
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
          governmentName: office.governmentName
            ? governmentProperName(
                office.governmentName,
                office.jurisdiction ?? "",
              )
            : null,
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
