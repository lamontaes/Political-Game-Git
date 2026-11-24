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
import { spokenDate } from "./words";

/** The justice engine's record of a person set free at the end of a term. */
export const RELEASED_EVENT = "justice.released";
/** The justice engine's record of a prison term beginning. */
export const IMPRISONED_EVENT = "justice.imprisoned";
/** The justice engine's record of a person held for want of bail. */
export const HELD_EVENT = "justice.held-before-trial";

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
    ![RELEASED_EVENT, IMPRISONED_EVENT, HELD_EVENT].includes(record.kind)
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
  if (record.kind === HELD_EVENT) {
    facts["awaiting-trial"] = { text: "yes", sourceRecordIds: cited };
    if (Number(said.bailMinor) > P.zero)
      facts.bail = {
        text: moneySaid(Number(said.bailMinor)),
        sourceRecordIds: cited,
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
