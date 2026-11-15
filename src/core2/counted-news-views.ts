/** Actual policy-story delivery uses the views engine on weighted adults. */
import { ageOnDate, dateAtAge, makeIsoDate } from "./kernel/dates";
import { registerDerivedCache } from "./snapshot";
import { residentsRuntime } from "./modules/residents";
import {
  countedEngagement,
  countedGroupViewOn,
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
        /** The day the first minor of the group turns of voting age; the adult sums change then. */
        adultAt?: string;
        /** Every member in the group's order, so a birthday moves only the age maps. */
        rows?: readonly { b: string; w: number; counted: boolean }[];
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
    // A birthday that makes no one an adult moves only the age maps: the
    // counted adults, their lean, engagement and traits are the same people
    // in the same order, so those sums are kept and the maps are read again
    // from the members' birth dates, in the same order as a full rebuild.
    if (
      cached?.value &&
      cached.rows &&
      cached.revision === revision &&
      cached.date <= api.state.date &&
      (!cached.adultAt || api.state.date < cached.adultAt)
    ) {
      const adult = api.parameter("votingAge");
      const byAge = new Map<number, number>();
      const audienceByAge = new Map<number, number>();
      let next: string | undefined;
      for (const row of cached.rows) {
        const age = ageOnDate(row.b, api.state.date);
        const birthday = dateAtAge(makeIsoDate(row.b), Math.max(0, age + 1));
        if (!next || birthday < next) next = birthday;
        if (age < adult) continue;
        audienceByAge.set(age, (audienceByAge.get(age) ?? 0) + row.w);
        if (!row.counted) continue;
        byAge.set(age, (byAge.get(age) ?? 0) + row.w);
      }
      const value: CountedNewsGroup = { ...cached.value, byAge, audienceByAge };
      entries.set(group.id, {
        revision,
        date: api.state.date,
        expires: next,
        value,
        adultAt: cached.adultAt,
        rows: cached.rows,
      });
      groups.push(value);
      continue;
    }
    let expires: string | undefined;
    let count = 0,
      lean = 0,
      engagement = 0,
      audienceCount = 0;
    let adultAt: string | undefined;
    const rows: { b: string; w: number; counted: boolean }[] = [];
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
        rows.push({
          b: voter.birthDate,
          w: weight,
          counted: !api.state.people.has(voter.id),
        });
        if (age < api.parameter("votingAge")) {
          const turns = dateAtAge(
            makeIsoDate(voter.birthDate),
            api.parameter("votingAge"),
          );
          if (!adultAt || turns < adultAt) adultAt = turns;
          continue;
        }
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
      entries.set(group.id, {
        revision,
        date: api.state.date,
        expires,
        adultAt,
        rows,
      });
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
    entries.set(group.id, {
      revision,
      date: api.state.date,
      expires,
      value,
      adultAt,
      rows,
    });
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
/** The counted group a household stands in, as the news and crime rows name it (a filled-in household keeps its last group). */
function householdGroupId(
  api: CoreAPI,
  householdId: string,
): string | undefined {
  const store = residentsRuntime(api.state as CoreState)?.store;
  const ix = store?.householdOf.get(householdId);
  const h = ix === undefined ? undefined : store!.households[ix];
  const group = h && h.group >= 0 ? store!.groups[h.group] : undefined;
  return group ? groupPersonId(group.id) : undefined;
}

/**
 * The stance a counted voter holds from what their group has heard or lived
 * since the opening: the group's row in countedStances, the mean of its
 * members' moves, so each member holds it (one model, two tiers). None for
 * anyone not counted.
 */
export function countedGroupStance(
  api: CoreAPI,
  personId: string,
  question: string,
): Stance | undefined {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return undefined;
  const store = residentsRuntime(api.state as CoreState)?.store;
  const m = store?.countedMember(personId);
  if (m === undefined) return undefined;
  const h = store!.households[store!.household[m]!];
  const group = h && h.group >= 0 ? store!.groups[h.group] : undefined;
  return group
    ? countedStanceRow(api, groupPersonId(group.id), question)
    : undefined;
}

/**
 * The stance rows a household's group held when it was filled in: what each
 * of its adults starts from as a full person, as they held it while counted.
 */
export function countedStancesOfHousehold(
  api: CoreAPI,
  householdId: string,
): readonly Stance[] {
  const id = householdGroupId(api, householdId);
  if (!id || !api.state.modules.has(VIEWS_MODULE_ID)) return [];
  return api
    .moduleState(VIEWS_MODULE_ID)
    .table("countedStances")
    .query("byGroup", [id]) as unknown as readonly Stance[];
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

/** One month's victimizations of one counted group, as the crime engine tallied them. */
export interface CountedCrimeTally {
  /** The question the crime ties to (`livedQuestion` of the victimization's kind). */
  readonly question: string;
  /** The tally row (crime's `tallies` table): what the moved stance cites. */
  readonly tallyId: string;
  /** The crime engine's unit: the resident group's id. */
  readonly groupId: string;
  /** The crime's kind (burglary, assault ...), for the stance's cause. */
  readonly type: string;
  /** Whole victimizations of the group this month, from the owed-share order. */
  readonly count: number;
  /** A crime against one person (assault, robbery) or a whole household. */
  readonly againstPerson: boolean;
  /** The group's households, by weight, as the crime engine counted them. */
  readonly households: number;
}

/**
 * A counted group lives the crimes the crime engine tallied for it, by the
 * full victim's rule (the views engine's `onEvent` for a lived condition):
 * each victim takes it as a reason for the side their own view already
 * holds on the question the crime ties to, at full size and nearness (it
 * happened to them). The group's stance is its members' mean, so the
 * victims move it by the share of the group's counted adults they are: one
 * person for a crime against a person, the group's adults per household for
 * one against a household. No member is chosen; a share under one adult is
 * a small exposure. The stance cites the tally row.
 */
export function liveCountedCrime(api: CoreAPI, tally: CountedCrimeTally): void {
  const question = tally.question;
  if (tally.count <= 0 || tally.households <= 0) return;
  const id = groupPersonId(tally.groupId);
  const group = countedNewsGroups(api).find((row) => row.id === id);
  if (!group || group.count <= 0) return;
  const prior = countedStanceRow(api, group.id, question);
  const current = countedGroupViewOn(api, group.lean, question, prior);
  if (current === 0) return;
  const desiredChange = current > 0 ? "enact" : "repeal";
  const reached = tally.againstPerson
    ? tally.count
    : (tally.count * group.count) / tally.households;
  const stance = stanceAfterCase(api, {
    view: group,
    hearer: group,
    prior,
    event: { id: `${tally.tallyId}:${tally.type}`, date: api.state.date },
    topic: question,
    desiredChange,
    size: 1,
    nearness: 1,
    learnedFrom: tally.tallyId,
    keepCauses: false,
    exposure: Math.min(1, reached / group.count),
  });
  if (!stance) return;
  api
    .moduleState(VIEWS_MODULE_ID)
    .table("countedStances")
    .putOwned({
      ...stance,
      groupId: group.id,
      representedCount: group.count,
      reachedCount: Math.min(group.count, reached),
      totalChange:
        ((stance.desiredChange === desiredChange ? 1 : -1) * stance.strength -
          (prior
            ? (prior.desiredChange === desiredChange ? 1 : -1) * prior.strength
            : 0)) *
        group.count,
    });
}
