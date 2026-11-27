/**
 * What a rival said, who passed it on, and how it folds.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { bookkeeping } from "../bookkeeping";
import { tableTraceOn } from "../module-state";
import { closenessBetween } from "./people";
import type { CoreAPI, PersonId, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { addDays, makeIsoDate } from "../kernel/dates";
import { campaignParameter } from "../campaign-data";
import { stanceRow } from "./views";
import { standing, type ContestRow, type FilingRow } from "./elections";
import { RIVAL_WORD_EVENT, elections, table, townRow } from "./campaigns-base";
import { newestWord } from "./campaigns-turn";
import type { RivalWordRow } from "./campaigns-turn";

export interface MessageRow {
  readonly id: string;
  /** The message's kind: an ad, a mailer, a turn's paid message, or an evening of doors. */
  readonly kind?: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly date: string;
  readonly topic: string;
  /** Which side of the topic the message argued: above zero for the change, below for keeping things as they are. */
  readonly position?: number;
  readonly witnessIds: readonly string[];
}

/**
 * What one rival message did to the person who passed word of it on: none
 * where the views engine kept no cause for it on their stance on its topic
 * (a night of doors is kept as word and never as a paid message, so it moves
 * nobody), else a little or a lot by how far that cause moved them toward the
 * rival's case against `rivalWordMovedALot`. Read-only.
 */
export function rivalWordMoved(
  api: CoreAPI,
  tellerId: string,
  messageId: string,
  topic: string,
): "none" | "little" | "lot" {
  const cause = stanceRow(api, tellerId as PersonId, topic)?.causes.find(
    (row) => row.eventId === messageId,
  );
  if (!cause) return "none";
  return cause.change >= campaignParameter("rivalWordMovedALot")
    ? "lot"
    : "little";
}

/** Whether two people have been in touch after a day: their relationship's last contact is later. */
export function inTouchSince(
  core: Readonly<CoreState>,
  personId: string,
  otherId: string,
  date: string,
): boolean {
  const [a, b] = [personId, otherId].sort();
  const tie = core.relationships.get(`${a}:${b}`);
  return !!tie && tie.lastContactDate > date;
}

/**
 * Each contest's latest message date, by world: derived from the `messages`
 * rows and never saved. It is filled from the rows when missing, kept by
 * `emitMessage` (the rows' one writer), and filled again when the table's
 * size or the last row it noted has changed under it (a restored snapshot, a
 * removed row). A removal alone always lowers the size; a writer that puts
 * rows any other way must delete the record after it writes.
 */
export const latestMessages = new WeakMap<
  object,
  { size: number; noted?: ModuleRow; latest: Map<string, string> }
>();
export function keptMessageDates(api: CoreAPI) {
  const messages = table(api, "messages");
  const held = latestMessages.get(api.state);
  return held &&
    held.size === messages.size &&
    (!held.noted || messages.get(held.noted.id) === held.noted)
    ? held
    : undefined;
}
/** Each contest's latest message date, from the kept record or the rows. */
export function latestMessageDates(api: CoreAPI): ReadonlyMap<string, string> {
  const kept = keptMessageDates(api);
  if (kept) return kept.latest;
  const rows = table(api, "messages").rows();
  const latest = new Map<string, string>();
  for (const row of rows as unknown as MessageRow[]) {
    const at = latest.get(row.contestId);
    if (at === undefined || row.date > at) latest.set(row.contestId, row.date);
  }
  latestMessages.set(api.state, {
    size: rows.length,
    noted: rows[rows.length - 1],
    latest,
  });
  return latest;
}

/**
 * A rival's message (an ad, a mailer, or what they said at the doors of an
 * evening's canvass) reaches people a candidate knows, and the next time
 * one of them is in touch with the candidate they pass it on: the closest
 * such person, for each message once, at most once a week a candidate (the
 * message's reach and the relationship's last contact are the records). The
 * player meets it as a scene; for anyone else it is a record of what they
 * heard. A contest with no message since the window opened has none to pass
 * on, so its filings are not read (under bookkeeping the full read still
 * runs, and must find none; with the table trace on it runs too, so the
 * trace sees each read).
 */
export function rivalWordPassedOn(api: CoreAPI): void {
  const date = api.state.date;
  const core = api.state as CoreState;
  const since = addDays(makeIsoDate(date), -campaignParameter("rivalWordDays"));
  for (const filing of elections(
    api,
    "filings",
  ).rows() as unknown as FilingRow[]) {
    if (!standing(filing)) continue;
    const quiet = !(
      (latestMessageDates(api).get(filing.contestId) ?? "") > since
    );
    if (quiet && !bookkeeping() && !tableTraceOn()) continue;
    const candidate = api.state.people.get(filing.personId);
    if (!candidate?.alive || !candidate.knownIds.size) continue;
    const told = table(api, "rivalWord").query("byCandidate", [
      candidate.id,
    ]) as unknown as { id: string; date: string }[];
    if (told.some((row) => row.date > since)) continue;
    const heard = new Set(told.map((row) => row.id));
    const fresh = (
      table(api, "messages").query("byContest", [
        filing.contestId,
      ]) as unknown as MessageRow[]
    )
      .filter(
        (row) =>
          row.candidateId !== candidate.id &&
          row.date > since &&
          !heard.has(`${row.id}:${candidate.id}`),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    if (quiet && fresh.length)
      throw new Error(
        `Filing ${filing.id} was skipped with a message since ${since} to pass on.`,
      );
    for (const message of fresh) {
      const witnesses = new Set(message.witnessIds);
      const teller = [...candidate.knownIds]
        .filter(
          (id) =>
            witnesses.has(id) &&
            inTouchSince(core, id, candidate.id, message.date),
        )
        .map((id) => ({
          id,
          tie: closenessBetween(core, id as PersonId, candidate.id),
        }))
        .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))[0];
      if (!teller) continue;
      const contest = elections(api, "contests").get(filing.contestId) as
        ContestRow | undefined;
      const id = `${message.id}:${candidate.id}`;
      table(api, "rivalWord").put({
        id,
        candidateId: candidate.id,
        date,
        contestId: filing.contestId,
        rivalId: message.candidateId,
        messageId: message.id,
        tellerId: teller.id,
      } as unknown as ModuleRow);
      api.emit({
        id: `${RIVAL_WORD_EVENT}:${id}`,
        date,
        kind: RIVAL_WORD_EVENT,
        personIds: [candidate.id, teller.id],
        placeId: townRow(api).townPlaceId,
        topic: message.topic,
        source: {
          tag: "SOURCED",
          citation: `Campaign message ${message.id}, passed on`,
          asOf: date,
        },
        facts: {
          invitedId: candidate.id,
          tellerId: teller.id,
          rivalId: message.candidateId,
          messageId: message.id,
          contestId: filing.contestId,
          ...(message.kind ? { how: message.kind } : {}),
          ...(message.position === undefined
            ? {}
            : { side: message.position > 0 ? "for" : "against" }),
          ...(contest ? { office: contest.title } : {}),
        },
      });
      break;
    }
  }
}

/**
 * Word of a rival is kept while a reader can still reach it (governing lead,
 * Oct 30). `rivalWordPassedOn` reads a message, and a candidate's word, only
 * while it is newer than the day `rivalWordDays` back, a day that only moves
 * forward; a filing stays on the ballot after the count, so it reads a
 * closed race's last week too. `raceReading` reads a candidate's newest word
 * in a race still under way (`newestWord`), however old. So at each campaign
 * turn a message older than the window goes, and a word row older than it
 * goes unless it is that newest word in a race in `races`. A closed race's
 * rows go as its last week leaves the window, and both tables hold about a
 * week of rows, so this pass does not grow with the years.
 */
export function foldRivalWord(api: CoreAPI): void {
  const since = addDays(
    makeIsoDate(api.state.date),
    -campaignParameter("rivalWordDays"),
  );
  const messages = table(api, "messages");
  for (const row of messages.rows() as unknown as MessageRow[])
    if (!(row.date > since)) messages.remove(row.id);
  const words = table(api, "rivalWord"),
    races = table(api, "races");
  // Each candidate's newest word in a race under way, by candidate and
  // contest, read before any of that pair's rows go.
  const newest = new Map<string, string | undefined>();
  for (const row of words.rows() as unknown as RivalWordRow[]) {
    if (row.date > since) continue;
    if (row.contestId && races.get(row.contestId)) {
      const key = JSON.stringify([row.candidateId, row.contestId]);
      if (!newest.has(key))
        newest.set(
          key,
          newestWord(
            words.query("byCandidate", [
              row.candidateId,
            ]) as unknown as RivalWordRow[],
            row.contestId,
          )?.id,
        );
      if (newest.get(key) === row.id) continue;
    }
    words.remove(row.id);
  }
}
