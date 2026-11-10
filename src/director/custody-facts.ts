/**
 * What a scene about a prison term may say, from the justice engine's own
 * records: a release (`justice.released`) read with the custody and sentence
 * rows it closes, a sentence handed down (`justice.imprisoned`) and a person
 * held before trial (`justice.held-before-trial`). The homecoming and the
 * prison visit both read it; each fact is cited to the records it came from,
 * and the bank's lines name only the facts present.
 *
 * The household member named is the youngest child of the household of the
 * person who was taken or came home, read from the household's members.
 */
import { familyRelation } from "../core2/closeness";
import { ageOnDate, daysBetweenText } from "../core2/kernel/dates";
import {
  JUSTICE_MODULE_ID,
  type CustodyRow,
  type SentenceRow,
} from "../core2/modules/justice";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { moneySaid } from "../english/count-words";
import { spanSaid } from "../english/span-words";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { properName, spokenDate } from "./words";

/** The justice engine's record of a person set free at the end of a term. */
export const RELEASED_EVENT = "justice.released";
/** The justice engine's record of a prison term beginning. */
export const IMPRISONED_EVENT = "justice.imprisoned";
/** The justice engine's record of a person held for want of bail. */
export const HELD_EVENT = "justice.held-before-trial";
/** The justice engine's records of a charge, a conviction and an acquittal. */
export const CHARGED_EVENT = "justice.charged";
export const CONVICTED_EVENT = "justice.convicted";
export const ACQUITTED_EVENT = "justice.acquitted";
const COURT_EVENTS = [CHARGED_EVENT, CONVICTED_EVENT, ACQUITTED_EVENT];

export interface CustodyFact {
  text: string;
  sourceRecordIds: string[];
}

interface CustodyRecord {
  id: string;
  kind: string;
  date: string;
  personIds: readonly PersonId[];
  facts?: Readonly<Record<string, string>> | undefined;
}

/** The prefix of a custody row's id: `custody:<sentence id>`. */
const CUSTODY_PREFIX = "custody:";

/**
 * The facts a custody record gives a scene between `askerId` and `askedId`:
 * who is the one who was inside, how long they were away or are to serve,
 * the day they get out, the bail, whether the term ended their job, and the
 * youngest child in their household. Empty for any other record.
 */
export function custodyFacts(
  core: Readonly<CoreState>,
  record: CustodyRecord | undefined,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, CustodyFact> {
  const facts: Record<string, CustodyFact> = {};
  if (
    !record ||
    ![RELEASED_EVENT, IMPRISONED_EVENT, HELD_EVENT, ...COURT_EVENTS].includes(
      record.kind,
    )
  )
    return facts;
  const insideId = record.personIds.find(
    (id) => id === askerId || id === askedId,
  );
  const inside = record.personIds
    .map((id) => core.people.get(id))
    .find((row) => row?.alive);
  if (!inside) return facts;
  const cited = [record.id];
  const said = record.facts ?? {};
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked) return facts;
  // Who the scene is about: the asker was inside, or the player was.
  if (record.kind === RELEASED_EVENT) {
    if (insideId === askerId)
      facts["asker-back"] = { text: asker.givenName, sourceRecordIds: cited };
    else if (insideId === askedId)
      facts["you-back"] = { text: asked.givenName, sourceRecordIds: cited };
    if (asker.householdId === asked.householdId)
      facts["same-home"] = { text: asker.givenName, sourceRecordIds: cited };
  }
  const api = core.modules.has(JUSTICE_MODULE_ID)
    ? coreAPI(core as CoreState)
    : undefined;
  const sentenceId = said.sentenceId;
  const sentence = sentenceId
    ? (api
        ?.moduleState(JUSTICE_MODULE_ID)
        .table("sentences")
        .get(sentenceId) as unknown as SentenceRow | undefined)
    : undefined;
  const custody = sentenceId
    ? (api
        ?.moduleState(JUSTICE_MODULE_ID)
        .table("custody")
        .get(`${CUSTODY_PREFIX}${sentenceId}`) as unknown as
        CustodyRow | undefined)
    : undefined;
  if (record.kind === RELEASED_EVENT && custody) {
    const ids = [...cited, custody.id];
    facts.away = {
      text: spanSaid(daysBetweenText(custody.from, record.date)),
      sourceRecordIds: ids,
    };
    if (sentence?.jobsEnded.length)
      facts["job-lost"] = {
        text: "yes",
        sourceRecordIds: [...ids, sentence.id],
      };
  }
  if (record.kind === IMPRISONED_EVENT && said.releaseDate) {
    facts.sentence = {
      text: spanSaid(daysBetweenText(record.date, said.releaseDate)),
      sourceRecordIds: cited,
    };
    facts.release = {
      text: spokenDate(said.releaseDate, core.date),
      sourceRecordIds: cited,
    };
  }
  if (COURT_EVENTS.includes(record.kind)) {
    // The case in court: whether the charge goes to a plea or a trial, the
    // day of the trial, and what a conviction came to, all from the records.
    if (record.kind === CHARGED_EVENT) {
      facts.charged = { text: "yes", sourceRecordIds: cited };
      if (said.plea === "true")
        facts["will-plead"] = { text: "yes", sourceRecordIds: cited };
      else if (said.trialDate)
        facts["trial-day"] = {
          text: spokenDate(said.trialDate, core.date),
          sourceRecordIds: cited,
        };
    }
    if (record.kind === ACQUITTED_EVENT)
      facts.acquitted = { text: "yes", sourceRecordIds: cited };
    if (record.kind === CONVICTED_EVENT) {
      facts.convicted = { text: "yes", sourceRecordIds: cited };
      if (said.plea === "true")
        facts.pleaded = { text: "yes", sourceRecordIds: cited };
      if (sentence?.releaseDate && sentence.custodyMonths > P.zero) {
        facts.sentence = {
          text: spanSaid(daysBetweenText(record.date, sentence.releaseDate)),
          sourceRecordIds: [...cited, sentence.id],
        };
        facts.release = {
          text: spokenDate(sentence.releaseDate, core.date),
          sourceRecordIds: [...cited, sentence.id],
        };
      }
      if (Number(said.fineMinor) > P.zero)
        facts.fine = {
          text: moneySaid(Number(said.fineMinor)),
          sourceRecordIds: cited,
        };
      if (Number(said.probationMonths) > P.zero)
        facts.probation = { text: "yes", sourceRecordIds: cited };
      if (sentence?.jobsEnded.length)
        facts["job-lost"] = {
          text: "yes",
          sourceRecordIds: [...cited, sentence.id],
        };
    }
    if (insideId === askedId) {
      facts["you-charged"] = { text: asked.givenName, sourceRecordIds: cited };
      // Their work, where the job row names an employer.
      const job = asked.jobId ? core.jobs.get(asked.jobId) : undefined;
      const org = job ? core.organizations.get(job.organizationId) : undefined;
      if (job && org && !job.endsAt)
        facts.employer = {
          text: properName(org.name),
          sourceRecordIds: [...cited, job.id, org.id],
        };
    }
  }
  if (record.kind === HELD_EVENT) {
    facts["awaiting-trial"] = { text: "yes", sourceRecordIds: cited };
    if (Number(said.bailMinor) > P.zero)
      facts.bail = {
        text: moneySaid(Number(said.bailMinor)),
        sourceRecordIds: cited,
      };
  }
  // The player is the one inside and a relative comes to see them: who the
  // scene is about, whether the visitor is their partner, and their work.
  if (
    (record.kind === IMPRISONED_EVENT || record.kind === HELD_EVENT) &&
    insideId === askedId
  ) {
    facts["you-inside"] = { text: asked.givenName, sourceRecordIds: cited };
    if (familyRelation(core, askedId, askerId) === "partner")
      facts["visitor-partner"] = { text: "yes", sourceRecordIds: cited };
    const job = asked.jobId ? core.jobs.get(asked.jobId) : undefined;
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    if (job && org && !job.endsAt)
      facts.employer = {
        text: properName(org.name),
        sourceRecordIds: [...cited, job.id, org.id],
      };
  }
  // The youngest child in the household of the one who was inside, other than
  // the two in the scene.
  const household = core.households.get(inside.householdId);
  const child = (household?.memberIds ?? [])
    .map((id) => core.people.get(id as PersonId))
    .filter(
      (row) =>
        row?.alive &&
        row.id !== askerId &&
        row.id !== askedId &&
        row.id !== inside.id &&
        ageOnDate(row.birthDate, core.date) <
          rulesFile.familyStakes.youngChildAge.value,
    )
    .sort(
      (a, b) =>
        b!.birthDate.localeCompare(a!.birthDate) || a!.id.localeCompare(b!.id),
    )[P.zero];
  if (child && household)
    facts.child = {
      text: child.givenName,
      sourceRecordIds: [...cited, household.id, child.id],
    };
  return facts;
}
