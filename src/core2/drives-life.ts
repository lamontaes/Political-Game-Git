/**
 * PW-6: what a full person with free time has on offer besides rest and
 * contact (the drives engine's life acts). Each is an act row in
 * `data/drives/life.json`, offered from the records and weighed by the shared
 * chooser like anything else, with its own recorded reason:
 *
 * - **Look for work.** A jobless adult of working age who is not already
 *   looking, in a town whose jobs module runs. Running low on money pulls
 *   toward it (the cash-runway reason); choosing it makes them a seeker, and
 *   the jobs module's weekly applications and hiring take it from there.
 * - **Meet someone new.** Through a friend's circle, at work, or around town.
 *   A small circle pulls toward it (the small-circle reason). Whom they could
 *   meet is ranked by closeness in age, then by record id; the chooser picks
 *   among them. For the player, the town's counted people are candidates too:
 *   meeting one fills them in from the world's seed (`personOrFillIn`), so
 *   they match the records. Everyone else meets only full people, which keeps
 *   the full population to the player's world (the two-level rule).
 * - **Learn the town's places.** The offices, meeting places and groups in
 *   their town and county they don't know yet. Coming of age pulls toward it
 *   (the coming-of-age reason, strongest at the 18th birthday). Knowing a
 *   group or a meeting place opens the core's own acts to join or meet there.
 */
import {
  addDays,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "../simulation/dates";
import lifeJson from "./data/drives/life.json" with { type: "json" };
import {
  JOBS_DATA,
  JOBS_MODULE_ID,
  isJobSeeker,
  startJobSearch,
} from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { offer } from "./modules/life";
import { personOrFillIn } from "./state";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreData,
  CoreModule,
  PersonState,
} from "./types";
import type { Parameter } from "./parameters";

export const LIFE_ACTS = lifeJson as unknown as {
  version: string;
  stopgapId: string;
  causes: { throughFriend: string; atWork: string; aroundTown: string };
  lookupAffordances: readonly string[];
  officeAffordance: string;
  actions: readonly ActionDefinition[];
  parameters: Readonly<Record<string, Parameter>>;
};

type Channel = keyof typeof LIFE_ACTS.causes;

/** The life acts' rows and parameters, added to the shared data. */
export function lifeActsData(): Pick<CoreData, "actions" | "parameters"> {
  return {
    actions: LIFE_ACTS.actions,
    parameters: LIFE_ACTS.parameters,
  } as Pick<CoreData, "actions" | "parameters">;
}

const ageYears = (api: CoreAPI, birthDate: string) =>
  daysBetween(makeIsoDate(birthDate), makeIsoDate(api.state.date)) /
  api.parameter("daysPerMeanYear");

/** Whoever this person could meet next, by channel, nearest in age first. */
interface Candidate {
  id: string;
  channel: Channel;
  via: string;
  /** Days between the two birth dates. */
  ageGap: number;
}

/** A birth date as a day count, for ranking by closeness in age. */
const birthDay = (birthDate: string) => Date.parse(birthDate);

/** Full people who work where the actor works, by employer, rebuilt once a day. */
const coworkersCache = new WeakMap<
  object,
  { date: string; byOrganization: Map<string, string[]> }
>();
function coworkers(api: CoreAPI, organizationId: string): readonly string[] {
  let cached = coworkersCache.get(api.state);
  if (cached?.date !== api.state.date) {
    const byOrganization = new Map<string, string[]>();
    for (const job of api.state.jobs.values()) {
      const list = byOrganization.get(job.organizationId);
      if (list) list.push(job.personId);
      else byOrganization.set(job.organizationId, [job.personId]);
    }
    cached = { date: api.state.date, byOrganization };
    coworkersCache.set(api.state, cached);
  }
  return cached.byOrganization.get(organizationId) ?? [];
}

interface Resident {
  id: string;
  birth: number;
}
/**
 * A town's residents sorted by birth date: the full ones, and the counted
 * ones (still in the counts). Rebuilt only when the town's full people or the
 * counted households change, never scanned whole per choice.
 */
const townCache = new WeakMap<
  object,
  Map<
    string,
    { full: number; counted: number; rows: Resident[]; countedRows: Resident[] }
  >
>();
function townResidents(api: CoreAPI, placeId: string, withCounted: boolean) {
  let byPlace = townCache.get(api.state);
  if (!byPlace) townCache.set(api.state, (byPlace = new Map()));
  const fullIds = api.state.peopleByPlace.get(placeId);
  const rt = withCounted ? residentsRuntime(api.state) : undefined;
  const full = fullIds?.size ?? 0;
  const counted = rt?.households.size ?? 0;
  let row = byPlace.get(placeId);
  if (!row || row.full !== full || (withCounted && row.counted !== counted)) {
    const rows = [...(fullIds ?? [])].map((id) => ({
      id,
      birth: birthDay(api.state.people.get(id)!.birthDate),
    }));
    rows.sort((a, b) => a.birth - b.birth || a.id.localeCompare(b.id));
    let countedRows = row && row.counted === counted ? row.countedRows : [];
    if (rt && (!row || row.counted !== counted)) {
      countedRows = [];
      for (const record of rt.households.values())
        if (record.household.placeId === placeId)
          for (const person of record.people)
            countedRows.push({
              id: person.id,
              birth: birthDay(person.birthDate),
            });
      countedRows.sort((a, b) => a.birth - b.birth || a.id.localeCompare(b.id));
    }
    row = { full, counted, rows, countedRows };
    byPlace.set(placeId, row);
  }
  return row;
}

/** Up to `limit` rows nearest `own` in birth date that `accept` admits. */
function nearest(
  rows: readonly Resident[],
  own: number,
  limit: number,
  accept: (id: string) => boolean,
): Resident[] {
  let low = 0,
    high = rows.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (rows[mid]!.birth < own) low = mid + 1;
    else high = mid;
  }
  const out: Resident[] = [];
  let left = low - 1,
    right = low;
  while (out.length < limit && (left >= 0 || right < rows.length)) {
    const takeLeft =
      right >= rows.length ||
      (left >= 0 && own - rows[left]!.birth <= rows[right]!.birth - own);
    const row = takeLeft ? rows[left--]! : rows[right++]!;
    if (accept(row.id)) out.push(row);
  }
  return out;
}

/** Whether the counted people may be met (and so filled in) by this person. */
const meetsCounted = (api: CoreAPI, actor: Readonly<PersonState>) =>
  actor.id === api.state.playerId;

function candidates(
  api: CoreAPI,
  actor: Readonly<PersonState>,
): readonly Candidate[] {
  const limit = api.parameter("lifeMeetCandidatesPerChannel");
  const own = birthDay(actor.birthDate);
  const picked = new Set<string>();
  const out: Candidate[] = [];
  const unknown = (id: string) =>
    id !== actor.id && !actor.knownIds.has(id) && !picked.has(id);
  const take = (rows: Candidate[]) => {
    rows.sort((a, b) => a.ageGap - b.ageGap || a.id.localeCompare(b.id));
    for (const row of rows.slice(0, limit)) {
      picked.add(row.id);
      out.push(row);
    }
  };
  const fullStranger = (id: string) =>
    unknown(id) && api.state.people.get(id)?.alive === true;
  const gap = (id: string) =>
    Math.abs(birthDay(api.state.people.get(id)!.birthDate) - own);
  // Through a friend: the people the actor's ties know.
  const friends: Candidate[] = [];
  const offered = new Set<string>();
  const consider = (id: string, via: string) => {
    if (offered.has(id) || !fullStranger(id)) return;
    offered.add(id);
    friends.push({ id, channel: "throughFriend", via, ageGap: gap(id) });
  };
  for (const knownId of actor.knownIds) {
    const known = api.state.people.get(knownId);
    if (!known?.alive) continue;
    if (
      !api.state.relationships.has(
        actor.id < knownId
          ? `${actor.id}:${knownId}`
          : `${knownId}:${actor.id}`,
      )
    )
      continue;
    for (const id of known.knownIds) consider(id, knownId);
    for (const id of known.familyIds) consider(id, knownId);
  }
  take(friends);
  // At work: the full people on the same employer's books.
  const job = actor.jobId ? api.state.jobs.get(actor.jobId) : undefined;
  if (job)
    take(
      coworkers(api, job.organizationId)
        .filter(fullStranger)
        .map((id) => ({
          id,
          channel: "atWork" as const,
          via: job.organizationId,
          ageGap: gap(id),
        })),
    );
  // Around town: the town's other residents nearest in age; for the player,
  // the counted people too, filled in when met.
  const counted = meetsCounted(api, actor);
  const town = townResidents(api, actor.placeId, counted);
  const around = nearest(town.rows, own, limit, fullStranger);
  if (counted)
    around.push(
      ...nearest(
        town.countedRows,
        own,
        limit,
        (id) => unknown(id) && !api.state.people.has(id),
      ),
    );
  take(
    around.map((row) => ({
      id: row.id,
      channel: "aroundTown" as const,
      via: actor.placeId,
      ageGap: Math.abs(row.birth - own),
    })),
  );
  return out;
}

/**
 * Whom a person could meet changes slowly: the list is kept for the refresh
 * period, or until they meet someone, and anyone met or gone since is left
 * out when it is read.
 */
const candidateCache = new WeakMap<
  object,
  Map<string, { until: string; known: number; rows: readonly Candidate[] }>
>();
function knownCandidates(
  api: CoreAPI,
  actor: Readonly<PersonState>,
): readonly Candidate[] {
  let byPerson = candidateCache.get(api.state);
  if (!byPerson) candidateCache.set(api.state, (byPerson = new Map()));
  let row = byPerson.get(actor.id);
  if (
    !row ||
    row.until <= api.state.date ||
    row.known !== actor.knownIds.size
  ) {
    row = {
      until: addDays(
        makeIsoDate(api.state.date),
        api.parameter("lifeMeetCandidateRefreshDays"),
      ),
      known: actor.knownIds.size,
      rows: candidates(api, actor),
    };
    byPerson.set(actor.id, row);
  }
  return row.rows.filter((candidate) => {
    if (actor.knownIds.has(candidate.id)) return false;
    const full = api.state.people.get(candidate.id);
    return full ? full.alive : meetsCounted(api, actor);
  });
}

/** The day each person last met someone new, for the spacing of meetings. */
const lastMet = new WeakMap<object, Map<string, string>>();
function metOn(api: CoreAPI, personId: string): string | undefined {
  return lastMet.get(api.state)?.get(personId);
}
function markMet(api: CoreAPI, personId: string): void {
  let byPerson = lastMet.get(api.state);
  if (!byPerson) lastMet.set(api.state, (byPerson = new Map()));
  byPerson.set(personId, api.state.date);
}

/** The channel and go-between of a meeting offer, read back at the effect. */
const meetingVia = new WeakMap<ActOffer, Candidate>();

export function createLifeActs(): Pick<
  CoreModule,
  "offerProviders" | "effectHandlers" | "reasonProviders"
> {
  return {
    offerProviders: {
      "local-job-market": (api, actor, action) => {
        if (!api.state.modules.has(JOBS_MODULE_ID) || actor.jobId) return [];
        const [young, old] = JOBS_DATA.workingAge as [number, number];
        const age = ageYears(api, actor.birthDate);
        if (age < young || age >= old || isJobSeeker(api, actor.id)) return [];
        return [offer(api, actor, action, actor.placeId)];
      },
      "new-acquaintance": (api, actor, action) =>
        knownCandidates(api, actor).map((row) => {
          const made = offer(api, actor, action, row.id);
          meetingVia.set(made, row);
          return made;
        }),
      // One offer for each kind of place the person knows none of, the
      // lowest id standing for the rest of that kind (as the core's contact
      // offer does for people without a tie).
      "local-directory": (api, actor, action) => {
        const firstOfKind = new Map<string, string>();
        const knownKinds = new Set<string>();
        for (const placeId of new Set([
          actor.placeId,
          ...(actor.countyId ? [actor.countyId] : []),
        ]))
          for (const id of api.state.publicOrganizationsByPlace.get(placeId) ??
            []) {
            const row = api.state.publicOrganizations.get(id)!;
            for (const kind of LIFE_ACTS.lookupAffordances) {
              if (!row.affordances?.includes(kind)) continue;
              if (
                kind === LIFE_ACTS.officeAffordance &&
                !(
                  (row.staff?.length ?? api.parameter("zero")) >
                  api.parameter("zero")
                )
              )
                continue;
              if (api.knows(actor.id, `organization:${id}:public`))
                knownKinds.add(kind);
              else {
                const first = firstOfKind.get(kind);
                if (first === undefined || id < first)
                  firstOfKind.set(kind, id);
              }
            }
          }
        const ids = new Set<string>();
        for (const [kind, id] of firstOfKind)
          if (!knownKinds.has(kind)) ids.add(id);
        return [...ids].sort().map((id) => offer(api, actor, action, id));
      },
    },
    effectHandlers: {
      "start-job-search": (api, actorId) => {
        startJobSearch(api, actorId);
      },
      "meet-new-person": (api, actorId, chosen) => {
        const actor = api.state.people.get(actorId)!;
        const other = personOrFillIn(api.state, chosen.targetId);
        if (!other?.alive || other.id === actorId) return;
        const via = meetingVia.get(chosen);
        const met = api.meet(actorId, other.id, {
          placeId: actor.placeId,
          sourceId: `meeting:${api.state.date}:${actorId}:${other.id}${via ? `:${via.via}` : ""}`,
          cause: LIFE_ACTS.causes[via?.channel ?? "aroundTown"],
          hours:
            chosen.effortHours ??
            api.parameter(chosen.definition.effortParameter),
        });
        api.updatePerson(actorId, { lastContactDate: api.state.date });
        if (met) {
          markMet(api, actorId);
          markMet(api, other.id);
        }
      },
    },
    reasonProviders: {
      // Fewer days of cash, a stronger pull: half strength at the runway parameter.
      "life-cash-runway": (api, actor) => {
        const days =
          actor.livingCostDailyMinor > api.parameter("zero")
            ? actor.liquidMinor / actor.livingCostDailyMinor
            : Number.POSITIVE_INFINITY;
        const runway = api.parameter("lifeCashRunwayDays");
        return {
          value: Number.isFinite(days)
            ? runway / (runway + Math.max(api.parameter("zero"), days))
            : api.parameter("zero"),
          sourceIds: [actor.id],
        };
      },
      // Fewer people known, a stronger pull: half strength at a typical
      // circle. Right after meeting someone new it is spent, and it comes
      // back over the spacing of meetings.
      "life-small-circle": (api, actor, chosen) => {
        const typical = api.parameter("lifeTypicalCircle");
        const via = meetingVia.get(chosen);
        const last = metOn(api, actor.id);
        const since = last
          ? daysBetween(makeIsoDate(last), makeIsoDate(api.state.date))
          : Number.POSITIVE_INFINITY;
        const rested =
          api.parameter("one") -
          Math.pow(
            api.parameter("one") / api.parameter("two"),
            since / api.parameter("lifeMeetingSpacingDays"),
          );
        return {
          value: (typical / (typical + actor.knownIds.size)) * rested,
          sourceIds: [chosen.targetId, ...(via ? [via.via] : [])],
        };
      },
      // Strongest on the 18th birthday, fading either side.
      "life-coming-of-age": (api, actor) => {
        const birthday = dateAtAge(
          makeIsoDate(actor.birthDate),
          api.parameter("lifeAdultAgeYears"),
        );
        const away = Math.abs(
          daysBetween(birthday, makeIsoDate(api.state.date)),
        );
        return {
          value: Math.pow(
            api.parameter("one") / api.parameter("two"),
            away / api.parameter("lifeComingOfAgeHalfLifeDays"),
          ),
          sourceIds: [`${actor.id}:${birthday}`],
        };
      },
    },
  };
}

export { candidates as meetingCandidates };
