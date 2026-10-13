/**
 * Belonging to groups (BOARD, Oct 12: group kinds, gatherings). The town's
 * groups are public organizations from the IRS listing (`opening-groups.ts`).
 * On the first day each adult settles which kinds of group they already
 * belong to, through the core's one chooser: their sociability, how closely
 * they follow public life, their faith (a congregation), their own children
 * at home (a parent-teacher group) and their age weigh against staying out.
 * The national membership rates by kind check the totals; they decide no one.
 * Members know their group and each other.
 *
 * Each group gathers on its kind's schedule (a congregation weekly, a club
 * monthly). Each member weighs going against the evening's other uses through
 * the chooser, and those who go spend the gathering's hours with the fellow
 * members they are closest to, so ties grow and news passes there.
 */
import { COLLEGE_FACT_KIND, COLLEGE_STAGE } from "../opening-college";
import { ageOnDate, addDays, makeIsoDate } from "../../simulation/dates";
import { stableHash } from "../../simulation/ids";
import { decisionFromScores, scoreOffers } from "../choice";
import { PROFILE_FACT_KINDS, profileFor } from "../opening-profile";
import { GROUPS } from "../opening-groups";
import kindsJson from "../data/groups/membership.json" with { type: "json" };
import rows from "../data/groups/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
  Relationship,
} from "../types";
import { decisionKinds, decisionLean } from "../trait-decisions";
import { viewOf } from "./views";

export const GROUPS_MODULE_ID = "groups";
export const GROUPS_PARAMETERS = rows as unknown as Readonly<
  Record<string, Parameter>
>;
const STOPGAP = "SG-P15-group-membership";

interface KindRule {
  /** The pull of staying out, calibrated so the town's share lands on the survey's. */
  stayOutParameter: string;
  /** Days between gatherings. */
  everyDaysParameter: string;
  /** Hours a gathering lasts. */
  hoursParameter: string;
  /** The age where this kind pulls most. */
  ageCenterParameter: string;
  /** How far following public life pulls toward this kind. */
  engagementParameter: string;
  /** Who can belong at all: their own children at home, a faith, any adult. */
  requires?: "children-at-home" | "faith" | "enrolled-student";
}
const KINDS = kindsJson as unknown as {
  version: string;
  kinds: Readonly<Record<string, KindRule>>;
  closenessKind: string;
  meetCause: string;
  gatherCause: string;
  gatheringPeers: string;
};

function g(api: CoreAPI, key: string): number {
  const row = GROUPS_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

function store(api: CoreAPI) {
  return api.moduleState(GROUPS_MODULE_ID);
}

const ageOf = (api: CoreAPI, person: Readonly<PersonState>) =>
  ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date));

function factOf(person: Readonly<PersonState>, kind: string, key: string) {
  return person.pastFacts?.find((row) => row.kind === kind)?.facts?.[key];
}

/** The college a person is enrolled at now, from their record. */
function collegeOf(person: Readonly<PersonState>): string | undefined {
  return person.pastFacts?.find(
    (row) =>
      row.kind === COLLEGE_FACT_KIND &&
      row.facts?.stage === COLLEGE_STAGE &&
      row.facts?.enrollment === "current",
  )?.facts?.institutionSourceId;
}

function hasChildAtHome(api: CoreAPI, person: Readonly<PersonState>): boolean {
  const core = api.state as CoreState;
  const minimum = g(api, "groupsAdultAge");
  for (const link of core.familyLinks.values()) {
    if (link.kind !== "parent-child" || link.personIds[0] !== person.id)
      continue;
    const child = core.people.get(link.personIds[1]);
    if (
      child?.alive &&
      child.householdId === person.householdId &&
      ageOf(api, child) < minimum
    )
      return true;
  }
  return false;
}

/** Each recorded reason to belong to a kind of group, as a signed pull. */
export function belongingReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
  kind: string,
): Record<string, number> | null {
  const rule = KINDS.kinds[kind];
  if (!rule) return null;
  const zero = api.parameter("zero");
  // A record without the opening's profile facts (a world built without
  // peopleOpening) reads the same profile the opening would have written.
  const profile = () => profileFor(person, api.state.seed, api.state.startedAt);
  const faith =
    factOf(person, PROFILE_FACT_KINDS.faith, "group") ?? profile()?.faith;
  if (rule.requires === "children-at-home" && !hasChildAtHome(api, person))
    return null;
  if (rule.requires === "faith" && (!faith || faith === "none")) return null;
  if (rule.requires === "enrolled-student" && !collegeOf(person)) return null;
  const view = viewOf(api, person.id);
  const schooling =
    factOf(person, PROFILE_FACT_KINDS.education, "level") ??
    profile()?.education;
  const education =
    schooling === "college"
      ? api.parameter("one")
      : schooling === "no-college"
        ? api.parameter("negativeOne")
        : zero;
  const age = ageOf(api, person);
  const distance =
    (age - g(api, rule.ageCenterParameter)) / g(api, "groupsAgeSpread");
  return {
    education: g(api, "groupsEducationWeight") * education,
    engagement: g(api, rule.engagementParameter) * (view?.engagement ?? zero),
    age:
      g(api, "groupsAgeWeight") *
      (api.parameter("two") * Math.exp(-distance * distance) -
        api.parameter("one")),
    // Time a full-time job leaves for evenings out.
    time: person.jobId ? -g(api, "groupsJobTimeWeight") : zero,
    // Every trait's lean toward joining over staying out, through the shared
    // trait table (about -1 to 1): the sociable join sooner than the reserved.
    temperament:
      g(api, "groupsTemperamentWeight") *
      decisionLean(api.state, person, "groups.belong", BELONG_ID, STAY_OUT_ID),
  };
}

const BELONG_ID = "groups-belong";
const STAY_OUT_ID = "groups-stay-out";

function action(
  decisionId: string,
  id: string,
  joining: boolean,
): ActionDefinition {
  return {
    id,
    // Every trait reaches both options through the shared decision table.
    actKinds: decisionKinds(decisionId, id),
    goalKinds: [],
    need: "company",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "known-group",
    effect: "belong",
    reasonBindings: [
      {
        id: "belonging",
        provider: "groups-belonging",
        weightParameter: "one",
        arguments: { joining: String(joining) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
export const BELONG = action("groups.belong", BELONG_ID, true);
export const STAY_OUT = action("groups.belong", STAY_OUT_ID, false);
export const ATTEND = action("groups.attend", "groups-attend", true);
export const SKIP = action("groups.attend", "groups-skip", false);

const pending = new WeakMap<object, { kind: string; value: number }>();

/** Whether this person chooses to belong to (or attend) a kind of group now. */
function choose(
  api: CoreAPI,
  person: Readonly<PersonState>,
  kind: string,
  value: number,
  stay: number,
  yes: ActionDefinition,
  no: ActionDefinition,
  targetId: string,
): boolean {
  pending.set(api.state, { kind, value: value - stay });
  const offers: ActOffer[] = [no, yes].map((definition) => ({
    definition,
    targetId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, person.id, offers, {
    needValues: { company: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, person.id, scored);
  pending.delete(api.state);
  return decision.selected?.definition.id === yes.id;
}

interface GroupRow {
  id: string;
  kind: string;
  memberIds: PersonId[];
  nextGathering: string;
}

function groupsOfKind(api: CoreAPI, kind: string): string[] {
  const core = api.state as CoreState;
  return [...core.publicOrganizations.values()]
    .filter((row) => row.facts?.groupKind === kind)
    .map((row) => row.id)
    .sort();
}

/** The first day: who already belongs to which groups. */
function settleOpening(api: CoreAPI): void {
  const core = api.state as CoreState;
  api.stopgap(STOPGAP);
  const adults = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        ageOf(api, row) >= g(api, "groupsAdultAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const members = new Map<string, PersonId[]>();
  for (const kind of Object.keys(KINDS.kinds).sort()) {
    const groups = groupsOfKind(api, kind);
    if (!groups.length) continue;
    const rule = KINDS.kinds[kind]!;
    for (const person of adults) {
      const reasons = belongingReasons(api, person, kind);
      if (!reasons) continue;
      const value = Object.values(reasons).reduce((a, b) => a + b, 0);
      if (
        !choose(
          api,
          person,
          kind,
          value,
          g(api, rule.stayOutParameter),
          BELONG,
          STAY_OUT,
          kind,
        )
      )
        continue;
      // Which of the town's groups of that kind: who exists at the opening,
      // keyed to the person's home so a household shares a congregation.
      // A student's group is their own college's.
      const own =
        rule.requires === "enrolled-student"
          ? groups.find(
              (id) =>
                core.publicOrganizations.get(id)?.facts?.institutionSourceId ===
                collegeOf(person),
            )
          : undefined;
      if (rule.requires === "enrolled-student" && !own) continue;
      const at =
        Number.parseInt(
          stableHash(
            `${api.state.seed}:groups:${kind}:${person.householdId}`,
          ).slice(0, api.parameter("seedHashDigits")),
          api.parameter("seedPlaceHashRadix"),
        ) % groups.length;
      const groupId = own ?? groups[at]!;
      api.join(person.id, groupId);
      api.observe(person.id, {
        key: `organization:${groupId}:public`,
        value: core.publicOrganizations.get(groupId)!.name,
        learnedAt: api.state.date,
        sourceId: `membership:${groupId}:${person.id}`,
        access: "perceived",
      });
      members.set(groupId, [...(members.get(groupId) ?? []), person.id]);
    }
  }
  for (const [groupId, ids] of members) {
    const kind = core.publicOrganizations.get(groupId)!.facts!.groupKind!;
    const rule = KINDS.kinds[kind]!;
    // Members know each other from the gatherings before the opening.
    for (let i = 0; i < ids.length; i += 1)
      for (const other of nearest(api, ids, i))
        api.meet(ids[i]!, other, {
          placeId: core.publicOrganizations.get(groupId)!.placeId,
          sourceId: `membership:${groupId}:${ids[i]}`,
          cause: KINDS.meetCause,
          hours: g(api, rule.hoursParameter),
        });
    const offset =
      Number.parseInt(
        stableHash(`${api.state.seed}:groups:day:${groupId}`).slice(
          0,
          api.parameter("seedHashDigits"),
        ),
        api.parameter("seedPlaceHashRadix"),
      ) % g(api, rule.everyDaysParameter);
    const row: GroupRow = {
      id: groupId,
      kind,
      memberIds: ids,
      nextGathering: addDays(makeIsoDate(api.state.date), offset + 1),
    };
    store(api)
      .table("groups")
      .put(row as unknown as { id: string });
    schedule(api, row);
  }
}

/** The members a person sits with: the closest, else those nearest them in the list. */
function nearest(api: CoreAPI, ids: readonly PersonId[], index: number) {
  const peers = g(api, KINDS.gatheringPeers);
  const out: PersonId[] = [];
  for (let step = 1; out.length < peers && step < ids.length; step += 1) {
    const other = ids[(index + step) % ids.length]!;
    if (!out.includes(other) && other !== ids[index]) out.push(other);
  }
  return out;
}

function schedule(api: CoreAPI, row: GroupRow): void {
  api.moduleCalendar(GROUPS_MODULE_ID).schedule({
    key: `${row.id}:gathering:${row.nextGathering}`,
    date: row.nextGathering,
    kind: "gathering",
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "A group's regular gathering.",
      estimatedFrom: STOPGAP,
    },
    sourceRecordIds: [row.id],
  });
}

/** A gathering: each member weighs going; those who go spend it together. */
function gather(api: CoreAPI, groupId: string): void {
  const core = api.state as CoreState;
  const held = store(api).table("groups").get(groupId) as unknown as
    GroupRow | undefined;
  if (!held) return;
  const rule = KINDS.kinds[held.kind]!;
  const hours = g(api, rule.hoursParameter);
  const going = held.memberIds.filter((id) => {
    const person = core.people.get(id);
    if (!person?.alive || person.tier === "husk") return false;
    const reasons = belongingReasons(api, person, held.kind);
    if (!reasons) return false;
    const value = Object.values(reasons).reduce((a, b) => a + b, 0);
    return choose(
      api,
      person,
      held.kind,
      value,
      g(api, "groupsSkipPull"),
      ATTEND,
      SKIP,
      groupId,
    );
  });
  const place = core.publicOrganizations.get(groupId)?.placeId;
  for (let i = 0; i < going.length; i += 1)
    for (const other of closestAmong(api, going[i]!, going))
      api.relationship(
        going[i]!,
        other,
        KINDS.closenessKind as Relationship["kind"],
        hours,
        undefined,
        { cause: KINDS.gatherCause, ...(place ? { placeId: place } : {}) },
      );
  const next: GroupRow = {
    ...held,
    memberIds: [...held.memberIds],
    nextGathering: addDays(
      makeIsoDate(api.state.date),
      g(api, rule.everyDaysParameter),
    ),
  };
  store(api)
    .table("groups")
    .put(next as unknown as { id: string });
  schedule(api, next);
}

/** Fellow attendees a person spends the gathering with: those they are closest to. */
function closestAmong(
  api: CoreAPI,
  personId: PersonId,
  going: readonly PersonId[],
): PersonId[] {
  const core = api.state as CoreState;
  const level = (other: PersonId) =>
    core.relationships.get([personId, other].sort().join(":"))?.level ??
    api.parameter("zero");
  return going
    .filter((other) => other !== personId && other > personId)
    .sort((a, b) => level(b) - level(a) || a.localeCompare(b))
    .slice(0, g(api, KINDS.gatheringPeers));
}

export const groupsModule: CoreModule = {
  id: GROUPS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, groups: {} } },
  onDay(api) {
    if (store(api).table("state").get("groups:state")) return;
    store(api)
      .table("state")
      .put({ id: "groups:state", openedAt: api.state.date });
    settleOpening(api);
  },
  onCalendarWork(api, work) {
    if (work.kind === "gathering") gather(api, work.sourceRecordIds[0]!);
  },
  reasonProviders: {
    "groups-belonging": (api, actor, _offer, binding) => {
      const held = pending.get(api.state);
      if (!held) return undefined;
      return {
        value:
          binding.arguments?.joining === "true"
            ? held.value
            : api.parameter("zero"),
        sourceIds: [actor.id],
      };
    },
  },
};

export { GROUPS };
