/**
 * News has an archive (owner, Oct 14, 2026): the year before day one, as the
 * news engine's own stories, so the news screen and bring-it-up are not
 * empty on day one and a person can have heard of something.
 *
 * Stories come from the past's records: each prior election decided in the
 * year, each law passed or taking effect in it, each recorded vote of a body
 * covering the town, each budget that began in it, each business of the town
 * that closed in it, and each parent of a resident who died in it. The press
 * engine writes every one of them (its outlet, its framing and the record's
 * facts), as the town's own paper.
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
import { writeArchiveStory } from "./modules/press";
import { viewOf } from "./modules/views";
import type { Parameter } from "./parameters";
import type { PastTown } from "./past-bodies";
import type { PastClosureRow } from "./past-business";
import {
  pastParameter,
  shiftDays,
  type LawHistoryRow,
  type PastBillRow,
  type PastElectionRow,
} from "./past-module";
import type { CoreAPI, CoreEventInput, PersonState } from "./types";

const NEWS = newsRows as Readonly<Record<string, Parameter>>;
const news = (api: CoreAPI, key: string): number => {
  const row = NEWS[key]!;
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
};

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
    closures: readonly PastClosureRow[];
  },
): readonly Story[] {
  const from = shiftDays(town.opening, -pastParameter(api, "pastArchiveDays"));
  const within = (date: string) => date >= from && date < town.opening;
  // The press engine writes each story; with no press installed there is
  // no paper to carry the past, and the archive is empty.
  // A resident's parent who died is archived for full residents only.
  api.stopgap("SG-CORE-past-counted-parents-deaths");
  const store = api.moduleState(NEWS_MODULE_ID);
  const stories: Story[] = [];
  const add = (
    kind: string,
    recordId: string,
    date: string,
    facts: Record<string, string>,
    more: Partial<CoreEventInput> = {},
  ) => {
    if (!within(date)) return;
    const story = writeArchiveStory(api, {
      id: `${kind}:${recordId}`,
      kind,
      date: makeIsoDate(date),
      personIds: [],
      placeId: town.townPlaceId,
      source: {
        tag: "ESTIMATED",
        citation: "the generated past (src/core2/past-module.ts)",
        asOf: makeIsoDate(town.opening),
      },
      facts: { ...facts, recordId },
      ...more,
    });
    if (story) stories.push(story);
  };
  for (const election of past.elections)
    add(
      "election-result",
      election.id,
      election.date,
      {
        contestId: election.id,
        seatId: election.seatId,
        officeId: election.officeId,
        winnerId: election.winnerId,
        winnerVotes: String(election.candidates[0]!.votes),
        totalVotes: String(election.totalVotes),
      },
      { personIds: [election.winnerId] },
    );
  for (const history of past.histories) {
    const facts = {
      lawId: history.lawId,
      series: history.series,
      jurisdiction: history.jurisdiction,
      body: history.body,
    };
    add("law-enacted", history.id, history.enactedOn, facts, {
      topic: history.series,
      desiredChange: "enact",
    });
    add("law-took-effect", history.id, history.effectiveDate, facts);
  }
  for (const bill of past.bills)
    add("legislative-vote", bill.id, bill.date, {
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
      add("budget-adopted", budget.id, budget.startsOn, {
        governmentId: budget.governmentId,
        fiscalYear: String(budget.fiscalYear),
        revenueMinor: sum(budget.revenueMinor),
        spendingMinor: sum(budget.spendingMinor),
      });
    }
  // A business that closed in the year before day one: reported once, and
  // heard by its former owner the day it happened.
  for (const closure of past.closures)
    add(
      "business.closed",
      closure.id,
      closure.date,
      {
        kindId: closure.kindId,
        name: closure.name,
        ownerId: closure.ownerId,
        workers: String(closure.workers),
        [`organization:${closure.id}:closing-reason`]: closure.cause,
      },
      { personIds: [closure.ownerId], topic: closure.id },
    );
  // A parent who died in the year before day one: a dated fact on the resident
  // who survives them, reported once and heard by that resident the day it
  // happened.
  const readers = [...(api.state.peopleByPlace.get(town.townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => !!p && p.alive);
  for (const person of readers)
    for (const fact of person.pastFacts ?? [])
      if (fact.kind === "family:parent-died")
        add(
          "parent-died",
          fact.id,
          fact.date,
          {
            survivorId: person.id,
            relation: fact.facts?.relation ?? "",
            givenName: fact.facts?.givenName ?? "",
            familyName: fact.facts?.familyName ?? "",
          },
          { personIds: [person.id] },
        );
  stories.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  for (const story of stories) {
    if (store.table("stories").get(story.id)) continue;
    store.table("stories").put(story as unknown as { id: string });
    for (const person of readers) {
      const on =
        story.facts.survivorId === person.id ||
        story.facts.ownerId === person.id
          ? story.date
          : heardOn(api, person, story.date);
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
      learned(newsKey(story.id), story.facts.recordKind!);
      // The story's facts stay on the story; the reader keeps where it is.
      learned(`${newsKey(story.id)}:record`, story.facts.recordId!);
    }
  }
  return stories;
}
