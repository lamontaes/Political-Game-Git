/**
 * The tie rule for what a talk is about (Words lead, Nov 16, rules 146 and
 * 156; owner, Nov 16: "why is every update of the engine not making
 * everything better at the same time?"). A Subject is raised only when it has
 * a recorded tie to the speaker or the hearer: a record of the speaker's or
 * the hearer's own life, a stand they hold, the place they live in, a law
 * that reaches them, or a frame they both stand in. The check lives once,
 * here, where any Subject is accepted into a talk (`acceptSubjects`, called
 * by `subjectsBetween`): a Subject with no tie is refused whoever built it.
 * A builder that raises a story, a change or any outside event supplies the
 * tie it found; a Subject made of the speaker's or hearer's own record is
 * tied by its kind (`OWN_RECORD_KINDS`).
 */
import type { PartTie } from "../english/bank-parts";
import type { CoreState, PersonId } from "../core2/types";
import type { Story } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID, servingTermsOf } from "../core2/modules/offices";
import { schoolDayOf } from "../core2/modules/people";
import { reachOn } from "../core2/law-reach/host";

/** The record that ties a Subject to the speaker or the hearer. */
export interface SubjectTie {
  kind: PartTie;
  /** Records the tie rests on: a household, a job, an office, a stand, a person both know. */
  recordIds: readonly string[];
}

/**
 * The Subject kinds that are made from the speaker's or hearer's own life, so
 * the subject's own facts are the tie (the speaker's person id stands in
 * where a fact cites none): the player's day, work, home, family, school,
 * justice and money, a person they both know, an act between them.
 */
export const OWN_RECORD_KINDS: ReadonlySet<string> = new Set([
  "eviction",
  "victimization",
  "job-lost",
  "quiet",
  "rent-due",
  "player-day",
  "school-missed",
  "news-touch",
  "player-news",
  "here",
  "own-work",
  "job-new",
  "job-new-detail",
  "job-new-told",
  "their-work",
  "their-tenure",
  "their-position",
  "home",
  "shared-school",
  "shared-work",
  "mutual",
  "kin",
  "family",
  "their-family",
  "school",
  "their-school",
  "own-view",
  "promise",
  "veto",
  "introduction",
  "work-day",
  "work-done",
  "death-news",
  "illness-news",
  "prison-news",
  "family-open",
  "charge",
  "conviction",
  "acquittal",
  "promise-kept",
  "promise-broken",
]);

/** A Subject as far as the rule reads it. */
export interface TieReadable {
  id: string;
  kind: string;
  aboutId?: string;
  tie?: SubjectTie;
  facts: Readonly<Record<string, { sourceRecordIds: readonly string[] }>>;
}

/** Whether a record id is one of the speaker's or the hearer's own: a record that names them, their household, or sits in their log. */
export type Belongs = (id: string) => boolean;

/** The records of the pair, read from the world: ids that name either person or their household, or are in either's log. */
export function belongsToPair(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
): Belongs {
  const api = coreAPI(core as CoreState);
  const people = [speakerId, listenerId]
    .map((id) => core.people.get(id))
    .filter((person): person is NonNullable<typeof person> => !!person);
  /** The rows that are theirs: their household, their job and its employer, their school. */
  const rows = new Set<string>();
  for (const person of people) {
    if (person.householdId) rows.add(person.householdId);
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (job) {
      rows.add(job.id);
      rows.add(job.organizationId);
    }
    const school = schoolDayOf(api, person.id);
    if (school) rows.add(school.schoolId);
  }
  const names = people.map((person) => person.id as string);
  return (id) =>
    rows.has(id) ||
    // A bare person id is the person, not a record of theirs.
    (!names.includes(id) &&
      (names.some((name) => id.includes(name)) ||
        people.some((person) =>
          core.logByPerson.get(person.id)?.has(id as never),
        )));
}

/**
 * The tie a Subject carries or its kind gives it, or null: the Subject is
 * refused. A Subject of the speaker's or hearer's own life is tied by the
 * records it cites that are theirs (never by its kind alone): with none, it
 * is refused.
 */
export function tieOfSubject(
  subject: TieReadable,
  belongs: Belongs,
): SubjectTie | null {
  if (subject.tie) return subject.tie.recordIds.length ? subject.tie : null;
  if (!OWN_RECORD_KINDS.has(subject.kind)) return null;
  const ids = [
    ...(subject.aboutId ? [subject.aboutId] : []),
    ...Object.values(subject.facts).flatMap((fact) => fact.sourceRecordIds),
  ];
  const own = [...new Set(ids.filter(belongs))];
  return own.length ? { kind: "record", recordIds: own } : null;
}

/**
 * The Subjects a talk may raise: each with its tie written on it, the rest
 * refused. `refused` gets each one dropped (for the dev view and the counts).
 */
export function acceptSubjects<T extends TieReadable>(
  subjects: readonly T[],
  belongs: Belongs,
  refused?: (subject: T) => void,
): T[] {
  const out: T[] = [];
  for (const subject of subjects) {
    const tie = tieOfSubject(subject, belongs);
    if (tie) out.push({ ...subject, tie });
    else refused?.(subject);
  }
  return out;
}

/**
 * The record kinds that are a person's own act on a bill or a question, and
 * the fact each carries it by: a vote an official cast, a comment given on a
 * bill, a vote recorded on a measure, a bill introduced. A lean on the question (everyone holds
 * one) is an amount and is never one of these.
 */
const ACT_RECORDS: Readonly<Record<string, "billId" | "question">> = {
  "office.voted": "billId",
  "office.introduced": "billId",
  "public-comment": "billId",
  "vote-recorded": "question",
};

/** The id of the person's own recorded act on the story's bill or question, or null. */
function recordedAct(
  core: Readonly<CoreState>,
  personId: PersonId,
  story: Story,
): string | null {
  const bill = story.facts.billId;
  const question = story.topic;
  for (const id of core.logByPerson.get(personId) ?? []) {
    const record = core.durableLog.get(id as never);
    const by = record && ACT_RECORDS[record.kind];
    if (!by) continue;
    const value = record.facts?.[by];
    if (by === "billId" && !!bill && value === bill) return id;
    if (by === "question" && !!question && value === question) return id;
  }
  return null;
}

/**
 * The tie a printed story has to the pair, from records of theirs, or null.
 * The speaker holding a stance on its question is a view of the story, not a
 * tie to it, and living in the town is not one either: the story must reach
 * one of the two through a record. It does when the person it names (the
 * sponsor, a member) is in the speaker's or hearer's household or kin; when
 * it covers a body the hearer holds a seat on; or when the law it reports
 * took effect on the speaker or the hearer (the law-reach record); or when
 * the speaker or the hearer has a recorded act of their own on its bill or
 * question (`ACT_RECORDS`).
 */
export function storyTie(
  core: Readonly<CoreState>,
  story: Story,
  speakerId: PersonId,
  listenerId: PersonId,
): SubjectTie | null {
  const speaker = core.people.get(speakerId);
  const listener = core.people.get(listenerId);
  if (!speaker || !listener) return null;
  const facts = story.facts;
  const named = [facts.sponsorId, facts.personId, facts.memberId].filter(
    (id): id is string => !!id,
  );
  for (const id of named) {
    const person = core.people.get(id as PersonId);
    if (!person) continue;
    for (const mine of [speaker, listener])
      if (
        person.id === mine.id ||
        (person.householdId && person.householdId === mine.householdId) ||
        mine.familyIds.has(person.id)
      )
        return {
          kind: "record",
          recordIds: [story.id, mine.householdId ?? mine.id, person.id],
        };
  }
  const api = coreAPI(core as CoreState);
  const chamber = facts.chamber;
  if (chamber && core.modules.has(OFFICES_MODULE_ID)) {
    const held = servingTermsOf(api, listenerId).find(
      (term) => term.officeId === chamber,
    );
    if (held) return { kind: "record", recordIds: [story.id, held.id] };
  }
  // A recorded act of their own on the story's bill or question.
  for (const id of [speakerId, listenerId]) {
    const act = recordedAct(core, id, story);
    if (act) return { kind: "stand", recordIds: [story.id, act] };
  }
  if (facts.lawId)
    for (const id of [speakerId, listenerId]) {
      const reach = reachOn(api, id).find(
        (row) => row.lawId === facts.lawId && !row.endedOn,
      );
      if (reach) return { kind: "law", recordIds: [story.id, reach.id] };
    }
  return null;
}
