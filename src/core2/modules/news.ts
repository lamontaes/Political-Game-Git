/**
 * News (M2-09; the press, Oct 14). Where the press runs, a story is what a
 * town outlet's reporter chose to print (`printStory`): it reaches the
 * outlet's followers after a delay set by how closely they follow politics
 * (their view's engagement) and how far they trust the media. Someone who
 * follows it most of the time hears the next day, someone who hardly follows
 * hears much later, and past the story's life never. Each day's readers of a
 * story are one event with its topic, so their views and drives read what
 * was printed. People also pass the newest story the other hasn't heard at
 * each real contact. Hearing a story teaches its facts; people who never hear
 * it don't know it.
 *
 * In a world without the press (unit tests of other engines), a public
 * record itself is a story for every resident of its place.
 *
 * Each story's deliveries are scheduled once, when it is recorded, and read by
 * date, so no day scans the whole town.
 */
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import { corePlaceByJurisdictionId } from "../place-lookup";
import rows from "../data/news/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type {
  CoreAPI,
  CoreModule,
  KnownFact,
  PersonId,
  PersonState,
} from "../types";
import { believesClaim } from "../heard-claims";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import { viewOf } from "./views";
import { measureOfFactKey } from "../outcome-news";

/** The press module's id (kept here so news does not import the press). */
const PRESS_MODULE_ID = "core2-press-v1";

const passOnLeans = new WeakMap<
  object,
  { date: string; by: Map<string, number> }
>();

/** A teller's lean toward passing a story on, worked out once per person per day. */
function passOnLean(api: CoreAPI, person: PersonState): number {
  let day = passOnLeans.get(api.state);
  if (day?.date !== api.state.date) {
    day = { date: api.state.date, by: new Map() };
    passOnLeans.set(api.state, day);
  }
  let lean = day.by.get(person.id);
  if (lean === undefined) {
    lean = decisionLean(api.state, person, "news.pass-on", "tell", "keep");
    day.by.set(person.id, lean);
  }
  return lean;
}

/**
 * What each teller's last contacts left over: stories owed in part (a share
 * of a story carries to the next contact, as a named voter's turnout does),
 * so a teller who leans toward passing news on tells a little more often
 * and one who leans away a little less, with no roll.
 */
const tellCarry = new WeakMap<object, Map<PersonId, number>>();
/** A teller who has not yet been counted owes half a story, so an even teller tells one at once. */
const OPENING_TELL_CARRY = 0.5;

/**
 * The stories a teller owes the person they meet, before carrying the part
 * stories over: the usual number, more for a teller whose traits lean toward
 * passing news on and fewer for one whose traits lean away (extraversion and
 * information sharing, Lin et al. 2024).
 */
export function storiesOwedAtContact(
  api: CoreAPI,
  teller: PersonState | undefined,
): number {
  return (
    n(api, "newsStoriesPerContact") *
    Math.max(
      api.parameter("zero"),
      api.parameter("one") +
        (teller
          ? decisionTraitWeight(api.state, "news.pass-on") *
            passOnLean(api, teller)
          : api.parameter("zero")),
    )
  );
}

/** The whole stories a teller passes at this contact, carrying the rest. */
function storiesToTell(api: CoreAPI, tellerId: PersonId, owed: number): number {
  let carries = tellCarry.get(api.state);
  if (!carries) tellCarry.set(api.state, (carries = new Map()));
  const total = (carries.get(tellerId) ?? OPENING_TELL_CARRY) + owed;
  const whole = Math.floor(total);
  carries.set(tellerId, total - whole);
  return whole;
}

/** The told stories a listener took no stock in, so the same teller does not repeat them. */
const refusedStories = new WeakMap<object, Set<string>>();
const refused = (api: CoreAPI): Set<string> => {
  let set = refusedStories.get(api.state);
  if (!set) refusedStories.set(api.state, (set = new Set()));
  return set;
};

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
  /** The outlet that carried it: its organization's id. */
  outletId: string;
  date: string;
  placeId: string;
  facts: Readonly<Record<string, string>>;
  /** What the story is about and the change it argues for, for readers' views. */
  topic?: string;
  desiredChange?: string;
  moodImpulse?: number;
  /**
   * How the outlet framed it, -1 to 1: for (+) or against (-) the change it
   * reports and the people it names (the press's slant).
   */
  framing?: number;
}

/** The event kind for one day's readers of a printed story. */
export const NEWS_READ = "news.read";

/** The story a read event is about: its id is `news.read:<story id>:<date>`. */
export function storyOfReadEvent(eventId: string): string | null {
  return eventId.startsWith(`${NEWS_READ}:`)
    ? eventId.slice(NEWS_READ.length + 1, eventId.lastIndexOf(":"))
    : null;
}

const stories = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("stories");
const deliveries = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("deliveries");
const heard = (api: CoreAPI) => api.moduleState(NEWS_MODULE_ID).table("heard");
const delivered = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("delivered");

/**
 * The first story carrying a measure that a resident of the place heard, or
 * null: a change nobody in town has heard of is not one the town attributes
 * to anything yet.
 */
export function storyDelivered(
  api: CoreAPI,
  placeId: string,
  measure: string,
): { storyId: string; date: string; personId: string } | null {
  if (!api.state.modules.has(NEWS_MODULE_ID)) return null;
  return (delivered(api).get(`${placeId}:${measure}`) ?? null) as unknown as {
    storyId: string;
    date: string;
    personId: string;
  } | null;
}

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

/** How much a person's trust in the media weighs what the news told them, against the average reader (1). */
export function trustWeight(api: CoreAPI, lean: number): number {
  return trustOf(api, lean) / n(api, "newsTrustAverage");
}

/**
 * Who reads a story recorded for a place: its residents, and for a county or
 * state, the residents of the places inside it.
 */
function readersOf(api: CoreAPI, placeId: string): PersonId[] {
  const direct = api.state.peopleByPlace.get(placeId);
  if (direct?.size) return [...direct];
  const out: PersonId[] = [];
  const state = corePlaceByJurisdictionId(placeId as never);
  for (const [place, people] of api.state.peopleByPlace) {
    const row = corePlaceByJurisdictionId(place as never);
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

/** One person's recent hearing: entries newest first once sorted, and their ids. */
interface Recent {
  list: HeardEntry[];
  ids: Set<string>;
  sorted: boolean;
  /** The cutoff the list was last pruned to. */
  since: string;
}

/**
 * What each person heard that may still be news, rebuilt from the table when
 * first read. Telling reads this instead of everything a person ever heard;
 * entries past the story life are dropped once a day, when first read.
 */
const recentHeard = new WeakMap<object, Map<PersonId, Recent>>();
function recentOf(api: CoreAPI): Map<PersonId, Recent> {
  let map = recentHeard.get(api.state);
  if (!map) {
    map = new Map();
    for (const row of heard(api).rows()) {
      const story = stories(api).get(row.storyId as string) as unknown as
        Story | undefined;
      if (story)
        addRecent(map, row.personId as string, {
          storyId: story.id,
          storyDate: story.date,
          heardDate: row.date as string,
        });
    }
    recentHeard.set(api.state, map);
  }
  return map;
}

function addRecent(
  map: Map<PersonId, Recent>,
  personId: PersonId,
  entry: HeardEntry,
) {
  const recent = map.get(personId);
  if (!recent) {
    map.set(personId, {
      list: [entry],
      ids: new Set([entry.storyId]),
      sorted: true,
      since: "",
    });
    return;
  }
  recent.list.push(entry);
  recent.ids.add(entry.storyId);
  recent.sorted = false;
}

/** The person's recent entries pruned to `since`, newest first. */
function recentList(
  api: CoreAPI,
  personId: PersonId,
  since: string,
): HeardEntry[] {
  const recent = recentOf(api).get(personId);
  if (!recent) return [];
  // Days only move forward, so what is too old now stays too old.
  if (recent.since !== since) {
    recent.list = recent.list.filter(
      (row) => row.heardDate >= since && row.storyDate >= since,
    );
    recent.ids = new Set(recent.list.map((row) => row.storyId));
    recent.since = since;
  }
  if (!recent.sorted) {
    recent.list.sort(
      (a, b) =>
        b.storyDate.localeCompare(a.storyDate) ||
        a.storyId.localeCompare(b.storyId),
    );
    recent.sorted = true;
  }
  return recent.list;
}

/**
 * The stories a person heard since `since` whose own date is on or after it,
 * newest first: the same list and order as `storiesHeard` up to its first
 * story older than the story life. Read one at a time, as telling needs them.
 */
function* recentStoriesHeard(
  api: CoreAPI,
  personId: PersonId,
  since: string,
): Iterable<Story> {
  for (const row of recentList(api, personId, since))
    yield stories(api).get(row.storyId) as unknown as Story;
}

/** Whether the person is known to have heard a recent story (the table has the rest). */
function heardRecently(
  api: CoreAPI,
  personId: PersonId,
  storyId: string,
): boolean {
  return recentOf(api).get(personId)?.ids.has(storyId) ?? false;
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
  addRecent(recentOf(api), personId, {
    storyId: story.id,
    storyDate: story.date,
    heardDate: api.state.date,
  });
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
  for (const key of Object.keys(story.facts)) {
    const measure = measureOfFactKey(key);
    const row = `${story.placeId}:${measure}`;
    if (measure && !delivered(api).get(row))
      delivered(api).put({
        id: row,
        storyId: story.id,
        date: api.state.date,
        personId,
      });
  }
  return true;
}

/**
 * Retention (MEMORY-FLAT), once a month: past its life a story is never
 * delivered or told again, so who heard it no longer decides anything, and
 * those rows go, with the story's own two keys (its kind and outlet), which
 * nothing reads once it can no longer be told. The facts it carried stay in
 * their knowledge; the player's own rows and keys stay too.
 */
function forgetOldNews(api: CoreAPI): void {
  const since = addDays(makeIsoDate(api.state.date), -n(api, "newsMaxAgeDays"));
  const counts = countsOf(api);
  // Past a story's life it is never told, so the doubted ones are forgotten too.
  refused(api).clear();
  const player = (api.state as { playerId?: PersonId }).playerId;
  for (const row of heard(api).rows()) {
    const personId = row.personId as PersonId;
    if (personId === player) continue;
    const story = stories(api).get(row.storyId as string) as unknown as
      Story | undefined;
    if (story && story.date >= since) continue;
    heard(api).remove(row.id);
    counts.set(personId, (counts.get(personId) ?? 1) - api.parameter("one"));
    const known = api.state.knowledgeByPerson.get(personId);
    const key = newsKey(row.storyId as string);
    known?.delete(key);
    known?.delete(`${key}:outlet`);
  }
}

/** Schedules a story's delivery to each reader by their habits and trust. */
function scheduleDeliveries(
  api: CoreAPI,
  story: Story,
  readerIds: Iterable<PersonId>,
  skip: ReadonlySet<PersonId>,
): number {
  let scheduled = 0;
  const maxAge = n(api, "newsMaxAgeDays");
  for (const personId of readerIds) {
    if (skip.has(personId)) continue;
    const view = viewOf(api, personId);
    const engagement = view?.engagement ?? api.parameter("zero");
    if (engagement <= api.parameter("zero")) continue;
    // People who trust the media less check it less, and hear later.
    const reach =
      engagement * (trustOf(api, view!.lean) / n(api, "newsTrustAverage"));
    const exact = Math.ceil(n(api, "newsOutletDelayDays") / reach);
    if (exact > maxAge) continue;
    // A printed story's readers catch up with it in waves: the next day,
    // then each time the delay grows by the wave factor, so a story is read
    // on a few days rather than every day of its life (one reading event
    // per wave).
    const factor = n(api, "newsReadingWaveFactor");
    const delay = story.topic
      ? Math.min(
          maxAge,
          factor **
            Math.ceil(
              Math.log(Math.max(api.parameter("one"), exact)) /
                Math.log(factor),
            ),
        )
      : exact;
    deliveries(api).put({
      id: `${story.id}:${personId}`,
      storyId: story.id,
      personId,
      date: addDays(makeIsoDate(story.date), delay),
    });
    scheduled += 1;
  }
  return scheduled;
}

/**
 * A town outlet prints a story its reporter chose (the press): it reaches the
 * outlet's followers, each on their own day, as far as their habits and
 * trust carry it. Returns how many of them will receive it.
 */
export function printStory(
  api: CoreAPI,
  story: Story,
  readerIds: readonly PersonId[],
): number {
  // A world without news keeps the press's own record of the story only.
  if (!api.state.modules.has(NEWS_MODULE_ID) || stories(api).get(story.id))
    return 0;
  stories(api).put(story as unknown as { id: string });
  return scheduleDeliveries(api, story, readerIds, new Set());
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
  ) => Iterable<Story> = recentStoriesHeard,
): CoreModule {
  return {
    id: NEWS_MODULE_ID,
    state: {
      schemaVersion: 1,
      tables: {
        stories: {},
        deliveries: { indexes: { byDate: { fields: ["date"] } } },
        heard: { indexes: { byPerson: { fields: ["personId"] } } },
        // The first story that reached someone in a place with a measure.
        delivered: {},
      },
    },
    eventKinds: ["*"],
    onEvent(api, event, learnedBy) {
      // Where the press runs, its reporters decide what becomes a story.
      if (api.state.modules.has(PRESS_MODULE_ID)) return;
      if (!event.publicRecord || stories(api).get(event.id)) return;
      const story: Story = {
        id: event.id,
        outletId: `outlet:${event.placeId}`,
        kind: event.kind,
        date: event.date,
        placeId: event.placeId,
        facts: event.facts ?? {},
      };
      stories(api).put(story as unknown as { id: string });
      // The people the event itself reached already know it.
      for (const id of learnedBy) hear(api, id, story, "perceived", event.id);
      scheduleDeliveries(
        api,
        story,
        readersOf(api, event.placeId),
        new Set(learnedBy),
      );
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
        // How many stories they pass on leans on every trait they have.
        const tellerPerson = api.state.people.get(teller);
        const toTell = storiesToTell(
          api,
          teller,
          storiesOwedAtContact(api, tellerPerson),
        );
        // Whether the listener takes a told story in is theirs to decide:
        // the benefit of the doubt against their own lean toward doubting.
        const listenerPerson = api.state.people.get(listener);
        let believes: boolean | undefined;
        let passed = api.parameter("zero");
        for (const story of tellable(api, teller, since)) {
          if (passed >= toTell || !fresh(story)) break;
          // Already heard: hear() would refuse it too, without the lookup.
          if (heardRecently(api, listener, story.id)) continue;
          const refusal = `${listener}:${story.id}`;
          if (refused(api).has(refusal)) continue;
          believes ??= listenerPerson
            ? believesClaim(api.state, listenerPerson)
            : true;
          if (!believes) {
            // Told, and not taken in; the paper can still reach them.
            refused(api).add(refusal);
            passed += api.parameter("one");
          } else if (hear(api, listener, story, "told", notice.relationshipId))
            passed += api.parameter("one");
        }
      }
    },
    onAfterDay(api) {
      if (api.state.date.endsWith("-01")) forgetOldNews(api);
      const readers = new Map<string, PersonId[]>();
      for (const row of deliveries(api).query("byDate", [api.state.date])) {
        const story = stories(api).get(
          row.storyId as string,
        ) as unknown as Story;
        if (
          story &&
          hear(api, row.personId as string, story, "public", story.id)
        )
          readers.set(story.id, [
            ...(readers.get(story.id) ?? []),
            row.personId as string,
          ]);
        deliveries(api).remove(row.id);
      }
      // Today's readers of a printed story take in what it argued.
      for (const [storyId, ids] of [...readers].sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        const story = stories(api).get(storyId) as unknown as Story;
        // A story argues a change on a policy question; a law taking effect
        // is also read and remembered with no side to take, so a reader can
        // bring up the law in town.
        if (!story.topic || (!story.desiredChange && !story.facts.lawId))
          continue;
        api.emit({
          id: `${NEWS_READ}:${story.id}:${api.state.date}`,
          date: api.state.date,
          kind: NEWS_READ,
          personIds: [],
          witnessIds: ids.filter((id) => api.state.people.get(id)?.alive),
          placeId: story.placeId,
          topic: story.topic,
          desiredChange: story.desiredChange,
          ...(story.moodImpulse === undefined
            ? {}
            : { moodImpulse: story.moodImpulse }),
          facts: { ...story.facts, learnedFrom: newsKey(story.id) },
          source: {
            tag: "SOURCED",
            citation: `Story ${story.id}, read by its outlet's followers`,
            asOf: api.state.date,
          },
        });
      }
    },
  };
}

export const newsModule: CoreModule = createNewsModule();
