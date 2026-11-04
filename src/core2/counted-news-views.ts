/** Counted audiences use the views engine's heard-case rule on group fields. */
import { coreAPI } from "./state";
import { inheritCountedStory } from "./modules/news";
import { ageOnDate } from "./kernel/dates";
import {
  residentsRuntime,
  registerCountedGroupMoveListener,
  registerCountedFillInListener,
  registerCountedWeightReleaseListener,
} from "./modules/residents";
import {
  loadingShift,
  personStance,
  countedEngagement,
  countedLean,
  countedOpeningStanceProfile,
  stanceAfterCase,
  standingWith,
  VIEWS_MODULE_ID,
  VIEWS_DATA,
  type Stance,
} from "./modules/views";
import type { CoreAPI, CoreEventInput, CoreState, PersonState } from "./types";

export interface CountedNewsGroup {
  readonly id: string;
  readonly placeId: string;
  readonly count: number;
  readonly byAge: ReadonlyMap<number, number>;
  readonly lean: number;
  readonly engagement: number;
  readonly traits: PersonState["traits"];
  readonly faithFromAverage?: number;
  readonly collegeFromAverage?: number;
}

const groupsCache = new WeakMap<
  object,
  { key: string; groups: CountedNewsGroup[] }
>();
const groupPersonId = (id: string) => `counted-news:${id}`;

/** The group's current fields, read from the existing packed members once a day. */
export function countedNewsGroups(api: CoreAPI): readonly CountedNewsGroup[] {
  installCountedNewsTransfers();
  const store = residentsRuntime(api.state as CoreState)?.store;
  if (!store) return [];
  const key = `${api.state.date}:${store.version}:${api.state.people.size}`;
  const held = groupsCache.get(api.state);
  if (held?.key === key) return held.groups;
  const groups: CountedNewsGroup[] = [];
  for (const group of store.groups) {
    let count = 0,
      lean = 0,
      engagement = 0,
      faith = 0,
      college = 0;
    const traits: Record<string, number> = {};
    const byAge = new Map<number, number>();
    for (const hix of group.households) {
      const h = store.households[hix]!;
      const weight = store.weightOf(h);
      for (const m of store.countedMembers(h)) {
        const voter = store.factsOf(m);
        // A demoted full person retains their own news and stance records.
        // They must not also receive the counted audience's move.
        if (api.state.people.has(voter.id)) continue;
        const age = ageOnDate(voter.birthDate, api.state.date);
        if (age < api.parameter("votingAge")) continue;
        count += weight;
        byAge.set(age, (byAge.get(age) ?? 0) + weight);
        lean += countedLean(api, voter) * weight;
        engagement += countedEngagement(api, voter) * weight;
        const profile = countedOpeningStanceProfile(api, voter);
        faith += (profile.faithFromAverage ?? 0) * weight;
        college += (profile.collegeFromAverage ?? 0) * weight;
        for (const [kind, value] of Object.entries(voter.traits))
          traits[kind] = (traits[kind] ?? 0) + value * weight;
      }
    }
    if (count <= 0) continue;
    for (const kind of Object.keys(traits)) traits[kind]! /= count;
    groups.push({
      id: groupPersonId(group.id),
      placeId: group.placeId,
      count,
      byAge,
      lean: lean / count,
      engagement: engagement / count,
      traits,
      faithFromAverage: faith / count,
      collegeFromAverage: college / count,
    });
  }
  groupsCache.set(api.state, { key, groups });
  return groups;
}

/** The existing group that currently holds a counted member, or held a fill-in. */
export function countedNewsGroupId(
  api: CoreAPI,
  personId: string,
): string | undefined {
  const store = residentsRuntime(api.state as CoreState)?.store;
  const m = store?.memberOf.get(personId);
  if (!store || m === undefined) return undefined;
  const h = store.households[store.household[m]!]!;
  const group = store.groups[h.group];
  return group ? groupPersonId(group.id) : undefined;
}

export function countedNewsStances(
  api: CoreAPI,
  personId: string,
): readonly Stance[] {
  // Full and demoted people already have their own history; fill-in copies once.
  if (api.state.people.has(personId)) return [];
  const id = countedNewsGroupId(api, personId);
  return id
    ? (api
        .moduleState(VIEWS_MODULE_ID)
        .table("countedStances")
        .query("byGroup", [id]) as unknown as Stance[])
    : [];
}

function countedStanceRow(
  api: CoreAPI,
  groupId: string,
  topic: string,
): Stance | undefined {
  return api
    .moduleState(VIEWS_MODULE_ID)
    .table("countedStances")
    .get(`${groupId}:${topic}`) as unknown as Stance | undefined;
}
function countedGroupShift(
  api: CoreAPI,
  groupId: string,
  topic: string,
): number {
  const row = countedStanceRow(api, groupId, topic);
  return row
    ? (row.desiredChange === "enact"
        ? 1
        : row.desiredChange === "repeal"
          ? -1
          : 0) *
        row.strength *
        VIEWS_DATA.parameters.stanceViewWeight!.value
    : 0;
}

/** The press reads actual group mass, alongside its full readers. */
export function countedNewsConcern(
  api: CoreAPI,
  placeId: string,
  topic: string,
): { count: number; strength: number } {
  let count = 0,
    strength = 0;
  for (const group of countedNewsGroups(api)) {
    if (group.placeId !== placeId) continue;
    count += group.count;
    strength +=
      group.count * (countedStanceRow(api, group.id, topic)?.strength ?? 0);
  }
  return { count, strength };
}

/** A condition story strengthens the side this group already holds. */
export function countedNewsSide(
  api: CoreAPI,
  group: CountedNewsGroup,
  question: string,
): string | undefined {
  const current =
    personStance(group.lean, question) +
    loadingShift(group, question) +
    countedGroupShift(api, group.id, question);
  return current > 0 ? "enact" : current < 0 ? "repeal" : undefined;
}

export interface CountedNewsAudience {
  readonly group: CountedNewsGroup;
  readonly reached: number;
}

/** Apply one actual delivery wave; no member is selected by a rate or a roll. */
export function hearCountedNews(
  api: CoreAPI,
  audience: CountedNewsAudience,
  event: Pick<
    CoreEventInput,
    "id" | "date" | "topic" | "desiredChange" | "moodImpulse" | "stressImpulse"
  >,
  speakerId: string | undefined,
  learnedFrom: string,
): void {
  const { group, reached } = audience;
  if (!event.topic || !event.desiredChange || reached <= 0 || group.count <= 0)
    return;
  const exposure = Math.min(1, reached / group.count);
  const impulse =
    Math.abs(event.moodImpulse ?? 0) + Math.max(0, event.stressImpulse ?? 0);
  const stance = stanceAfterCase(api, {
    view: group,
    hearer: group,
    prior: countedStanceRow(api, group.id, event.topic),
    event,
    topic: event.topic,
    desiredChange: event.desiredChange,
    size: impulse > 0 ? impulse : 1,
    nearness: speakerId
      ? standingWith(
          api,
          group,
          speakerId,
          event.topic,
          event.desiredChange,
          group,
        )
      : 1,
    speakerId,
    learnedFrom,
    keepCauses: false,
    exposure,
  });
  if (!stance) return;
  api
    .moduleState(VIEWS_MODULE_ID)
    .table("countedStances")
    .putOwned({
      ...stance,
      groupId: group.id,
      representedCount: group.count,
      reachedCount: reached,
      // A total can be checked against the one-reader move and the audience mass.
      totalChange: (stance.causes.at(-1)?.change ?? 0) * group.count,
    });
}

type InheritedStory = { learnedFrom: string; date: string };
// Synchronous handoff inside fillInPerson: the views are installed before
// other hooks read them; news knowledge is handed over after admission.
const pendingStories = new WeakMap<object, Map<string, InheritedStory[]>>();
export function installCountedNewsTransfers(): void {
  registerCountedGroupMoveListener(moveNewsViews);
  registerCountedFillInListener(prepareNewsFillIn);
  registerCountedWeightReleaseListener(prepareNewsWeightRelease);
}
function prepareNewsFillIn(
  core: CoreState,
  memberIds: readonly string[],
): void {
  if (!core.modules.has(VIEWS_MODULE_ID)) return;
  const api = coreAPI(core);
  const table = api.moduleState(VIEWS_MODULE_ID).table("stances");
  const countedTable = api.moduleState(VIEWS_MODULE_ID).table("countedStances");
  const pending =
    pendingStories.get(core) ?? new Map<string, InheritedStory[]>();
  pendingStories.set(core, pending);
  for (const personId of memberIds) {
    // Demoted full people retain their own news history. A new member of
    // a returning household is still copied: they have no full record yet.
    if (core.people.has(personId)) continue;
    const store = residentsRuntime(core)!.store;
    const m = store.countedMember(personId);
    if (
      m === undefined ||
      ageOnDate(store.born[m]!, core.date) < api.parameter("votingAge")
    )
      continue;
    const groupId = countedNewsGroupId(api, personId);
    if (!groupId) continue;
    const stories: InheritedStory[] = [];
    for (const stance of countedTable.query("byGroup", [
      groupId,
    ]) as unknown as Stance[]) {
      table.putOwned({
        id: `${personId}:${stance.topic}`,
        personId,
        topic: stance.topic,
        desiredChange: stance.desiredChange,
        strength: stance.strength,
        causes: stance.causes,
        ...(stance.heard ? { heard: stance.heard } : {}),
      });
      for (const cause of stance.causes)
        if (cause.learnedFrom)
          stories.push({ learnedFrom: cause.learnedFrom, date: cause.date });
    }
    if (stories.length) pending.set(personId, stories);
  }
}
/** News uses its normal knowledge writer after the core admits the household. */
export function fillInNewsViews(
  api: CoreAPI,
  memberIds: readonly string[],
): void {
  const pending = pendingStories.get(api.state);
  if (!pending) return;
  for (const personId of memberIds) {
    for (const story of pending.get(personId) ?? [])
      inheritCountedStory(api, personId, story.learnedFrom, story.date);
    pending.delete(personId);
  }
}

/** Regrouping carries the moved audience's existing mean, like its group money. */
function moveNewsViews(
  api: CoreAPI,
  householdId: string,
  fromGroup: string,
  toGroup: string,
): void {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return;
  const store = residentsRuntime(api.state as CoreState)?.store;
  const hix = store?.householdOf.get(householdId);
  if (!store || hix === undefined) return;
  const h = store.households[hix]!;
  const countAdults = (index: number) => {
    const home = store.households[index]!;
    return (
      store
        .countedMembers(home)
        .filter(
          (m) =>
            !api.state.people.has(store.ids[m]!) &&
            ageOnDate(store.born[m]!, api.state.date) >=
              api.parameter("votingAge"),
        ).length * store.weightOf(home)
    );
  };
  const moved = countAdults(hix);
  const group = store.groups[h.group]!;
  const total = [...group.households].reduce(
    (n, index) => n + countAdults(index),
    0,
  );
  if (moved <= 0 || total <= 0) return;
  blendNewsIntoGroup(
    api,
    groupPersonId(fromGroup),
    groupPersonId(toGroup),
    moved / total,
  );
}

function blendNewsIntoGroup(
  api: CoreAPI,
  fromGroup: string,
  toGroup: string,
  share: number,
): void {
  const table = api.moduleState(VIEWS_MODULE_ID).table("countedStances");
  const before = table.query("byGroup", [fromGroup]) as unknown as Stance[];
  const after = table.query("byGroup", [toGroup]) as unknown as Stance[];
  const oldByTopic = new Map(before.map((row) => [row.topic, row]));
  const topics = new Set([...before, ...after].map((row) => row.topic));
  const signed = (row?: Stance) =>
    row
      ? (row.desiredChange === "enact"
          ? 1
          : row.desiredChange === "repeal"
            ? -1
            : 0) * row.strength
      : 0;
  for (const topic of topics) {
    const from = oldByTopic.get(topic);
    const to = countedStanceRow(api, toGroup, topic);
    const value = signed(to) * (1 - share) + signed(from) * share;
    const heard = Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(from?.heard ?? {}),
          ...Object.keys(to?.heard ?? {}),
        ]),
      ].map((speaker) => [
        speaker,
        (to?.heard?.[speaker] ?? 0) * (1 - share) +
          (from?.heard?.[speaker] ?? 0) * share,
      ]),
    );
    const causes = [
      ...(to?.causes ?? []).map((cause) => ({
        ...cause,
        change: cause.change * (1 - share),
      })),
      ...(from?.causes ?? []).map((cause) => ({
        ...cause,
        change: cause.change * share,
      })),
    ]
      .filter((cause) => cause.change > 0)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId),
      )
      .slice(-1);
    const personId = toGroup;
    table.putOwned({
      id: `${personId}:${topic}`,
      personId,
      groupId: personId,
      topic,
      desiredChange: value >= 0 ? "enact" : "repeal",
      strength: Math.abs(value),
      heard,
      causes,
    });
  }
}

/** A sample's excess households can go to other groups when it is filled in. */
function prepareNewsWeightRelease(
  api: CoreAPI,
  householdId: string,
): (() => void) | undefined {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return;
  const store = residentsRuntime(api.state as CoreState)?.store;
  const hix = store?.householdOf.get(householdId);
  if (!store || hix === undefined) return;
  const home = store.households[hix]!;
  const origin = store.groups[home.group];
  if (!origin) return;
  const from = groupPersonId(origin.id);
  const before = new Map(
    countedNewsGroups(api)
      .filter((group) => group.placeId === home.placeId)
      .map((group) => [group.id, group.count]),
  );
  return () => {
    for (const group of countedNewsGroups(api)) {
      if (group.id === from || group.placeId !== home.placeId) continue;
      const gained = group.count - (before.get(group.id) ?? 0);
      if (gained > 0)
        blendNewsIntoGroup(api, from, group.id, gained / group.count);
    }
  };
}
