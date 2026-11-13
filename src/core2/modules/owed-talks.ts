/**
 * Owed talks (people, Nov 11, 2026): a reply that puts a talk off to a day
 * (the director writes `owedWith`, `owedTopic` and `owedDueOn` on the
 * `scene.reply`) leaves a record here: who owes whom, about what, for which
 * day. It closes when the two next talk or have time together, moves when a
 * new day is named for the same matter, and on the due day reads "due" when
 * they have not met since. Whether the day passes unkept follows recorded
 * time together (the tie's last contact date), never a chance.
 */
import { pairKey } from "../kernel/ids";
import type { CoreAPI, CoreEventInput, CoreState, IsoDate } from "../types";

/** The relationships writer (the partnerships module) keeps the table. */
const owedModuleId = "partnerships";
export const OWED_TALK_TABLE = "owed";
export const OWED_TALK_KIND = "owed-talk-due";

export interface OwedTalkRow {
  id: string;
  /** The reply that put the talk off. */
  replyId: string;
  /** The one who promised the talk. */
  owedBy: string;
  /** The one the talk is owed to. */
  owedTo: string;
  topic: string;
  madeOn: IsoDate;
  dueOn: IsoDate;
  state: "open" | "due" | "closed" | "moved";
  /** The record that closed it, or the row it moved to. */
  settledBy?: string;
}

function rows(api: CoreAPI): OwedTalkRow[] {
  return api
    .moduleState(owedModuleId)
    .table(OWED_TALK_TABLE)
    .rows() as unknown as OwedTalkRow[];
}

/** Every owed-talk record (the director's talk that comes due reads these). */
export function owedTalks(api: CoreAPI): readonly OwedTalkRow[] {
  return rows(api);
}

/** A reply was said: it may put a talk off, and it may settle one already owed. */
export function noteReply(api: CoreAPI, event: CoreEventInput): void {
  const facts = event.facts ?? {};
  const dueOn = facts.owedDueOn as IsoDate | undefined;
  const owedTo = facts.owedWith as string | undefined;
  const open = rows(api).filter(
    (row) => row.state === "open" || row.state === "due",
  );
  const table = api.moduleState(owedModuleId).table(OWED_TALK_TABLE);
  const owedBy = owedTo
    ? event.personIds.find((id) => id !== owedTo)
    : undefined;
  const id = `owed-talk:${event.id}`;
  // The two talking again settles what they owed each other: moved when this
  // reply names a new day for the same matter, closed otherwise.
  for (const row of open) {
    const samePair =
      event.personIds.includes(row.owedBy) &&
      event.personIds.includes(row.owedTo);
    if (!samePair || row.replyId === event.id) continue;
    const moved =
      !!dueOn && owedTo === row.owedTo && facts.owedTopic === row.topic;
    table.put({
      ...row,
      state: moved ? "moved" : "closed",
      settledBy: moved ? id : event.id,
    } as never);
  }
  if (!dueOn || !owedTo || !owedBy) return;
  table.put({
    id,
    replyId: event.id,
    owedBy,
    owedTo,
    topic: String(facts.owedTopic ?? ""),
    madeOn: event.date,
    dueOn,
    state: "open",
  } as never);
  api.moduleCalendar(owedModuleId).schedule({
    key: id,
    date: dueOn,
    kind: OWED_TALK_KIND,
    source: {
      tag: "SOURCED",
      citation: "A reply that put a talk off to a day.",
      asOf: event.date,
    },
    sourceRecordIds: [event.id, id],
  });
}

/** The due day: still open and no time together since the reply reads as due. */
export function owedTalkComesDue(api: CoreAPI, recordId: string): void {
  const table = api.moduleState(owedModuleId).table(OWED_TALK_TABLE);
  const row = table.get(recordId) as OwedTalkRow | undefined;
  if (!row || row.state !== "open") return;
  const core = api.state as CoreState;
  const met = core.relationships.get(pairKey(row.owedBy, row.owedTo));
  const talked = !!met && String(met.lastContactDate) > String(row.madeOn);
  table.put({
    ...row,
    state: talked ? "closed" : "due",
    ...(talked ? { settledBy: `contact:${met.lastContactDate}` } : {}),
  } as never);
}
