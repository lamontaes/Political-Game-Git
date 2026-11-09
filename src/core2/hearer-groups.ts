/**
 * Hearers nobody watches, heard as groups (owner, Nov 9: "not to track
 * everything at every day"; design `docs/speed/off-screen-campaigns-as-results.md`,
 * stage 1 step 1). A case made to an audience (a speech) reaches each watched
 * hearer as a person, through the views engine's `onEvent`. Everyone else in
 * the audience is a full person nobody is looking at: they are applied once
 * per group of like hearers (the same place, lean, age band and how readily
 * they yield to an argument), with the same rule a counted group is moved by
 * (`stanceAfterCase` with an exposure), and each member's view reads the
 * group's stance (`groupShift` in `stanceOn`). Watched means the player, their
 * household and circle, anyone in focus (`keepsWhy`), a state or federal
 * official, or someone with a tie to the speaker; they stay individual.
 *
 * A person joins the group they are first heard in and keeps it, so their
 * read is one row. A group's stance is the mean of its members' shifts: each
 * case moves it by the share of members who heard it.
 */
import { ageOnDate } from "./kernel/dates";
import { pairKey } from "./kernel/ids";
import { decisionLean } from "./trait-decisions";
import { keepsWhy } from "./why-kept";
import {
  ageBand,
  stanceAfterCase,
  standingWith,
  viewOf,
  VIEWS_MODULE_ID,
  type PersonView,
  type Stance,
} from "./modules/views";
import type { CoreAPI, CoreEventInput, CoreState, PersonId } from "./types";

/** The officials engine's store (state and federal seats), read by id. */
const OFFICIALS_STORE = "core2-officials-v1";

export interface HearerGroupRow {
  readonly id: string;
  readonly placeId: string;
  /** Full people who joined the group, all time. */
  readonly count: number;
}

/**
 * Whether a hearer stays a person for this speaker: watched by the player
 * (`keepsWhy`), holding a state or federal seat, or tied to the speaker.
 */
export function hearsAsPerson(
  api: CoreAPI,
  personId: PersonId,
  speakerId: string,
): boolean {
  const state = api.state as CoreState;
  if (state.playerId === undefined || keepsWhy(state, personId)) return true;
  if (
    api.state.modules.has(OFFICIALS_STORE) &&
    api.moduleState(OFFICIALS_STORE).table("officials").get(personId)
  )
    return true;
  return api.state.relationships.has(pairKey(personId, speakerId));
}

function groupKeyOf(api: CoreAPI, personId: PersonId, view: PersonView) {
  const person = api.state.people.get(personId)!;
  const yields = decisionLean(
    api.state,
    person,
    "views.persuasion",
    "yield",
    "resist",
  );
  return [
    "hg",
    person.placeId,
    Math.round(view.lean),
    ageBand(ageOnDate(person.birthDate, api.state.date)),
    Math.round(yields * 2),
  ].join(":");
}

/** The group a person is heard in: the one they were first heard in. */
function joinGroup(api: CoreAPI, personId: PersonId, view: PersonView): string {
  const store = api.moduleState(VIEWS_MODULE_ID);
  const held = store.table("groupHearers").get(personId) as unknown as
    { groupId: string } | undefined;
  if (held) return held.groupId;
  const groupId = groupKeyOf(api, personId, view);
  const groups = store.table("hearerGroups");
  const group = groups.get(groupId) as unknown as HearerGroupRow | undefined;
  groups.put({
    id: groupId,
    placeId: api.state.people.get(personId)!.placeId,
    count: (group?.count ?? 0) + 1,
  } as unknown as { id: string });
  store
    .table("groupHearers")
    .put({ id: personId, groupId } as unknown as { id: string });
  return groupId;
}

export interface GroupCase {
  readonly event: Pick<CoreEventInput, "id" | "date">;
  readonly speakerId: string;
  readonly countedSpeakerLean?: number;
  readonly topic: string;
  readonly desiredChange: string;
  readonly size: number;
}

/**
 * Apply one case to unwatched hearers, once per group of like hearers. Returns
 * how many hearers each group took it for (by group id), for the caller's
 * record.
 */
// stopgapId: SG-SPEED-hearer-groups (joiners take the group mean; no retelling at home for grouped hearers)
export function hearAsGroups(
  api: CoreAPI,
  heard: GroupCase,
  hearerIds: readonly PersonId[],
): Map<string, number> {
  const byGroup = new Map<
    string,
    {
      lean: number;
      engagement: number;
      traits: Record<string, number>;
      n: number;
    }
  >();
  for (const personId of hearerIds) {
    const view = viewOf(api, personId);
    const person = api.state.people.get(personId);
    if (!view || !person) continue;
    const groupId = joinGroup(api, personId, view);
    let sums = byGroup.get(groupId);
    if (!sums) {
      sums = { lean: 0, engagement: 0, traits: {}, n: 0 };
      byGroup.set(groupId, sums);
    }
    sums.lean += view.lean;
    sums.engagement += view.engagement;
    for (const kind in person.traits)
      sums.traits[kind] = (sums.traits[kind] ?? 0) + person.traits[kind]!;
    sums.n += 1;
  }
  const store = api.moduleState(VIEWS_MODULE_ID);
  const out = new Map<string, number>();
  for (const [groupId, sums] of byGroup) {
    const group = store
      .table("hearerGroups")
      .get(groupId) as unknown as HearerGroupRow;
    const traits: Record<string, number> = {};
    for (const kind in sums.traits) traits[kind] = sums.traits[kind]! / sums.n;
    const view = {
      id: groupId,
      lean: sums.lean / sums.n,
      engagement: sums.engagement / sums.n,
    };
    const hearer = { traits };
    const prior = store
      .table("groupStances")
      .get(`${groupId}:${heard.topic}`) as unknown as Stance | undefined;
    const stance = stanceAfterCase(api, {
      view,
      hearer,
      prior,
      event: heard.event,
      topic: heard.topic,
      desiredChange: heard.desiredChange,
      size: heard.size,
      nearness: standingWith(
        api,
        view,
        heard.speakerId,
        heard.topic,
        heard.desiredChange,
        hearer,
        heard.countedSpeakerLean,
      ),
      speakerId: heard.speakerId,
      keepCauses: false,
      exposure: Math.min(1, sums.n / group.count),
    });
    out.set(groupId, sums.n);
    if (!stance) continue;
    store.table("groupStances").putOwned({
      ...stance,
      groupId,
      memberCount: group.count,
      heardCount: sums.n,
    } as unknown as { id: string });
  }
  return out;
}

/** A group's stance on a topic, for a test or a screen that opens it. */
export function groupStance(
  api: CoreAPI,
  groupId: string,
  topic: string,
): Stance | undefined {
  return api
    .moduleState(VIEWS_MODULE_ID)
    .table("groupStances")
    .get(`${groupId}:${topic}`) as unknown as Stance | undefined;
}
