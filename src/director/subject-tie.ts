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
  tie?: SubjectTie;
  facts: Readonly<Record<string, { sourceRecordIds: readonly string[] }>>;
}

/** The tie a Subject carries or its kind gives it, or null: the Subject is refused. */
export function tieOfSubject(
  subject: TieReadable,
  speakerId: string,
): SubjectTie | null {
  if (subject.tie) return subject.tie.recordIds.length ? subject.tie : null;
  if (!OWN_RECORD_KINDS.has(subject.kind)) return null;
  return { kind: "record", recordIds: [speakerId] };
}

/**
 * The Subjects a talk may raise: each with its tie written on it, the rest
 * refused. `refused` gets each one dropped (for the dev view and the counts).
 */
export function acceptSubjects<T extends TieReadable>(
  subjects: readonly T[],
  speakerId: string,
  refused?: (subject: T) => void,
): T[] {
  const out: T[] = [];
  for (const subject of subjects) {
    const tie = tieOfSubject(subject, speakerId);
    if (tie) out.push({ ...subject, tie });
    else refused?.(subject);
  }
  return out;
}

/**
 * The tie a printed story has to the pair, from the story's own record, or
 * null (the speaker only holds a stance on its question, which is a view of
 * the story and no tie to it): the sponsor is in the speaker's or the
 * hearer's household or kin or is known to one of them; the body it covers
 * is the one the hearer holds a seat on; the body is the town's own and the
 * speaker or hearer lives there;.
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
    if (
      person.householdId === speaker.householdId ||
      person.householdId === listener.householdId ||
      speaker.familyIds.has(person.id) ||
      listener.familyIds.has(person.id) ||
      id === speakerId ||
      id === listenerId
    )
      return { kind: "record", recordIds: [story.id, id] };
  }
  const chamber = facts.chamber;
  if (chamber && core.modules.has(OFFICES_MODULE_ID)) {
    const api = coreAPI(core as CoreState);
    const held = servingTermsOf(api, listenerId).find(
      (term) => term.officeId === chamber,
    );
    if (held) return { kind: "record", recordIds: [story.id, held.id] };
    const office = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(chamber) as { coversTown?: boolean } | undefined;
    if (office?.coversTown)
      return { kind: "place", recordIds: [story.id, chamber] };
  }
  return null;
}
