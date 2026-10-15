/**
 * News has an archive (owner, Oct 14, 2026): the year before day one, as the
 * news engine's own stories, so the news screen and bring-it-up are not
 * empty on day one and a person can have heard of something.
 *
 * Stories come from the past's records: each prior election decided in the
 * year, each law passed or taking effect in it, each recorded vote of a body
 * covering the town, and each budget that began in it. They are carried by
 * the town's local outlet, as the news engine carries a public record.
 *
 * Who heard: the news engine's own delivery rule. A full resident hears a
 * story after a delay set by how closely they follow politics and how much
 * they trust the media, and never once the delay passes the story's life.
 * A story they would hear after day one is put on the engine's delivery
 * calendar for that day. Nobody too young to follow the news hears it.
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import newsRows from "./data/news/parameters.json" with { type: "json" };
import { newsKey, NEWS_MODULE_ID, trustOf, type Story } from "./modules/news";
import { viewOf } from "./modules/views";
import type { Parameter } from "./parameters";
import type { PastTown } from "./past-bodies";
import {
  pastParameter,
  shiftDays,
  type LawHistoryRow,
  type PastBillRow,
  type PastElectionRow,
} from "./past-module";
import type { CoreAPI, PersonState } from "./types";

const NEWS = newsRows as Readonly<Record<string, Parameter>>;
const news = (api: CoreAPI, key: string): number => {
  const row = NEWS[key]!;
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
};

/** The archive's story kinds, until the press engine names its own. */
export const ARCHIVE_KIND = {
  election: "archive:election-result",
  lawEnacted: "archive:law-enacted",
  lawEffect: "archive:law-took-effect",
  vote: "archive:vote",
  budget: "archive:budget-adopted",
} as const;

/** The day a reader hears a story, by the news engine's delivery rule; null if never. */
export function heardOn(
  api: CoreAPI,
  person: Readonly<PersonState>,
  date: string,
): string | null {
  if (
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date)) <
    pastParameter(api, "pastPublicAwarenessAge")
  )
    return null;
  const view = viewOf(api, person.id);
  const engagement = view?.engagement ?? 0;
  if (engagement <= 0) return null;
  const reach =
    engagement * (trustOf(api, view!.lean) / news(api, "newsTrustAverage"));
  const delay = Math.ceil(news(api, "newsOutletDelayDays") / reach);
  if (delay > news(api, "newsMaxAgeDays")) return null;
  return shiftDays(date, delay);
}

export function buildNewsArchive(
  api: CoreAPI,
  town: PastTown,
  past: {
    elections: readonly PastElectionRow[];
    histories: readonly LawHistoryRow[];
    bills: readonly PastBillRow[];
  },
): readonly Story[] {
  const from = shiftDays(town.opening, -pastParameter(api, "pastArchiveDays"));
  const within = (date: string) => date >= from && date < town.opening;
  const outletId = `outlet:${town.townPlaceId}`;
  // Story kinds until the press engine names an archive kind of its own.
  api.stopgap("SG-CORE-past-archive-kind");
  // The generated past holds no deaths or closures before day one to report.
  api.stopgap("SG-CORE-past-no-deaths-closures");
  const store = api.moduleState(NEWS_MODULE_ID);
  if (!store.table("outlets").get(outletId))
    // The news engine's own stand-in outlet (stopgap SG-P15-news-habits).
    store
      .table("outlets")
      .put({ id: outletId, placeId: town.townPlaceId, kind: "local" });
  const stories: Story[] = [];
  const add = (
    kind: string,
    recordId: string,
    date: string,
    facts: Record<string, string>,
  ) => {
    if (!within(date)) return;
    stories.push({
      id: `${kind}:${recordId}`,
      kind,
      outletId,
      date,
      placeId: town.townPlaceId,
      facts: { ...facts, recordId },
    });
  };
  for (const election of past.elections)
    add(ARCHIVE_KIND.election, election.id, election.date, {
      seatId: election.seatId,
      officeId: election.officeId,
      winnerId: election.winnerId,
      winnerVotes: String(election.candidates[0]!.votes),
      totalVotes: String(election.totalVotes),
    });
  for (const history of past.histories) {
    const facts = {
      lawId: history.lawId,
      series: history.series,
      jurisdiction: history.jurisdiction,
      body: history.body,
    };
    add(ARCHIVE_KIND.lawEnacted, history.id, history.enactedOn, facts);
    add(ARCHIVE_KIND.lawEffect, history.id, history.effectiveDate, facts);
  }
  for (const bill of past.bills)
    add(ARCHIVE_KIND.vote, bill.id, bill.date, {
      body: bill.body,
      question: bill.question,
      passed: String(bill.passed),
      yes: String(bill.rollCall.yes),
      no: String(bill.rollCall.no),
    });
  if (api.state.modules.has("core2-budgets-v1"))
    for (const budget of api
      .moduleState("core2-budgets-v1")
      .table("budgets")
      .rows() as unknown as {
      id: string;
      governmentId: string;
      fiscalYear: number;
      startsOn: string;
      revenueMinor: Record<string, number>;
      spendingMinor: Record<string, number>;
    }[]) {
      const sum = (rows: Record<string, number>) =>
        String(Object.values(rows).reduce((a, b) => a + b, 0));
      add(ARCHIVE_KIND.budget, budget.id, budget.startsOn, {
        governmentId: budget.governmentId,
        fiscalYear: String(budget.fiscalYear),
        revenueMinor: sum(budget.revenueMinor),
        spendingMinor: sum(budget.spendingMinor),
      });
    }
  stories.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const readers = [...(api.state.peopleByPlace.get(town.townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => !!p && p.alive);
  for (const story of stories) {
    if (store.table("stories").get(story.id)) continue;
    store.table("stories").put(story as unknown as { id: string });
    for (const person of readers) {
      const on = heardOn(api, person, story.date);
      if (!on) continue;
      if (on >= town.opening) {
        store.table("deliveries").put({
          id: `${story.id}:${person.id}`,
          storyId: story.id,
          personId: person.id,
          date: on,
        });
        continue;
      }
      store.table("heard").put({
        id: `${person.id}:${story.id}`,
        personId: person.id,
        storyId: story.id,
        date: on,
      });
      const learned = (key: string, value: string) =>
        api.observe(person.id, {
          key,
          value,
          learnedAt: on,
          sourceId: story.id,
          access: "public",
        });
      learned(newsKey(story.id), story.kind);
      // The story's facts stay on the story; the reader keeps where it is.
      learned(`${newsKey(story.id)}:record`, story.facts.recordId!);
    }
  }
  return stories;
}
