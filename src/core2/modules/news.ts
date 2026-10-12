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
  date: string;
  placeId: string;
  facts: Readonly<Record<string, string>>;
}

const stories = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("stories");
const deliveries = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("deliveries");
const heard = (api: CoreAPI) => api.moduleState(NEWS_MODULE_ID).table("heard");

export function newsKey(storyId: string): string {
  return `news:${storyId}`;
}

/** The stories a person has heard, newest first. */
export function storiesHeard(api: CoreAPI, personId: PersonId): Story[] {
  return (
    heard(api).query("byPerson", [personId]) as unknown as {
      storyId: string;
    }[]
  )
    .map((row) => stories(api).get(row.storyId) as unknown as Story)
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
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
  for (const [key, value] of Object.entries(story.facts)) learned(key, value);
  return true;
}

export const newsModule: CoreModule = {
  id: NEWS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      stories: {},
      deliveries: { indexes: { byDate: { fields: ["date"] } } },
      heard: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
  eventKinds: ["*"],
  onEvent(api, event, learnedBy) {
    if (!event.publicRecord || stories(api).get(event.id)) return;
    const story: Story = {
      id: event.id,
      kind: event.kind,
      date: event.date,
      placeId: event.placeId,
      facts: event.facts ?? {},
    };
    stories(api).put(story as unknown as { id: string });
    // The people the event itself reached already know it.
    for (const id of learnedBy) hear(api, id, story, "perceived", event.id);
    const maxAge = n(api, "newsMaxAgeDays");
    for (const personId of api.state.peopleByPlace.get(event.placeId) ?? []) {
      if (learnedBy.includes(personId)) continue;
      const engagement =
        viewOf(api, personId)?.engagement ?? api.parameter("zero");
      if (engagement <= api.parameter("zero")) continue;
      const delay = Math.ceil(n(api, "newsOutletDelayDays") / engagement);
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
    for (const [teller, listener] of [
      [notice.actorId, notice.otherId],
      [notice.otherId, notice.actorId],
    ] as const) {
      let passed = api.parameter("zero");
      for (const story of storiesHeard(api, teller)) {
        if (passed >= n(api, "newsStoriesPerContact") || !fresh(story)) break;
        if (hear(api, listener, story, "told", notice.relationshipId))
          passed += api.parameter("one");
      }
    }
  },
  onAfterDay(api) {
    for (const row of deliveries(api).query("byDate", [api.state.date])) {
      const story = stories(api).get(row.storyId as string) as unknown as Story;
      if (story) hear(api, row.personId as string, story, "public", story.id);
      deliveries(api).remove(row.id);
    }
  },
};
