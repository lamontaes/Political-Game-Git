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
import { OUTCOME_WEB_MODULE_ID, outcomeWebFactor } from "./outcome-web";
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import rows from "../data/news/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  KnownFact,
  PersonId,
} from "../types";
import { moveStance, stanceSize, viewOf, type StanceCause } from "./views";

export const NEWS_MODULE_ID = "news";
const PARAMETERS = rows as unknown as Readonly<Record<string, Parameter>>;
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
  /** What a story with a topic carries toward its hearers' stances. */
  stance?: StanceCause;
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

function mediaTrustFactor(api: CoreAPI, placeId: string): number {
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID))
    return api.parameter("one");
  const factor = outcomeWebFactor(api, placeId, "press.media-trust");
  return factor > api.parameter("zero") ? factor : api.parameter("one");
}

/**
 * The news engine's readings of a place for the outcome web: how many local
 * outlets it has, and whether one is a local newspaper (each place has one
 * local outlet record until real outlets are records, SG-P15-news-habits).
 * Null for a measure this engine does not keep.
 */
export function newsMeasure(
  api: CoreAPI,
  placeId: string,
  measure: string,
): number | null {
  if (measure !== "press.local-outlets" && measure !== "press.local-newspaper")
    return null;
  const count = (
    outlets(api).rows() as unknown as { placeId: string }[]
  ).filter((row) => row.placeId === placeId).length;
  // A place whose first story has not run yet still has its outlet.
  const held = Math.max(count, api.parameter("one"));
  return measure === "press.local-outlets"
    ? held
    : Math.min(held, api.parameter("one"));
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

function pruneStories(api: CoreAPI): void {
  const maxAge = n(api, "newsMaxAgeDays");
  const counts = countsOf(api);
  for (const row of stories(api).rows() as unknown as Story[]) {
    if (
      daysBetween(makeIsoDate(row.date), makeIsoDate(api.state.date)) <= maxAge
    )
      continue;
    for (const seen of heard(api).query("byStory", [row.id]) as unknown as {
      id: string;
      personId: PersonId;
    }[]) {
      heard(api).remove(seen.id);
      counts.set(
        seen.personId,
        Math.max(
          api.parameter("zero"),
          (counts.get(seen.personId) ?? api.parameter("zero")) -
            api.parameter("one"),
        ),
      );
    }
    stories(api).remove(row.id);
  }
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
  learned(`${newsKey(story.id)}:outlet`, story.outletId);
  for (const [key, value] of Object.entries(story.facts)) learned(key, value);
  // Hearing about it secondhand moves a stance too, less than living it (the
  // people the event reached were moved by the event itself).
  if (story.stance && access !== "perceived")
    moveStance(api, personId, story.stance, n(api, "newsStanceStep"));
  return true;
}

export const newsModule: CoreModule = {
  id: NEWS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      stories: {},
      outlets: {},
      deliveries: { indexes: { byDate: { fields: ["date"] } } },
      heard: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byStory: { fields: ["storyId"] },
        },
      },
    },
  },
  eventKinds: ["*"],
  onEvent(api, event, learnedBy) {
    if (!event.publicRecord || stories(api).get(event.id)) return;
    const outletId = `outlet:${event.placeId}`;
    if (!outlets(api).get(outletId))
      // One local outlet per place stands for its newspapers, stations and
      // sites until real outlets are records (stopgap SG-P15-news-habits).
      outlets(api).put({ id: outletId, placeId: event.placeId, kind: "local" });
    const story: Story = {
      id: event.id,
      outletId,
      kind: event.kind,
      date: event.date,
      placeId: event.placeId,
      facts: event.facts ?? {},
      ...(event.topic && event.desiredChange
        ? {
            stance: {
              eventId: event.id,
              date: event.date,
              topic: event.topic,
              desiredChange: event.desiredChange,
              size: stanceSize(event),
            },
          }
        : {}),
    };
    stories(api).put(story as unknown as { id: string });
    // The people the event itself reached already know it.
    for (const id of learnedBy) hear(api, id, story, "perceived", event.id);
    const maxAge = n(api, "newsMaxAgeDays");
    // The place's trust in news as the outcome web moves it (1 where it
    // doesn't run or nothing moves it).
    const placeTrust = mediaTrustFactor(api, event.placeId);
    for (const personId of readersOf(api, event.placeId)) {
      if (learnedBy.includes(personId)) continue;
      const view = viewOf(api, personId);
      const engagement = view?.engagement ?? api.parameter("zero");
      if (engagement <= api.parameter("zero")) continue;
      // People who trust the media less check it less, and hear later.
      const reach =
        engagement *
        ((trustOf(api, view!.lean) * placeTrust) / n(api, "newsTrustAverage"));
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
    // Memory stays small (owner, Oct 12, ruling 5): once a month, stories
    // past their life are dropped with who heard them; what people learned
    // from them stays in their own knowledge.
    if (api.state.date.endsWith("-01")) pruneStories(api);
    for (const row of deliveries(api).query("byDate", [api.state.date])) {
      const story = stories(api).get(row.storyId as string) as unknown as Story;
      if (story) hear(api, row.personId as string, story, "public", story.id);
      deliveries(api).remove(row.id);
    }
  },
};
