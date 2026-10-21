/**
 * Who has standing in a race (owner, Oct 14, 2026: no "one level up" ladder).
 *
 * The pool for any race is everyone with standing in its jurisdiction:
 * officeholders at every level (the officials engine's people and the offices
 * engine's terms), party officers, former candidates, and prominent people (a
 * business's owner, a press outlet's owner or head, a group's lobbyist).
 * Counted residents join when their own record draws them (the candidacy
 * module's counted screen). Each member weighs running with the same chooser
 * every town resident uses (`decideToRun`); this file only says who is in
 * the pool, how well known each is in the race's jurisdiction, and the
 * facts the chooser reads beyond a resident's: ambition, the chance their
 * lean gives, their party's backing and their means.
 *
 * Imports of the offices, officials, parties and elections modules are type
 * only, and their tables are read by module id to avoid import cycles.
 */
import { seededBetween } from "./past-module";
import { partySide } from "./appointments";
import { officeFamily } from "./elections-calendar";
import { OFFICIALS_DATA } from "./officials-roster";
import rows from "./data/candidacy/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import type { CoreAPI, PersonId, PersonState } from "./types";
import type { OfficeInput } from "./offices-local";
import type { ContestRow } from "./modules/elections";
import type { TermRow } from "./modules/offices";
import type { OfficialRow } from "./modules/officials";
import type { PartyRow, TieRow } from "./modules/parties";

export const CANDIDACY_MODULE_ID = "candidacy";
export const CANDIDACY_PARAMETERS = rows as Readonly<Record<string, Parameter>>;

// Module ids, read by name (see the file comment).
const OFFICES = "core2-offices-v1";
const OFFICIALS = "core2-officials-v1";
const PARTIES = "core2-parties-v1";
const ELECTIONS = "core2-elections-v1";
const BUSINESS = "business";
const PRESS = "core2-press-v1";
const GROUPS = "core2-interest-groups-v1";

/** A candidacy parameter: its row, or the core's own table where the key is the core's. */
export function candidacyParameter(api: CoreAPI, key: string): number {
  const row = CANDIDACY_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  if (row.tag === "ESTIMATED" && row.spread && "low" in row.spread)
    return seededBetween(
      api.state.seed,
      `candidate-pool:${key}`,
      row.spread.low,
      row.spread.high,
    );
  return row.value;
}
const c = candidacyParameter;

export type PoolRole =
  "officeholder" | "party-officer" | "former-candidate" | "prominent";

/** One person with standing in a race's jurisdiction, and why. */
export interface PoolMember {
  readonly personId: PersonId;
  readonly roles: readonly PoolRole[];
  /** The record ids that put them in the pool. */
  readonly sourceIds: readonly string[];
  /** The share of the jurisdiction's voters their broadest seat covers, 0 for no seat. */
  readonly reach: number;
  /** Their standing from a role other than a seat, 0 to 1. */
  readonly roleStanding: number;
}

/** What the chooser reads about a pool member beyond a resident's record. */
export interface PoolFacts {
  /** How well known they are in the race's jurisdiction, 0 to 1. */
  readonly standing: number;
  /** Their ambition, from their traits (the officials engine's formula). */
  readonly ambition: number;
  /** Their party's backing in a partisan race: its share of the state's vote, 0 to 1. */
  readonly backing: number;
  /** Their cash against the runway a wide campaign asks, 0 to 1. */
  readonly means: number;
  /** -1, 0 or 1: the side of the party they stand under. */
  readonly side: number;
  readonly party: string | null;
  readonly roles: readonly PoolRole[];
  readonly sourceIds: readonly string[];
}

/** What a race covers. */
export interface RaceScope {
  /** A national race (the presidency): the pool is every state's. */
  readonly national: boolean;
  readonly stateKey: string;
  /** The share of the jurisdiction's voters the seat covers. */
  readonly reach: number;
  /** The party the seat is held under (the incumbent's, else the seat's), if partisan. */
  readonly party: string | null;
  /** Where the race's electorate sits on the left-right scale, -1 to 1. */
  readonly lean: number;
}

interface Town {
  readonly stateKey: string;
  readonly townPlaceId: string;
}

function offices(api: CoreAPI) {
  return api.moduleState(OFFICES);
}
function townOf(api: CoreAPI): Town {
  return offices(api).table("loaded").get("town") as unknown as Town;
}
function officialRows(api: CoreAPI): readonly OfficialRow[] {
  if (!api.state.modules.has(OFFICIALS)) return [];
  return api
    .moduleState(OFFICIALS)
    .table("officials")
    .rows() as unknown as OfficialRow[];
}
function partyRows(api: CoreAPI): readonly PartyRow[] {
  if (!api.state.modules.has(PARTIES)) return [];
  return api
    .moduleState(PARTIES)
    .table("parties")
    .rows() as unknown as PartyRow[];
}

/** The side of the scale a person stands on: their party's label, else their recorded tie. */
export function sideOf(api: CoreAPI, personId: PersonId): number {
  return partySide(partyOf(api, personId));
}

/** The party a person files under: their recorded tie, else the label their official record or latest term carries. */
export function partyOf(api: CoreAPI, personId: PersonId): string | null {
  if (api.state.modules.has(PARTIES)) {
    const tie = api
      .moduleState(PARTIES)
      .table("ties")
      .get(personId) as unknown as TieRow | undefined;
    const party = tie?.partyId
      ? partyRows(api).find((row) => row.id === tie.partyId)
      : undefined;
    if (party) return party.name;
  }
  if (api.state.modules.has(OFFICIALS)) {
    const row = api
      .moduleState(OFFICIALS)
      .table("officials")
      .get(personId) as unknown as OfficialRow | undefined;
    if (row?.party) return row.party;
  }
  const terms = offices(api)
    .table("terms")
    .query("byPerson", [personId]) as unknown as TermRow[];
  const latest = terms
    .filter((term) => term.party)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  return latest?.party ?? null;
}

/** The party label a seat is held under: its serving holder's, else the seat's, else its last holder's. */
export function seatParty(
  api: CoreAPI,
  contest: Pick<ContestRow, "seatId" | "incumbentTermId">,
): string | null {
  const terms = offices(api).table("terms");
  const incumbent = contest.incumbentTermId
    ? (terms.get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  if (incumbent?.party) return incumbent.party;
  const seat = offices(api).table("seats").get(contest.seatId) as unknown as
    { party?: string | null } | undefined;
  if (seat?.party) return seat.party;
  const last = (
    terms.query("bySeatStatus", [
      contest.seatId,
      "ended",
    ]) as unknown as TermRow[]
  )
    .slice()
    .sort((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? ""))[0];
  return last?.party ?? null;
}

/** The officials' body sizes and seat counts by state, for the share of voters a seat covers. */
interface Counts {
  readonly body: ReadonlyMap<string, number>;
  readonly house: ReadonlyMap<string, number>;
  readonly states: number;
}
const counted = new WeakMap<object, { date: string; counts: Counts }>();
function countsOf(api: CoreAPI): Counts {
  const held = counted.get(api.state);
  if (held && held.date === api.state.date) return held.counts;
  const body = new Map<string, number>();
  const house = new Map<string, number>();
  const states = new Set<string>();
  for (const row of officialRows(api)) {
    if (row.ended !== null) continue;
    body.set(row.body, (body.get(row.body) ?? 0) + row.standsFor);
    states.add(row.stateKey);
    if (row.bodyKind === "us-house")
      house.set(row.stateKey, (house.get(row.stateKey) ?? 0) + 1);
  }
  const counts = { body, house, states: Math.max(1, states.size) };
  counted.set(api.state, { date: api.state.date, counts });
  return counts;
}

/**
 * The share of a state's voters a seat covers: all of them for a statewide
 * seat, one House district's share, one legislative district's share, the
 * average county's or municipality's share. A seat outside the state covers
 * a state's share of the nation in a national race.
 */
function seatReach(
  api: CoreAPI,
  row: OfficialRow | undefined,
  office: OfficeInput | undefined,
  national: boolean,
): number {
  const counts = countsOf(api);
  if (row) {
    if (national) return 1 / counts.states;
    if (row.bodyKind === "us-house")
      return 1 / Math.max(1, counts.house.get(row.stateKey) ?? 1);
    if (row.bodyKind === "legislature")
      return 1 / Math.max(1, counts.body.get(row.body) ?? 1);
    return 1;
  }
  if (!office || national) return 0;
  if (office.level === "county") return c(api, "candidacyCountyReach");
  if (office.level === "city" || office.level === "township")
    return c(api, "candidacyMunicipalReach");
  return 1;
}

const officeFamily0 = (office: OfficeInput | undefined) =>
  office ? officeFamily(office) : "statewideExecutive";

/** What a contest covers: its jurisdiction, the share of its voters its seat reaches and the party it is held under. */
export function raceScope(api: CoreAPI, contest: ContestRow): RaceScope {
  const office = offices(api)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput | undefined;
  const national = office?.kind === "president";
  const town = townOf(api);
  const counts = countsOf(api);
  const holder = officialRows(api).find(
    (row) => row.seatId === contest.seatId && row.ended === null,
  );
  const family = officeFamily0(office);
  let reach = 1;
  if (!national) {
    if (family === "usHouse")
      reach = 1 / Math.max(1, counts.house.get(town.stateKey) ?? 1);
    else if (family === "stateLegislative")
      reach = holder
        ? 1 / Math.max(1, counts.body.get(holder.body) ?? 1)
        : c(api, "candidacyCountyReach");
    else if (family === "countyOffice") reach = c(api, "candidacyCountyReach");
    else if (family === "municipalOffice")
      reach = c(api, "candidacyMunicipalReach");
  }
  // The electorate's lean: the seat's district for a district seat, else
  // the state's, as the officials engine reads them; the nation's centers.
  const anyone =
    holder ?? officialRows(api).find((row) => row.stateKey === town.stateKey);
  const district = family === "usHouse" || family === "stateLegislative";
  return {
    national,
    stateKey: town.stateKey,
    reach,
    party: seatParty(api, contest),
    lean:
      national || !anyone
        ? 0
        : district && holder
          ? holder.districtLean
          : anyone.stateLean,
  };
}

const pools = new WeakMap<
  object,
  { date: string; byScope: Map<string, readonly PoolMember[]> }
>();

/**
 * Everyone with standing in a race's jurisdiction, soonest ids first. Built
 * once a day for a scope and shared by every contest of it.
 */
export function standingPool(
  api: CoreAPI,
  scope: RaceScope,
): readonly PoolMember[] {
  const key = scope.national ? "national" : scope.stateKey;
  const held = pools.get(api.state);
  if (held?.date === api.state.date) {
    const hit = held.byScope.get(key);
    if (hit) return hit;
  }
  const byScope =
    held?.date === api.state.date
      ? held.byScope
      : new Map<string, readonly PoolMember[]>();
  const built = buildPool(api, scope);
  byScope.set(key, built);
  pools.set(api.state, { date: api.state.date, byScope });
  return built;
}

function buildPool(api: CoreAPI, scope: RaceScope): readonly PoolMember[] {
  interface Draft {
    roles: Set<PoolRole>;
    sourceIds: Set<string>;
    reach: number;
    roleStanding: number;
  }
  const drafts = new Map<PersonId, Draft>();
  const add = (
    personId: PersonId | null | undefined,
    role: PoolRole,
    sourceId: string,
    reach = 0,
    roleStanding = 0,
  ) => {
    if (!personId || !api.state.people.has(personId)) return;
    const draft = drafts.get(personId) ?? {
      roles: new Set<PoolRole>(),
      sourceIds: new Set<string>(),
      reach: 0,
      roleStanding: 0,
    };
    draft.roles.add(role);
    draft.sourceIds.add(sourceId);
    draft.reach = Math.max(draft.reach, reach);
    draft.roleStanding = Math.max(draft.roleStanding, roleStanding);
    drafts.set(personId, draft);
  };
  const officeTable = offices(api).table("offices");

  // Officeholders at every level whom voters elect: the officials engine's
  // people (the state's own, or every governor and senator for a national
  // race) ...
  const seen = new Set<PersonId>();
  const terms = offices(api).table("terms");
  const elected = (officeId: string | undefined) =>
    (officeId
      ? (officeTable.get(officeId) as unknown as OfficeInput | undefined)
      : undefined
    )?.elected !== false;
  for (const row of officialRows(api)) {
    if (row.ended !== null) continue;
    const nationalExec = row.seatId.startsWith("seat:US:");
    const inScope = scope.national
      ? true
      : row.stateKey === scope.stateKey && !nationalExec;
    if (!inScope) continue;
    const term = row.termId
      ? (terms.get(row.termId) as unknown as TermRow | undefined)
      : undefined;
    if (term && !elected(term.officeId)) continue;
    seen.add(row.id);
    add(
      row.id,
      "officeholder",
      row.seatId,
      nationalExec ? 1 : seatReach(api, row, undefined, scope.national),
    );
  }
  // ... and the offices engine's terms (the town's mayor, council and county
  // officials, whom the officials engine does not carry).
  for (const term of terms.query("byStatus", [
    "serving",
  ]) as unknown as TermRow[]) {
    if (!term.personId || seen.has(term.personId)) continue;
    if (!elected(term.officeId)) continue;
    if (term.seatId.startsWith("seat:US:") && !scope.national) continue;
    const office = officeTable.get(term.officeId) as unknown as
      OfficeInput | undefined;
    add(
      term.personId,
      "officeholder",
      term.seatId,
      seatReach(api, undefined, office, scope.national),
    );
  }

  // Party officers: each party's chair.
  // stopgapId: SG-POOL-party-officers-local
  api.stopgap("SG-POOL-party-officers-local");
  for (const party of partyRows(api))
    add(
      party.leaderId,
      "party-officer",
      party.id,
      0,
      c(api, "candidacyChairStanding"),
    );

  // Former candidates: those who filed in an earlier contest and did not win it.
  if (api.state.modules.has(CANDIDACY_MODULE_ID)) {
    const contests = api.moduleState(ELECTIONS).table("contests");
    for (const weighed of api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("weighed")
      .rows() as unknown as {
      contestId: string;
      runIds: readonly PersonId[];
      filedOn: string | null;
    }[]) {
      if (weighed.filedOn === null) continue;
      const past = contests.get(weighed.contestId) as unknown as
        ContestRow | undefined;
      if (!past || past.electionDate >= api.state.date) continue;
      for (const personId of weighed.runIds) {
        const won = (
          offices(api)
            .table("terms")
            .query("byPerson", [personId]) as unknown as TermRow[]
        ).some((term) => term.reached.includes(past.electionDate));
        if (!won)
          add(
            personId,
            "former-candidate",
            weighed.contestId,
            0,
            c(api, "candidacyFormerStanding"),
          );
      }
    }
  }

  // Prominent people the records name: a business's owner, a press outlet's
  // owner or head, an interest group's lobbyist.
  const prominent = c(api, "candidacyProminentStanding");
  if (api.state.modules.has(BUSINESS))
    for (const owner of api
      .moduleState(BUSINESS)
      .table("owners")
      .rows() as unknown as { id: string; ownerId: string }[])
      add(owner.ownerId, "prominent", owner.id, 0, prominent);
  if (api.state.modules.has(PRESS))
    for (const outlet of api
      .moduleState(PRESS)
      .table("outlets")
      .rows() as unknown as {
      id: string;
      ownerId: string | null;
      headId: string | null;
    }[]) {
      add(outlet.ownerId, "prominent", outlet.id, 0, prominent);
      add(outlet.headId, "prominent", outlet.id, 0, prominent);
    }
  if (api.state.modules.has(GROUPS))
    for (const group of api
      .moduleState(GROUPS)
      .table("groups")
      .rows() as unknown as { id: string; lobbyistId: string | null }[])
      add(group.lobbyistId, "prominent", group.id, 0, prominent);

  return [...drafts.entries()]
    .map(([personId, draft]): PoolMember => ({
      personId,
      roles: [...draft.roles].sort(),
      sourceIds: [...draft.sourceIds].sort(),
      reach: draft.reach,
      roleStanding: draft.roleStanding,
    }))
    .sort((a, b) => a.personId.localeCompare(b.personId));
}

const appointed = new WeakMap<object, { date: string; ids: Set<PersonId> }>();

/**
 * Everyone serving in an office voters do not elect (a cabinet post, an
 * appointed clerk). They hold the post until they leave it; a wide race's
 * pool and recruiters do not count them as candidates.
 */
export function appointedHolders(api: CoreAPI): ReadonlySet<PersonId> {
  const held = appointed.get(api.state);
  if (held && held.date === api.state.date) return held.ids;
  const officeTable = offices(api).table("offices");
  const ids = new Set<PersonId>();
  for (const term of offices(api)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[]) {
    if (!term.personId) continue;
    const office = officeTable.get(term.officeId) as unknown as
      OfficeInput | undefined;
    if (office && !office.elected) ids.add(term.personId);
  }
  // The president's cabinet (the succession engine's), read by its module
  // id: a secretary serves at the president's pleasure, not on a ballot.
  if (api.state.modules.has("core2-succession-v1"))
    for (const row of api
      .moduleState("core2-succession-v1")
      .table("cabinet")
      .rows() as unknown as { holderId: PersonId }[])
      ids.add(row.holderId);
  appointed.set(api.state, { date: api.state.date, ids });
  return ids;
}

/** A person's ambition from their traits: the officials engine's formula, for anyone. */
export function ambitionOf(
  person: Readonly<Pick<PersonState, "traits">>,
): number {
  const a = OFFICIALS_DATA.ambitionTraits;
  return Math.max(
    0,
    a.perEnterprising *
      (person.traits["personality-v1:facet-enterprising"] ?? 0) +
      a.perRisk * (person.traits["people-mind-v1:risk"] ?? 0),
  );
}

/**
 * What the chooser reads about someone weighing a race beyond a resident's
 * record: how well known they are across its jurisdiction (the broader of
 * the share of its voters their seat already covers and the standing their
 * role gives), their ambition, their party's backing and their means. A
 * person with no seat or role gets the standing of their circle alone (the
 * chooser's own term).
 */
export function poolFactsFor(
  api: CoreAPI,
  person: Readonly<
    Pick<PersonState, "id" | "traits" | "livingCostDailyMinor" | "liquidMinor">
  >,
  scope: RaceScope,
  member?: PoolMember,
): PoolFacts {
  const one = api.parameter("one");
  const zero = api.parameter("zero");
  const exponent = c(api, "candidacyReachExponent");
  const seatStanding = member?.reach
    ? Math.min(one, (member.reach / scope.reach) ** exponent)
    : zero;
  const party = partyOf(api, person.id);
  const side = partySide(party);
  const share = side
    ? (partyRows(api).find((row) => row.side === side)?.share ?? zero)
    : zero;
  const runway =
    person.livingCostDailyMinor * c(api, "candidacyMeansRunwayDays");
  return {
    standing: Math.max(seatStanding, member?.roleStanding ?? zero),
    ambition: ambitionOf(person),
    backing: scope.party ? Math.min(one, share) : zero,
    means:
      runway > zero
        ? Math.max(zero, Math.min(one, person.liquidMinor / runway))
        : one,
    side,
    party,
    roles: member?.roles ?? [],
    sourceIds: member?.sourceIds ?? [],
  };
}
