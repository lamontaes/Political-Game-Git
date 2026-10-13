/**
 * Basic news (M2-09). A public record (a closure, a result, a law taking
 * effect) becomes a story for the place it happened in. Outlets carry it to
 * each resident after a delay set by how closely they follow politics (their
 * view's engagement): someone who follows it most of the time hears the next
 * day, someone who hardly follows hears much later, and past the story's life
 * never. People also pass the newest story the other hasn't heard at each
 * real contact. Hearing a story teaches its facts; people who never hear it
 * don't know it.
 *
 * Each story's deliveries are scheduled once, when it is recorded, and read by
 * date, so no day scans the whole town.
 */
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import rows from "../data/news/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type { CoreAPI, CoreModule, KnownFact, PersonId } from "../types";
import { viewOf } from "./views";

export const NEWS_MODULE_ID = "news";
const PARAMETERS = rows as Readonly<Record<string, Parameter>>;
const n = (api: CoreAPI, key: string) => {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
};

export interface Story {
  id: string;
  kind: string;
  /** The outlet that carried it: the place's local outlet record. */
  outletId: string;
  date: string;
  placeId: string;
  facts: Readonly<Record<string, string>>;
}

const stories = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("stories");
const deliveries = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("deliveries");
const heard = (api: CoreAPI) => api.moduleState(NEWS_MODULE_ID).table("heard");
const outlets = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("outlets");

/**
 * Trust in the media from a person's lean, interpolated between Gallup's
 * shares for Democrats (lean -1), independents (0) and Republicans (+1).
 */
export function trustOf(api: CoreAPI, lean: number): number {
  const x = Math.max(
    -api.parameter("one"),
    Math.min(api.parameter("one"), lean),
  );
  const center = n(api, "newsTrustModerate");
  return x < api.parameter("zero")
    ? center + (n(api, "newsTrustLiberal") - center) * -x
    : center + (n(api, "newsTrustConservative") - center) * x;
}

/**
 * Who reads a story recorded for a place: its residents, and for a county or
 * state, the residents of the places inside it.
 */
function readersOf(api: CoreAPI, placeId: string): PersonId[] {
  const direct = api.state.peopleByPlace.get(placeId);
  if (direct?.size) return [...direct];
  const out: PersonId[] = [];
  const state = lifePlaceByJurisdictionId(placeId as never);
  for (const [place, people] of api.state.peopleByPlace) {
    const row = lifePlaceByJurisdictionId(place as never);
    const inside =
      [...people].some(
        (id) => api.state.people.get(id)?.countyId === placeId,
      ) ||
      (state?.scope === "state" &&
        row?.stateJurisdictionKey === state.stateJurisdictionKey);
    if (inside) out.push(...people);
  }
  return out;
}

export function newsKey(storyId: string): string {
  return `news:${storyId}`;
}

/** The stories a person has heard (since a date they heard them, if given), newest first. */
export function storiesHeard(
  api: CoreAPI,
  personId: PersonId,
  heardSince?: string,
): Story[] {
  return (
    heard(api).query("byPerson", [personId]) as unknown as {
      storyId: string;
      date: string;
    }[]
  )
    .filter((row) => !heardSince || row.date >= heardSince)
    .map((row) => stories(api).get(row.storyId) as unknown as Story)
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

interface HeardEntry {
  storyId: string;
  storyDate: string;
  heardDate: string;
}

/**
 * What each person heard that may still be news, rebuilt from the table when
 * first read. Telling reads this instead of everything a person ever heard;
 * entries past the story life are dropped as they are read.
 */
const recentHeard = new WeakMap<object, Map<PersonId, HeardEntry[]>>();
function recentOf(api: CoreAPI): Map<PersonId, HeardEntry[]> {
  let map = recentHeard.get(api.state);
  if (!map) {
    map = new Map();
    for (const row of heard(api).rows()) {
      const story = stories(api).get(row.storyId as string) as unknown as
        Story | undefined;
      if (!story) continue;
      const list = map.get(row.personId as string) ?? [];
      list.push({
        storyId: story.id,
        storyDate: story.date,
        heardDate: row.date as string,
      });
      map.set(row.personId as string, list);
    }
    recentHeard.set(api.state, map);
  }
  return map;
}

/**
 * The stories a person heard since `since` whose own date is on or after it,
 * newest first: the same list and order as `storiesHeard` up to its first
 * story older than the story life.
 */
function recentStoriesHeard(
  api: CoreAPI,
  personId: PersonId,
  since: string,
): Story[] {
  const map = recentOf(api);
  const list = map.get(personId);
  if (!list) return [];
  // Days only move forward, so what is too old now stays too old.
  const kept = list.filter(
    (row) => row.heardDate >= since && row.storyDate >= since,
  );
  if (kept.length) map.set(personId, kept);
  else map.delete(personId);
  return kept
    .sort(
      (a, b) =>
        b.storyDate.localeCompare(a.storyDate) ||
        a.storyId.localeCompare(b.storyId),
    )
    .map((row) => stories(api).get(row.storyId) as unknown as Story);
}

/** How many stories each person has heard, rebuilt from the table when first read. */
const heardCounts = new WeakMap<object, Map<PersonId, number>>();
function countsOf(api: CoreAPI): Map<PersonId, number> {
  let map = heardCounts.get(api.state);
  if (!map) {
    map = new Map();
    for (const row of heard(api).rows())
      map.set(
        row.personId as string,
        (map.get(row.personId as string) ?? api.parameter("zero")) +
          api.parameter("one"),
      );
    heardCounts.set(api.state, map);
  }
  return map;
}

function hear(
  api: CoreAPI,
  personId: PersonId,
  story: Story,
  access: KnownFact["access"],
  sourceId: string,
): boolean {
  const id = `${personId}:${story.id}`;
  if (heard(api).get(id)) return false;
  heard(api).put({ id, personId, storyId: story.id, date: api.state.date });
  const recent = recentOf(api).get(personId);
  const entry = {
    storyId: story.id,
    storyDate: story.date,
    heardDate: api.state.date,
  };
  if (recent) recent.push(entry);
  else recentOf(api).set(personId, [entry]);
  const counts = countsOf(api);
  counts.set(
    personId,
    (counts.get(personId) ?? api.parameter("zero")) + api.parameter("one"),
  );
  const learned = (key: string, value: string) =>
    api.observe(personId, {
      key,
      value,
      learnedAt: api.state.date,
      sourceId,
      access,
    });
  learned(newsKey(story.id), story.kind);
  learned(`${newsKey(story.id)}:outlet`, story.outletId);
  for (const [key, value] of Object.entries(story.facts)) learned(key, value);
  return true;
}

/**
 * The news module. `tellable` lists what a teller can pass on, newest first;
 * tests swap in the full rescan (`storiesHeard`) to check both tell the same.
 */
export function createNewsModule(
  tellable: (
    api: CoreAPI,
    personId: PersonId,
    since: string,
  ) => Story[] = recentStoriesHeard,
): CoreModule {
  return {
    id: NEWS_MODULE_ID,
    state: {
      schemaVersion: 1,
      tables: {
        stories: {},
        outlets: {},
        deliveries: { indexes: { byDate: { fields: ["date"] } } },
        heard: { indexes: { byPerson: { fields: ["personId"] } } },
      },
    },
    eventKinds: ["*"],
    onEvent(api, event, learnedBy) {
      if (!event.publicRecord || stories(api).get(event.id)) return;
      const outletId = `outlet:${event.placeId}`;
      if (!outlets(api).get(outletId))
        // One local outlet per place stands for its newspapers, stations and
        // sites until real outlets are records (stopgap SG-P15-news-habits).
        outlets(api).put({
          id: outletId,
          placeId: event.placeId,
          kind: "local",
        });
      const story: Story = {
        id: event.id,
        outletId,
        kind: event.kind,
        date: event.date,
        placeId: event.placeId,
        facts: event.facts ?? {},
      };
      stories(api).put(story as unknown as { id: string });
      // The people the event itself reached already know it.
      for (const id of learnedBy) hear(api, id, story, "perceived", event.id);
      const maxAge = n(api, "newsMaxAgeDays");
      for (const personId of readersOf(api, event.placeId)) {
        if (learnedBy.includes(personId)) continue;
        const view = viewOf(api, personId);
        const engagement = view?.engagement ?? api.parameter("zero");
        if (engagement <= api.parameter("zero")) continue;
        // People who trust the media less check it less, and hear later.
        const reach =
          engagement * (trustOf(api, view!.lean) / n(api, "newsTrustAverage"));
        const delay = Math.ceil(n(api, "newsOutletDelayDays") / reach);
        if (delay > maxAge) continue;
        deliveries(api).put({
          id: `${story.id}:${personId}`,
          storyId: story.id,
          personId,
          date: addDays(makeIsoDate(event.date), delay),
        });
      }
    },
    relationshipKinds: ["*"],
    onRelationshipChange(api, notice) {
      // Only a contact that happened today carries news between the two, and
      // only when one of them has heard something.
      if (notice.date !== api.state.date) return;
      const counts = countsOf(api);
      if (!counts.get(notice.actorId) && !counts.get(notice.otherId)) return;
      const maxAge = n(api, "newsMaxAgeDays");
      const fresh = (story: Story) =>
        daysBetween(makeIsoDate(story.date), makeIsoDate(api.state.date)) <=
        maxAge;
      // A story still fresh today was heard on or after its own date, so only
      // what the teller heard within the story life is read (same order).
      const since = addDays(makeIsoDate(api.state.date), -maxAge);
      for (const [teller, listener] of [
        [notice.actorId, notice.otherId],
        [notice.otherId, notice.actorId],
      ] as const) {
        let passed = api.parameter("zero");
        for (const story of tellable(api, teller, since)) {
          if (passed >= n(api, "newsStoriesPerContact") || !fresh(story)) break;
          if (hear(api, listener, story, "told", notice.relationshipId))
            passed += api.parameter("one");
        }
      }
    },
    onAfterDay(api) {
      for (const row of deliveries(api).query("byDate", [api.state.date])) {
        const story = stories(api).get(
          row.storyId as string,
        ) as unknown as Story;
        if (story) hear(api, row.personId as string, story, "public", story.id);
        deliveries(api).remove(row.id);
      }
    },
  };
}

export const newsModule: CoreModule = createNewsModule();
