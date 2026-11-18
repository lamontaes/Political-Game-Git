/**
 * What the scenes of home and work life may say about what happened, from the
 * record that caused each one and the engines that own the rest: the employer,
 * the position and the years held (a layoff, a call from a friend about the lost
 * job, the first day at a new job); the school and whether the senior passed
 * (the day after school ends); how long two have been together and the child
 * at home (a proposal, a breakup); who died and of what (a funeral); and what
 * a quarrel or a soured tie was over (an apology, an argument, making up).
 * Each fact is cited to the records it came from. A fact the records do not
 * hold (severance, health cover ending, the next step after school, what a
 * soured tie was over when its change names no cause) is left out and never
 * invented, so the lines that need it never play.
 */
import { ageOnDate, daysBetweenText } from "../core2/kernel/dates";
import { heldSinceRecord } from "../core2/past-work";
import { schoolsAttended } from "../core2/past-school";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { FAMILY_QUARREL } from "../core2/modules/quarrel";
import { unionStart } from "../core2/modules/partnerships";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { DEATH_CAUSE_FACT_KEY } from "../core2/death-cause";
import type { CoreState, PersonId } from "../core2/types";
import { countSaid } from "../english/count-words";
import { withArticle } from "../english/journal-words";
import { RELATIVE_NEWS_WORDS } from "../english/relative-news-words";
import { sayableJobTitle } from "../english/said-as";
import { SPOKEN_DAYS_PER_YEAR, spanSaid } from "../english/span-words";
import type { NewsFact } from "./life-news";
import { schoolResult } from "./school";
import { employerWords, organizationName } from "./words";
import { schoolShortSaid, workplaceSaid } from "../english/workplace-words";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../core2/business-books";

/** The jobs engine's layoff record (`work.job-lost`). */
const JOB_LOST = "work.job-lost";
const FAMILY_ENGAGED = "family.engaged";
const FAMILY_SEPARATED = "family.separated";
const LIFE_DEATH = "life.death";

/** The scene types that read each record's facts. */
const LAYOFF_TYPES: readonly string[] = ["layoff", "reach-out"];
const FIRST_DAY_TYPES: readonly string[] = ["first-day"];
const SCHOOL_TYPES: readonly string[] = [
  "diploma-home",
  "no-diploma-home",
  "last-day",
];
const PARTNER_TYPES: readonly string[] = ["proposal", "breakup"];
const FUNERAL_TYPES: readonly string[] = ["funeral"];
const QUARREL_TYPES: readonly string[] = [
  "apology",
  "argument",
  "reconciliation",
];

/** A job change's id as the jobs engine writes it: `job-change:<date>:<job id>:<kind>`; a job id may hold colons. */
const LAYOFF_CHANGE = /^job-change:\d{4}-\d{2}-\d{2}:(.+):layoff$/;

type Facts = Record<string, NewsFact>;

/** The saying of one person, by the scene's telling; undefined for anyone not on record. */
export type SayPerson = (personId: PersonId) => string | undefined;

/**
 * The facts for the scene of `typeKey` about the record `causeId`, asked by
 * `askerId` of `askedId`. Empty for any type that reads none of these
 * records, or a cause that is not one.
 */
export function homeWorkFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
  say: SayPerson,
): Facts {
  void askerId;
  void askedId;
  const record = core.durableLog.get(causeId);
  const said = (record?.facts ?? {}) as Readonly<Record<string, string>>;
  if (LAYOFF_TYPES.includes(typeKey) && record?.kind === JOB_LOST)
    return layoffFacts(core, causeId, record.date, said);
  if (FIRST_DAY_TYPES.includes(typeKey)) return startedFacts(core, causeId);
  if (SCHOOL_TYPES.includes(typeKey)) return schoolFacts(core, causeId);
  if (
    PARTNER_TYPES.includes(typeKey) &&
    (record?.kind === FAMILY_ENGAGED || record?.kind === FAMILY_SEPARATED)
  )
    return partnerFacts(core, causeId, record.date, record.personIds, said);
  if (FUNERAL_TYPES.includes(typeKey) && record?.kind === LIFE_DEATH)
    return deathFacts(core, causeId, record.personIds, record.facts, say);
  if (QUARREL_TYPES.includes(typeKey)) return quarrelFacts(core, causeId);
  return {};
}

/** The job a record names, from the jobs engine's books, with its employer. */
function jobAndEmployer(core: Readonly<CoreState>, jobId: string | undefined) {
  const job = jobId ? core.jobs.get(jobId as never) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  const employer = org ? employerWords(org) : null;
  return job && org && employer ? { job, org, employer } : null;
}

/** The employer and the position of a job, each cited to the records it came from. */
function workFacts(
  core: Readonly<CoreState>,
  jobId: string | undefined,
  causeId: string,
): Facts {
  const held = jobAndEmployer(core, jobId);
  if (!held) return {};
  const facts: Facts = {
    employer: {
      text: held.employer,
      sourceRecordIds: [causeId, held.job.id, held.org.id],
    },
  };
  // The employer as a common noun ("the clinic"), from its classification (or
  // its business kind's, as the business engine reads it), same records.
  facts.workplace = {
    text: workplaceSaid(
      held.org.classification ??
        DEFAULT_BUSINESS_BOOKS_DATA.classifications.find(
          (row) =>
            row.kindId === core.finance.businesses.get(held.org.id)?.kindId,
        )?.classification,
    ),
    sourceRecordIds: [causeId, held.job.id, held.org.id],
  };
  if (sayableJobTitle(held.job.title))
    facts.position = {
      text: withArticle(held.job.title),
      sourceRecordIds: [causeId, held.job.id],
    };
  return facts;
}

/**
 * The day a person's job began and the record that says so: the working life
 * before the start for a job held on day one, else the jobs engine's own record
 * of the hire (the earliest, where a job was hired twice).
 */
function startOfJob(
  core: Readonly<CoreState>,
  personId: string,
  jobId: string,
): { date: string; recordId: string } | null {
  const held = heldSinceRecord(core as CoreState, personId as PersonId, jobId);
  if (held?.facts.startedAt)
    return { date: String(held.facts.startedAt), recordId: held.id };
  if (!core.modules.has(JOBS_MODULE_ID)) return null;
  const changes = coreAPI(core as CoreState)
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .query("byPerson", [personId]) as unknown as {
    id: string;
    date: string;
    kind: string;
    jobId: string;
  }[];
  const [hire] = changes
    .filter((row) => row.kind === "hire" && row.jobId === jobId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return hire ? { date: hire.date, recordId: hire.id } : null;
}

/**
 * A lost job: the employer, the position and how long the worker held it
 * (`tenure` as people say a span, `years` as the whole count when it was two
 * or more). A job held under a year says nothing of how long.
 */
function layoffFacts(
  core: Readonly<CoreState>,
  causeId: string,
  lostOn: string,
  said: Readonly<Record<string, string>>,
): Facts {
  const jobId = LAYOFF_CHANGE.exec(said.jobChangeId ?? "")?.[1];
  const facts = workFacts(core, jobId, causeId);
  const held = jobAndEmployer(core, jobId);
  if (!held || !jobId) return facts;
  const began = startOfJob(core, held.job.personId, jobId);
  if (!began) return facts;
  // Under a full year held says nothing of how long. A year or more is said
  // as a whole count of years, and `tenure` and `years` come from that one
  // count so a line that holds both never says two different spans.
  if (ageOnDate(began.date, lostOn) < P.one) return facts;
  const count = Math.round(
    daysBetweenText(began.date, lostOn) / SPOKEN_DAYS_PER_YEAR,
  );
  const cites = [causeId, held.job.id, began.recordId];
  const days = daysBetweenText(began.date, lostOn);
  // One year is said as the span itself ("a year", "a year and a half"); two or
  // more from the whole count `years` also says.
  facts.tenure = {
    text: spanSaid(count > P.one ? count * SPOKEN_DAYS_PER_YEAR : days),
    sourceRecordIds: cites,
  };
  if (count > P.one)
    facts.years = { text: countSaid(count, Infinity), sourceRecordIds: cites };
  return facts;
}

/**
 * A job begun: the moment's cause is the job's own row, or a record of the
 * day that names it.
 */
function startedFacts(core: Readonly<CoreState>, causeId: string): Facts {
  if (core.jobs.has(causeId as never)) return workFacts(core, causeId, causeId);
  const record = core.durableLog.get(causeId);
  const jobId = record?.facts?.jobId;
  return jobId ? workFacts(core, jobId, causeId) : {};
}

/**
 * A school year's end: the school by name and whether the senior passed, from
 * the school engine's graduation result the moment cites (it is a result row,
 * not a log record).
 */
function schoolFacts(core: Readonly<CoreState>, causeId: string): Facts {
  const result = schoolResult(core, causeId);
  if (!result) return {};
  const facts: Facts = {};
  // The school the school engine has the senior at; after the year they have
  // left it, the last high school the person's school records name.
  const last = schoolsAttended(core, result.personId)
    .filter((row) => row.stage === "high")
    .at(-1);
  const schoolId = result.schoolId ?? last?.schoolId;
  const school = schoolId ? core.organizations.get(schoolId) : undefined;
  if (school)
    facts.school = {
      text: organizationName(school),
      sourceRecordIds: [
        causeId,
        ...(!result.schoolId && last ? [last.recordId] : []),
        school.id,
      ],
    };
  if (facts.school)
    facts["school-short"] = {
      text: schoolShortSaid(facts.school.text),
      sourceRecordIds: [...facts.school.sourceRecordIds],
    };
  facts[result.passed ? "passed" : "not-passed"] = {
    text: "yes",
    sourceRecordIds: [causeId],
  };
  return facts;
}

/**
 * A proposal or a breakup: how long the two were together, from the
 * partnerships engine's own start of the union, and the youngest child of
 * either who lives in either's home.
 */
function partnerFacts(
  core: Readonly<CoreState>,
  causeId: string,
  date: string,
  personIds: readonly PersonId[],
  said: Readonly<Record<string, string>>,
): Facts {
  const [a, b] = personIds;
  const linkId = said.linkId;
  if (!a || !b || !linkId) return {};
  const facts: Facts = {};
  const began = unionStart(
    core as CoreState,
    { id: linkId, personIds: [a, b] },
    coreAPI(core as CoreState),
  );
  if (began <= date)
    facts.together = {
      text: spanSaid(daysBetweenText(began, date)),
      sourceRecordIds: [causeId, linkId],
    };
  const homes = new Set(
    [a, b].map((id) => core.people.get(id)?.householdId).filter(Boolean),
  );
  const [child] = [...core.familyLinks.values()]
    .filter(
      (row) =>
        row.kind === "parent-child" && personIds.includes(row.personIds[0]),
    )
    .map((row) => core.people.get(row.personIds[1]))
    .filter(
      (row) =>
        row?.alive &&
        homes.has(row.householdId) &&
        ageOnDate(row.birthDate, date) < P.votingAge,
    )
    .sort(
      (x, y) =>
        y!.birthDate.localeCompare(x!.birthDate) || x!.id.localeCompare(y!.id),
    );
  if (child)
    facts.child = {
      text: child.givenName,
      sourceRecordIds: [causeId, child.id],
    };
  return facts;
}

/** A death: the person who died and, where the health engine named one, the cause as the family says it. */
function deathFacts(
  core: Readonly<CoreState>,
  causeId: string,
  personIds: readonly PersonId[],
  recorded: Readonly<Record<string, string>> | undefined,
  say: SayPerson,
): Facts {
  const [deadId] = personIds;
  if (!deadId) return {};
  const facts: Facts = {};
  const deceased = say(deadId);
  if (deceased)
    facts.deceased = { text: deceased, sourceRecordIds: [causeId, deadId] };
  const cause =
    RELATIVE_NEWS_WORDS.deathCauses[
      recorded?.[`event:${causeId}:${DEATH_CAUSE_FACT_KEY}`] ??
        recorded?.[DEATH_CAUSE_FACT_KEY] ??
        ""
    ];
  if (cause) facts.cause = { text: cause, sourceRecordIds: [causeId] };
  return facts;
}

/**
 * A quarrel, or a tie that soured or grew back: what it was over, where a
 * record names it. A quarrel's own record (`family.quarrel`) names the
 * subject; a tie's latest change cites the record that moved it.
 */
function quarrelFacts(core: Readonly<CoreState>, causeId: string): Facts {
  const own = core.durableLog.get(causeId);
  const tie = core.relationships.get(causeId);
  const sourceId = tie?.latestChange?.reason?.sourceId;
  const quarrel =
    own?.kind === FAMILY_QUARREL
      ? own
      : sourceId
        ? core.durableLog.get(sourceId)
        : undefined;
  if (quarrel?.kind !== FAMILY_QUARREL || quarrel.facts?.about !== "money")
    return {};
  return {
    "over-money": {
      text: "yes",
      sourceRecordIds: [
        causeId,
        quarrel.id,
        ...(quarrel.facts.missedId ? [quarrel.facts.missedId] : []),
      ],
    },
  };
}
