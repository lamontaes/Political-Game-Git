/**
 * What a Journal entry knows of the life after it (owner, Nov 24, page 1: the
 * Journal is a memoir told looking back; "if in 30 years you become a huge
 * healthcare guy, then the journal entry could update... Little did I know").
 * An entry's own facts are the records of its day. This is the one reader of
 * the person's later records, each with the ids it stands on: the first
 * office they went on to hold, the policy area of the bills they went on to
 * sponsor, whether one of those bills answers the same policy question the
 * entry is about, and the years between. It writes no words; the English
 * engine's lines read the facts, and an entry whose lines name none of them
 * reads the same as before.
 */
import { countSaid } from "../english/count-words";
import type { Fact } from "../english/journal-words";
import { topicInSentence } from "../english/policy-names";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";

const one = P.one;
import { coreAPI } from "../core2/state";
import {
  BILL_INTRODUCED,
  LEGISLATURE_MODULE_ID,
} from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, TERM_HELD } from "../core2/modules/offices";
import { historyOf } from "../core2/past";
import type { CoreState, IsoDate, PersonId } from "../core2/types";

/** An office as a sentence names it: "a council member" of several seats, "mayor" of one. */
export function officePhrase(office: {
  readonly title?: string;
  readonly seats?: number;
}): string | undefined {
  if (!office.title) return undefined;
  // One of several seats takes an article: "a council member", but "mayor".
  const article = /^[aeiou]/i.test(office.title) ? "an" : "a";
  return (office.seats ?? one) > one
    ? `${article} ${office.title}`
    : office.title;
}

interface BillInput {
  readonly id: string;
  readonly introduced: string;
  readonly provisions?: readonly {
    readonly question?: string;
    readonly series?: string;
  }[];
}

interface LaterTerm {
  readonly date: string;
  readonly said: string;
  readonly ids: readonly string[];
}

interface LaterBill {
  readonly id: string;
  readonly date: string;
  /** The policy areas its sections are about, as a sentence says them. */
  readonly topics: readonly string[];
  /** The policy questions its sections answer. */
  readonly questions: readonly string[];
}

/**
 * The person's later records as of `through`, read once: the facts a
 * Journal entry dated `since` can carry, or none when nothing came after it.
 */
export function laterRecordsOf(
  core: Readonly<CoreState>,
  personId: PersonId,
  through: IsoDate,
): (since: string, question?: string) => Record<string, Fact> {
  const api = coreAPI(core as CoreState);
  // The person's terms and the bills they brought, as their own history tells
  // them (the offices engine's terms, the legislature's bills).
  const told = historyOf(
    core as CoreState,
    { person: personId },
    { kinds: [TERM_HELD, BILL_INTRODUCED], through },
  );
  const terms: LaterTerm[] = [];
  if (core.modules.has(OFFICES_MODULE_ID)) {
    const offices = api.moduleState(OFFICES_MODULE_ID);
    for (const term of told) {
      if (term.record !== TERM_HELD) continue;
      const officeId = term.facts?.officeId ?? "";
      const office = offices.table("offices").get(officeId) as unknown as
        { title?: string; seats?: number } | undefined;
      const said = office ? officePhrase(office) : undefined;
      if (said)
        terms.push({
          date: term.date,
          said,
          ids: [term.id, officeId],
        });
    }
    terms.sort((a, b) => a.date.localeCompare(b.date));
  }
  const bills: LaterBill[] = [];
  if (core.modules.has(LEGISLATURE_MODULE_ID)) {
    const table = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    for (const event of told) {
      if (event.record !== BILL_INTRODUCED) continue;
      const bill = table.get(event.id) as unknown as BillInput | undefined;
      if (!bill) continue;
      const areas = (bill.provisions ?? []).flatMap((provision) => {
        const key = provision.question ?? provision.series;
        const said = key ? topicInSentence(key) : null;
        return said && key ? [{ key, said }] : [];
      });
      bills.push({
        id: bill.id,
        date: bill.introduced,
        topics: [...new Set(areas.map((area) => area.said))],
        questions: [...new Set(areas.map((area) => area.key))],
      });
    }
    bills.sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );
  }
  return (since, question) => {
    const facts: Record<string, Fact> = {};
    const laterTerms = terms.filter((row) => row.date > since);
    const laterBills = bills.filter((row) => row.date > since);
    let latest = "";
    const note = (date: string) => {
      if (date > latest) latest = date;
    };
    const office = laterTerms.find(() => true);
    if (office) {
      facts["later-office"] = {
        text: office.said,
        sourceRecordIds: [...office.ids],
      };
      note(office.date);
    }
    // The policy area the person sponsored the most bills in, the earliest
    // bill's area first on a tie: a count of their own bills, never a draw.
    const byTopic = new Map<string, LaterBill[]>();
    for (const bill of laterBills)
      for (const topic of bill.topics)
        byTopic.set(topic, [...(byTopic.get(topic) ?? []), bill]);
    const ranked = [...byTopic.entries()]
      .map(([topic, rows]) => ({ topic, rows }))
      .sort(
        (a, b) =>
          b.rows.length - a.rows.length ||
          a.rows
            .map((r) => r.id)
            .join()
            .localeCompare(b.rows.map((r) => r.id).join()),
      );
    const top = ranked.find(() => true);
    if (top) {
      facts["later-topic"] = {
        text: top.topic,
        sourceRecordIds: top.rows.map((bill) => bill.id),
      };
      for (const bill of top.rows) note(bill.date);
    }
    const same = question
      ? laterBills.find((bill) => bill.questions.includes(question))
      : undefined;
    if (same) {
      facts["later-same-point"] = { text: "yes", sourceRecordIds: [same.id] };
      note(same.date);
    }
    if (latest) {
      const years = ageOnDate(makeIsoDate(since), makeIsoDate(latest));
      if (years >= one)
        facts["later-years"] = {
          text: countSaid(years, Infinity),
          sourceRecordIds: [
            ...new Set(Object.values(facts).flatMap((f) => f.sourceRecordIds)),
          ],
        };
    }
    return facts;
  };
}
