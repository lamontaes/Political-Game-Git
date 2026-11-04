/** Actual policy-story delivery uses the views engine on weighted adults. */
import { ageOnDate, dateAtAge, makeIsoDate } from "./kernel/dates";
import { registerDerivedCache } from "./snapshot";
import { residentsRuntime } from "./modules/residents";
import {
  countedEngagement,
  countedLean,
  stanceAfterCase,
  standingWith,
  VIEWS_MODULE_ID,
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
  readonly audienceCount: number;
  readonly audienceByAge: ReadonlyMap<number, number>;
}

const groupsCache = new WeakMap<
  object,
  {
    store: object;
    key: string;
    groups: CountedNewsGroup[];
    entries: Map<
      string,
      {
        revision: number;
        date: string;
        expires?: string;
        value?: CountedNewsGroup;
      }
    >;
  }
>();
registerDerivedCache(groupsCache);
const groupPersonId = (id: string) => `counted-news:${id}`;

/** Read packed members only when their group changed or a birthday is due. */
export function countedNewsGroups(api: CoreAPI): readonly CountedNewsGroup[] {
  const store = residentsRuntime(api.state as CoreState)?.store;
  if (!store) return [];
  const key = `${api.state.date}:${store.groupsVersion}`;
  const previous = groupsCache.get(api.state);
  const held = previous?.store === store ? previous : undefined;
  if (held?.key === key) return held.groups;
  const entries = held?.entries ?? new Map();
  const groups: CountedNewsGroup[] = [];
  for (const group of store.groups) {
    const revision = store.groupReadRevision(group.index);
    const cached = entries.get(group.id);
    if (
      cached &&
      cached.revision === revision &&
      cached.date <= api.state.date &&
      (!cached.expires || api.state.date < cached.expires)
    ) {
      if (cached.value) groups.push(cached.value);
      continue;
    }
    let expires: string | undefined;
    let count = 0,
      lean = 0,
      engagement = 0,
      audienceCount = 0;
    const traits: Record<string, number> = {};
    const byAge = new Map<number, number>();
    const audienceByAge = new Map<number, number>();
    for (const hix of group.households) {
      const h = store.households[hix]!;
      const weight = store.weightOf(h);
      for (const m of store.countedMembers(h)) {
        const voter = store.factsOf(m);
        const age = ageOnDate(voter.birthDate, api.state.date);
        const birthday = dateAtAge(
          makeIsoDate(voter.birthDate),
          Math.max(0, age + 1),
        );
        if (!expires || birthday < expires) expires = birthday;
        if (age < api.parameter("votingAge")) continue;
        audienceCount += weight;
        audienceByAge.set(age, (audienceByAge.get(age) ?? 0) + weight);
        // Retained people keep their own history. Until their transfer is
        // wired, their audience share stays unallocated, never given away.
        if (api.state.people.has(voter.id)) continue;
        count += weight;
        byAge.set(age, (byAge.get(age) ?? 0) + weight);
        lean += countedLean(api, voter) * weight;
        engagement += countedEngagement(api, voter) * weight;
        // Packed traits are inherited getters, so Object.entries is empty.
        for (const kind of store.traitNames)
          traits[kind] =
            (traits[kind] ?? 0) + (voter.traits[kind] ?? 0) * weight;
      }
    }
    if (audienceCount <= 0) {
      entries.set(group.id, { revision, date: api.state.date, expires });
      continue;
    }
    for (const kind of Object.keys(traits)) traits[kind]! /= count || 1;
    const value: CountedNewsGroup = {
      id: groupPersonId(group.id),
      placeId: group.placeId,
      count,
      byAge,
      lean: lean / (count || 1),
      engagement: engagement / (count || 1),
      traits,
      audienceCount,
      audienceByAge,
    };
    entries.set(group.id, { revision, date: api.state.date, expires, value });
    groups.push(value);
  }
  groupsCache.set(api.state, { store, key, groups, entries });
  return groups;
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
/** The existing press question reader consumes the groups' heard strength. */
export function countedNewsConcern(
  api: CoreAPI,
  placeId: string,
  topic: string,
): number {
  let strength = 0;
  for (const group of countedNewsGroups(api))
    if (group.placeId === placeId)
      strength +=
        group.count * (countedStanceRow(api, group.id, topic)?.strength ?? 0);
  return strength;
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
  const { group } = audience;
  const reached = Math.min(group.count, audience.reached);
  if (!event.topic || !event.desiredChange || reached <= 0 || group.count <= 0)
    return;
  const exposure = Math.min(1, reached / group.count);
  const impulse =
    Math.abs(event.moodImpulse ?? 0) + Math.max(0, event.stressImpulse ?? 0);
  const prior = countedStanceRow(api, group.id, event.topic);
  const stance = stanceAfterCase(api, {
    view: group,
    hearer: group,
    prior,
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
      // Signed movement toward this story, including the stance limit.
      totalChange:
        ((stance.desiredChange === event.desiredChange ? 1 : -1) *
          stance.strength -
          (prior
            ? (prior.desiredChange === event.desiredChange ? 1 : -1) *
              prior.strength
            : 0)) *
        group.count,
    });
}
