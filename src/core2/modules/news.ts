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
import { addDays, makeIsoDate } from "../kernel/dates";
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
import { believesClaim, claimFit } from "../heard-claims";
import {
  decisionLean,
  decisionTraitWeight,
  reportOutcome,
  traitProbe,
} from "../trait-decisions";
import { VIEWS_SPEAKER_KEY, viewOf, viewOn } from "./views";
import { conditionQuestions, measureOfFactKey } from "../outcome-news";

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
  const lean = teller ? passOnLean(api, teller) : api.parameter("zero");
  const term = decisionTraitWeight(api.state, "news.pass-on") * lean;
  // The audit's probe (off in play) sees the stories owed with and without the trait term.
  if (teller && traitProbe()?.outcome)
    reportOutcome("news.pass-on", teller.id, lean, "size", (withTerm) =>
      owedStories(api, withTerm ? term : api.parameter("zero")),
    );
  return owedStories(api, term);
}

/** The usual stories owed at a contact, times one plus the trait term, never below none. */
function owedStories(api: CoreAPI, traitTerm: number): number {
  return (
    n(api, "newsStoriesPerContact") *
    Math.max(api.parameter("zero"), api.parameter("one") + traitTerm)
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

/**
 * The story a read event is about: its id is `news.read:<story id>:<date>`,
 * or `news.read:<story id>:<date>:<side>:<question>` for the readers of a
 * story about a moved condition who hold one side on one question.
 */
export function storyOfReadEvent(eventId: string): string | null {
  if (!eventId.startsWith(`${NEWS_READ}:`)) return null;
  const read = /^(.+?):\d{4}-\d{2}-\d{2}(?::(?:enact|repeal):.+)?$/.exec(
    eventId.slice(NEWS_READ.length + 1),
  );
  return read ? read[1]! : null;
}

const stories = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("stories");
const deliveries = (api: CoreAPI) =>
  api.moduleState(NEWS_MODULE_ID).table("deliveries");
const heard = (api: CoreAPI) => api.moduleState(NEWS_MODULE_ID).table("heard");

/**
 * Engines that act the moment a person hears a story: the price engine ties
 * a price change the person's household already paid to the law the story
 * names. A listener returns at once for a story it does not concern.
 */
type HeardListener = (api: CoreAPI, personId: PersonId, story: Story) => void;
const heardListeners: HeardListener[] = [];
export function onStoryHeard(listener: HeardListener): void {
  if (!heardListeners.includes(listener)) heardListeners.push(listener);
}
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

/** One person's recent hearing: entries newest first, and their ids. */
interface Recent {
  list: HeardEntry[];
  ids: Set<string>;
  /** The cutoff the list was last pruned to. */
  since: string;
  /** No entry was heard before this date (a bound, exact after a full prune). */
  oldestHeard?: string;
}

/** Newest story first, then by id: the order telling reads them in. */
const newestFirst = (a: HeardEntry, b: HeardEntry) =>
  b.storyDate.localeCompare(a.storyDate) || a.storyId.localeCompare(b.storyId);

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
      since: "",
      oldestHeard: entry.heardDate,
    });
    return;
  }
  // Into its place, after any equal entry, as a stable sort would put it.
  const list = recent.list;
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (newestFirst(list[mid]!, entry) > 0) high = mid;
    else low = mid + 1;
  }
  list.splice(low, 0, entry);
  recent.ids.add(entry.storyId);
  if (recent.oldestHeard === undefined || entry.heardDate < recent.oldestHeard)
    recent.oldestHeard = entry.heardDate;
}

/**
 * The person's recent entries pruned to `since`, newest first: what telling
 * walks, the same stories in the same order as `storiesHeard` up to its first
 * story older than the story life. A story is fetched only when it is told.
 */
function recentList(
  api: CoreAPI,
  personId: PersonId,
  since: string,
): HeardEntry[] {
  const recent = recentOf(api).get(personId);
  if (!recent) return [];
  // Days only move forward, so what is too old now stays too old.
  if (recent.since !== since) {
    const list = recent.list;
    if (recent.oldestHeard === undefined || recent.oldestHeard >= since) {
      // Everyone's entries were heard since the cutoff: only stories older
      // than it go, and they are the list's tail.
      while (list.length && list[list.length - 1]!.storyDate < since)
        recent.ids.delete(list.pop()!.storyId);
    } else {
      recent.list = list.filter(
        (row) => row.heardDate >= since && row.storyDate >= since,
      );
      recent.ids = new Set(recent.list.map((row) => row.storyId));
      recent.oldestHeard = undefined;
      for (const row of recent.list)
        if (
          recent.oldestHeard === undefined ||
          row.heardDate < recent.oldestHeard
        )
          recent.oldestHeard = row.heardDate;
    }
    recent.since = since;
  }
  return recent.list;
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
  /** The day they heard it: today, or an earlier day for a story of the past. */
  on: string = api.state.date,
): boolean {
  const id = `${personId}:${story.id}`;
  const heardTable = heard(api);
  if (heardTable.get(id)) return false;
  heardTable.put({ id, personId, storyId: story.id, date: on });
  addRecent(recentOf(api), personId, {
    storyId: story.id,
    storyDate: story.date,
    heardDate: on,
  });
  const counts = countsOf(api);
  counts.set(
    personId,
    (counts.get(personId) ?? api.parameter("zero")) + api.parameter("one"),
  );
  const key = newsKey(story.id);
  api.observe(personId, {
    key,
    value: story.kind,
    learnedAt: on,
    sourceId,
    access,
  });
  api.observe(personId, {
    key: `${key}:outlet`,
    value: story.outletId,
    learnedAt: on,
    sourceId,
    access,
  });
  for (const [factKey, value] of Object.entries(story.facts))
    api.observe(personId, {
      key: factKey,
      value,
      learnedAt: on,
      sourceId,
      access,
    });
  for (const key of Object.keys(story.facts)) {
    const measure = measureOfFactKey(key);
    const row = `${story.placeId}:${measure}`;
    if (measure && !delivered(api).get(row))
      delivered(api).put({
        id: row,
        storyId: story.id,
        date: on,
        personId,
      });
  }
  for (const listener of heardListeners) listener(api, personId, story);
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

/**
 * How many days after a story is printed a reader reads it, by their habits
 * and trust; null if they never do. The one delivery rule, for today's news
 * and the news of the years before the start.
 */
export function readingDelay(api: CoreAPI, personId: PersonId): number | null {
  const view = viewOf(api, personId);
  const engagement = view?.engagement ?? api.parameter("zero");
  if (engagement <= api.parameter("zero")) return null;
  // People who trust the media less check it less, and hear later.
  const reach =
    engagement * (trustOf(api, view!.lean) / n(api, "newsTrustAverage"));
  const exact = Math.ceil(n(api, "newsOutletDelayDays") / reach);
  return exact > n(api, "newsMaxAgeDays") ? null : exact;
}

/**
 * Schedules a story's delivery to each reader by their habits and trust. A
 * reading day already past (a story printed before the start) is heard on
 * that day at once; `atOnce` readers (the story's own subject) hear it the
 * day it happened.
 */
function scheduleDeliveries(
  api: CoreAPI,
  story: Story,
  readerIds: Iterable<PersonId>,
  skip: ReadonlySet<PersonId>,
  atOnce: ReadonlySet<PersonId> = new Set(),
): number {
  let scheduled = 0;
  const maxAge = n(api, "newsMaxAgeDays");
  for (const personId of readerIds) {
    if (skip.has(personId)) continue;
    const exact = atOnce.has(personId) ? 0 : readingDelay(api, personId);
    if (exact === null) continue;
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
    const date = addDays(
      makeIsoDate(story.date),
      atOnce.has(personId) ? 0 : delay,
    );
    if (date < api.state.date)
      hear(api, personId, story, "public", story.id, date);
    else
      deliveries(api).put({
        id: `${story.id}:${personId}`,
        storyId: story.id,
        personId,
        date,
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
  /** Readers who hear it the day it happened (its own subject). */
  atOnce: readonly PersonId[] = [],
): number {
  // A world without news keeps the press's own record of the story only.
  if (!api.state.modules.has(NEWS_MODULE_ID) || stories(api).get(story.id))
    return 0;
  stories(api).put(story as unknown as { id: string });
  return scheduleDeliveries(api, story, readerIds, new Set(), new Set(atOnce));
}

/**
 * The news module. `tellable` lists the stories a teller can pass on, each
 * by its id and date, newest first; tests swap in the full rescan
 * (`storiesHeard`) to check both tell the same.
 */
export function createNewsModule(
  tellable: (
    api: CoreAPI,
    personId: PersonId,
    since: string,
  ) => Iterable<{
    readonly storyId: string;
    readonly storyDate: string;
  }> = recentList,
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
      const recents = recentOf(api);
      const refusals = refused(api);
      const table = stories(api);
      const maxAge = n(api, "newsMaxAgeDays");
      // A story still fresh today was heard on or after its own date, so only
      // what the teller heard within the story life is read (same order).
      const since = addDays(makeIsoDate(api.state.date), -maxAge);
      const { actorId, otherId } = notice;
      // Each tells the other in turn, the actor first.
      for (let turn = 0; turn < 2; turn++) {
        const teller = turn === 0 ? actorId : otherId;
        const listener = turn === 0 ? otherId : actorId;
        // How many stories they pass on leans on every trait they have.
        const tellerPerson = api.state.people.get(teller);
        const toTell = storiesToTell(
          api,
          teller,
          storiesOwedAtContact(api, tellerPerson),
        );
        // Nothing owed at this contact: the telling would stop at once.
        if (toTell <= api.parameter("zero")) continue;
        // Whether the listener takes a told story in is theirs to decide:
        // the benefit of the doubt, more for a teller they are close to and
        // a story that argues as they already lean, against their own lean
        // toward doubting. Decided once for each side a story argues.
        const listenerPerson = api.state.people.get(listener);
        const believed = new Map<string, boolean>();
        let passed = api.parameter("zero");
        for (const entry of tellable(api, teller, since)) {
          if (passed >= toTell || entry.storyDate < since) break;
          // Already heard: hear() would refuse it too, without the lookup.
          if (recents.get(listener)?.ids.has(entry.storyId)) continue;
          const refusal = `${listener}:${entry.storyId}`;
          if (refusals.has(refusal)) continue;
          const story = table.get(entry.storyId) as unknown as Story;
          const side = `${story.topic ?? ""}|${story.desiredChange ?? ""}`;
          let believes = believed.get(side);
          if (believes === undefined) {
            believes = listenerPerson
              ? believesClaim(api.state, listenerPerson, {
                  tellerId: teller,
                  fit: claimFit(
                    api,
                    listenerPerson,
                    story.topic,
                    story.desiredChange,
                  ),
                })
              : true;
            believed.set(side, believes);
          }
          if (!believes) {
            // Told, and not taken in; the paper can still reach them.
            refusals.add(refusal);
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
      // stopgapId: SG-PEOPLE-counted-readers-stories (an outlet's counted followers are a count at delivery; their groups' views do not move)
      for (const [storyId, ids] of [...readers].sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        const story = stories(api).get(storyId) as unknown as Story;
        const alive = ids.filter((id) => api.state.people.get(id)?.alive);
        const read = (
          id: string,
          topic: string,
          desiredChange: string | undefined,
          witnessIds: readonly PersonId[],
          facts: Readonly<Record<string, string>>,
        ) =>
          api.emit({
            id,
            date: api.state.date,
            kind: NEWS_READ,
            personIds: [],
            witnessIds: [...witnessIds],
            placeId: story.placeId,
            topic,
            desiredChange,
            ...(story.moodImpulse === undefined
              ? {}
              : { moodImpulse: story.moodImpulse }),
            facts: { ...facts, learnedFrom: newsKey(story.id) },
            source: {
              tag: "SOURCED",
              citation: `Story ${story.id}, read by its outlet's followers`,
              asOf: api.state.date,
            },
          });
        // A month's move in the town's conditions argues no change of its
        // own: each reader takes each condition it reports as a reason for
        // the side their own view already holds on the question that
        // condition ties to. A reader with no side on a
        // question has none to strengthen. The readers already hold the
        // story's facts; what they take from reading it is its source, whose
        // case it was and which outlet printed it (what they can bring up).
        const questions = story.desiredChange
          ? []
          : conditionQuestions(story.facts);
        if (questions.length) {
          const zero = api.parameter("zero");
          const carried = Object.fromEntries(
            Object.entries(story.facts).filter(
              ([key]) =>
                key === VIEWS_SPEAKER_KEY ||
                (key.startsWith("printed:") && key.endsWith(":story")),
            ),
          );
          for (const question of questions) {
            const sides = new Map<string, PersonId[]>();
            for (const id of alive) {
              const view = viewOf(api, id);
              const current = view
                ? viewOn(api, id, question, view.lean)
                : zero;
              if (current === zero) continue;
              const side = current > zero ? "enact" : "repeal";
              sides.set(side, [...(sides.get(side) ?? []), id]);
            }
            for (const [side, witnessIds] of [...sides].sort((a, b) =>
              a[0].localeCompare(b[0]),
            ))
              read(
                `${NEWS_READ}:${story.id}:${api.state.date}:${side}:${question}`,
                question,
                side,
                witnessIds,
                carried,
              );
          }
          continue;
        }
        // A story argues a change on a policy question; a law taking effect
        // is also read and remembered with no side to take, so a reader can
        // bring up the law in town.
        if (!story.topic || (!story.desiredChange && !story.facts.lawId))
          continue;
        read(
          `${NEWS_READ}:${story.id}:${api.state.date}`,
          story.topic,
          story.desiredChange,
          alive,
          story.facts,
        );
      }
    },
  };
}

export const newsModule: CoreModule = createNewsModule();
