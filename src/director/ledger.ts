/**
 * The story director on the new core: a read-only module that turns what
 * happens to a watched person into moments, threads, kept facts and
 * background entries (docs/design/director-on-core2.md).
 *
 * It reads the core through its module callbacks and its state, and calls no
 * world writer. Its one write is a core player stop for an interrupting moment
 * of the person the player controls, which changes no world field. Impact is measured from the change itself on each channel, sized by
 * the person's own traits; there is no list of moment kinds. Nothing here
 * draws by chance.
 */
import { addDays, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import { appraiseEvent } from "../core2/emotion";
import { closenessBetween } from "../core2/closeness";
import { P, parameterValues } from "../core2/parameters";
import { isExplicitlyControlledPersonV1 } from "../core2/player-control-state-v1";
import {
  playerClockFrontierV1,
  registerModuleStopV1,
} from "../core2/player-stops-v1";
import type {
  CoreEventInput,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  WorkResult,
} from "../core2/types";
import directorJson from "./data/director.json" with { type: "json" };
import { scheduleMoment, SITUATION_LIBRARY } from "./scheduling";
import type { ScheduleEntry } from "./scheduling";
import { directorStopgap } from "./stopgaps";
import type {
  BackdropEntry,
  CallbackLink,
  ChannelContribution,
  DirectorData,
  KeptFact,
  Ledger,
  Moment,
  PersonLedger,
  SceneFilter,
  Thread,
} from "./types";

export const DEFAULT_DIRECTOR_DATA = directorJson as unknown as DirectorData;

const zero = P.zero;
const one = P.one;

interface Snapshot {
  cash: number;
  householdId: string;
  placeId: string;
  alive: boolean;
  householdPay: number;
  memberJobs: Map<PersonId, string | undefined>;
  ties: Map<string, { otherId: PersonId; level: number; lastContact: IsoDate }>;
  drives: Map<string, number>;
}

interface Pending {
  events: {
    event: CoreEventInput;
    reach: string;
    mood: number;
    stress: number;
  }[];
  work: WorkResult[];
}

interface Change {
  causeId: string;
  causeKind: string;
  counterparts: Set<PersonId>;
  raw: Map<string, number>;
  broadEventId?: string;
  placeId?: string;
  /** The causing event names the person among its own people. */
  selfNamed?: true;
  /** Counterparts whose faded thread this change renewed. */
  renewals: Set<PersonId>;
}

export interface Director {
  module: CoreModule;
  ledger: Ledger;
  /** Snapshot every watched person; call once after the core is created. */
  start(core: Readonly<CoreState>): void;
  /** Begin watching another person, such as someone the player clicks into. */
  watch(core: Readonly<CoreState>, personId: PersonId): void;
  /** "live" or "skipping": while skipping, waiting scenes become journal lines. */
  setMode(mode: "live" | "skipping"): void;
  /**
   * The player's interrupt setting: the scene kinds allowed to stop their
   * day (situation-type keys), or null for every kind. Read by scheduling.
   */
  setSceneFilter(
    personId: PersonId,
    allowedKinds: readonly string[] | null,
    date: IsoDate,
  ): SceneFilter | null;
  /** A thread's importance on a date: the tie plus faded moment impacts. Pure. */
  importance(personId: PersonId, otherId: PersonId, date: IsoDate): number;
  /** How far a thread has faded on a date, from 0 to 1. Pure. */
  fading(personId: PersonId, otherId: PersonId, date: IsoDate): number;
}

export function createDirector(
  options: { watch: readonly PersonId[]; data?: DirectorData } = { watch: [] },
): Director {
  const data = options.data ?? DEFAULT_DIRECTOR_DATA;
  const ledger: Ledger = {
    people: new Map(),
    broadEvents: new Map(),
    hitBy: new Map(),
    liesByLearner: new Map(),
    stopgapHits: new Set(),
    sceneFilters: new Map(),
    pollingVisits: new Map(),
  };
  const snapshots = new Map<PersonId, Snapshot>();
  const pending = new Map<PersonId, Pending>();
  /** Today's interrupting moments, registered as player stops once the day's measuring ends. */
  const interrupts: { moment: Moment; entry: ScheduleEntry }[] = [];
  const initial = [...options.watch];
  let started = false;
  let mode: "live" | "skipping" = "live";

  const param = (key: string): number => {
    const row = data.parameters[key];
    if (!row) throw new Error(`Untagged director parameter: ${key}`);
    if (row.stopgapId) directorStopgap(row.stopgapId, ledger.stopgapHits);
    if (!Number.isFinite(row.value))
      throw new Error(`Non-finite director parameter: ${key}`);
    return row.value;
  };
  const coreParam = (core: Readonly<CoreState>, key: string): number => {
    const row = core.data.parameters[key];
    if (!row || !Number.isFinite(row.value))
      throw new Error(`Missing core parameter: ${key}`);
    return row.value;
  };
  const channel = (id: string) => {
    const row = data.channels.find((entry) => entry.id === id);
    if (!row) throw new Error(`Unregistered director channel: ${id}`);
    return row;
  };
  const pendingFor = (id: PersonId): Pending => {
    let row = pending.get(id);
    if (!row) pending.set(id, (row = { events: [], work: [] }));
    return row;
  };

  function householdPay(
    core: Readonly<CoreState>,
    householdId: string,
  ): { total: number; jobs: Map<PersonId, string | undefined> } {
    const jobs = new Map<PersonId, string | undefined>();
    let total = zero;
    for (const memberId of core.households.get(householdId)?.memberIds ?? []) {
      const member = core.people.get(memberId);
      const job = member?.jobId ? core.jobs.get(member.jobId) : undefined;
      jobs.set(memberId, job && job.endsAt === undefined ? job.id : undefined);
      if (job && job.endsAt === undefined) total += job.wageDailyMinor;
    }
    return { total, jobs };
  }

  function snapshot(core: Readonly<CoreState>, actor: PersonState): Snapshot {
    const pay = householdPay(core, actor.householdId);
    const ties = new Map<
      string,
      { otherId: PersonId; level: number; lastContact: IsoDate }
    >();
    for (const id of core.relationshipsByPerson.get(actor.id) ?? []) {
      const row = core.relationships.get(id)!;
      ties.set(id, {
        otherId: row.actorId === actor.id ? row.otherId : row.actorId,
        level: row.level,
        lastContact: row.lastContactDate,
      });
    }
    return {
      cash: actor.liquidMinor,
      householdId: actor.householdId,
      placeId: actor.placeId,
      alive: actor.alive,
      householdPay: pay.total,
      memberJobs: pay.jobs,
      ties,
      drives: new Map(
        [...actor.drives.values()].map((drive) => [drive.id, drive.strength]),
      ),
    };
  }

  /** The kin relation each family member holds to the person, from recorded family links. */
  function kinRelations(
    core: Readonly<CoreState>,
    personId: PersonId,
  ): Map<PersonId, string[]> {
    const parents = new Map<PersonId, Set<PersonId>>();
    const partners = new Map<PersonId, Set<PersonId>>();
    const add = (
      map: Map<PersonId, Set<PersonId>>,
      a: PersonId,
      b: PersonId,
    ) => {
      let set = map.get(a);
      if (!set) map.set(a, (set = new Set()));
      set.add(b);
    };
    for (const link of core.familyLinks.values()) {
      const [a, b] = link.personIds;
      const left = core.people.get(a);
      const right = core.people.get(b);
      if (!left || !right) continue;
      if (link.kind === "partner") {
        add(partners, a, b);
        add(partners, b, a);
      } else {
        const [parent, child] =
          left.birthDate <= right.birthDate ? [a, b] : [b, a];
        add(parents, child, parent);
      }
    }
    const children = new Map<PersonId, Set<PersonId>>();
    for (const [child, set] of parents)
      for (const parent of set) add(children, parent, child);
    const out = new Map<PersonId, string[]>();
    const mark = (id: PersonId, relation: string) => {
      if (id === personId) return;
      const list = out.get(id) ?? [];
      if (!list.includes(relation)) list.push(relation);
      out.set(id, list);
    };
    const myParents = parents.get(personId) ?? new Set<PersonId>();
    for (const id of myParents) mark(id, "parent");
    for (const id of children.get(personId) ?? []) mark(id, "child");
    for (const id of partners.get(personId) ?? []) mark(id, "partner");
    for (const parent of myParents) {
      for (const id of children.get(parent) ?? []) mark(id, "sibling");
      for (const id of parents.get(parent) ?? []) mark(id, "grandparent");
    }
    for (const child of children.get(personId) ?? [])
      for (const id of children.get(child) ?? []) mark(id, "grandchild");
    return out;
  }

  function ensureThread(
    book: PersonLedger,
    otherId: PersonId,
    kin: string[] = [],
    sharedHome = false,
  ): Thread {
    let thread = book.threads.get(otherId);
    if (!thread) {
      thread = {
        personId: book.personId,
        otherId,
        kin,
        sharedHome,
        tie: tieValue(kin, sharedHome),
        closeness: zero,
        tone: "steady",
        momentIds: [],
        turns: [],
      };
      book.threads.set(otherId, thread);
    }
    return thread;
  }

  function tieValue(kin: readonly string[], sharedHome: boolean): number {
    let tie = zero;
    for (const relation of kin) {
      const row = data.kinTies.find((entry) => entry.relation === relation);
      if (row) tie = Math.max(tie, param(row.parameter));
    }
    return tie + (sharedHome ? param("directorTieSharedHome") : zero);
  }

  function keepFact(book: PersonLedger, fact: KeptFact): void {
    if (book.keptFacts.has(fact.id)) return;
    book.keptFacts.set(fact.id, fact);
    for (const id of [fact.holderId, fact.otherId]) {
      if (id === book.personId) continue;
      let set = book.keptFactsByOther.get(id);
      if (!set) book.keptFactsByOther.set(id, (set = new Set()));
      set.add(fact.id);
    }
  }

  function knewFact(
    book: PersonLedger,
    otherId: PersonId,
    since: IsoDate,
    sinceBasis: string,
    sourceId: string,
  ): void {
    keepFact(book, {
      id: `knew-each-other:${[book.personId, otherId].sort().join(":")}`,
      kind: "knew-each-other",
      holderId: book.personId,
      otherId,
      since,
      sinceBasis,
      sourceId,
    });
  }

  function beginWatching(core: Readonly<CoreState>, personId: PersonId): void {
    if (ledger.people.has(personId)) return;
    const actor = core.people.get(personId);
    if (!actor)
      throw new Error(`Watched person is not a recorded person: ${personId}`);
    const book: PersonLedger = {
      personId,
      watchedSince: core.date,
      moments: [],
      momentsById: new Map(),
      momentsByOther: new Map(),
      threads: new Map(),
      keptFacts: new Map(),
      keptFactsByOther: new Map(),
      backdrop: [],
      summaries: new Map(),
      forgottenBroad: new Map(),
      backdropCounts: new Map(),
      schedule: [],
      belowFloor: new Map(),
      quietDays: zero,
      observedDays: zero,
    };
    ledger.people.set(personId, book);
    const home = new Set(
      core.households.get(actor.householdId)?.memberIds ?? [],
    );
    const kin = kinRelations(core, personId);
    for (const id of new Set([...actor.familyIds, ...kin.keys(), ...home])) {
      if (id === personId) continue;
      const other = core.people.get(id);
      ensureThread(book, id, kin.get(id) ?? [], home.has(id));
      // Blood relatives knew each other no later than the younger one's birth.
      // A partner or housemate is known no later than the opening; the
      // records do not say when partners met.
      const blood = (kin.get(id) ?? []).some(
        (relation) => relation !== "partner",
      );
      if (other && blood)
        knewFact(
          book,
          id,
          other.birthDate > actor.birthDate ? other.birthDate : actor.birthDate,
          "no-later-than-birth",
          `family:${personId}:${id}`,
        );
      else if (other)
        knewFact(book, id, core.startedAt, "opening", actor.householdId);
    }
    for (const id of actor.knownIds) {
      if (id === personId) continue;
      ensureThread(book, id, kin.get(id) ?? [], home.has(id));
      const source = actor.knownIdSources?.[id];
      if (source)
        knewFact(book, id, source.learnedAt, "recorded", source.sourceFactId);
      else if (
        !book.keptFacts.has(
          `knew-each-other:${[personId, id].sort().join(":")}`,
        )
      )
        knewFact(book, id, core.startedAt, "opening", actor.householdId);
    }
    // Recorded contact at the opening sets each thread's starting closeness.
    for (const id of core.relationshipsByPerson.get(personId) ?? []) {
      const row = core.relationships.get(id)!;
      const otherId = row.actorId === personId ? row.otherId : row.actorId;
      const thread = ensureThread(
        book,
        otherId,
        kin.get(otherId) ?? [],
        home.has(otherId),
      );
      thread.closeness = row.level;
      thread.lastContact = row.lastContactDate;
    }
    // The recorded past (owner answer 5): public eras are background for
    // everyone who lived through them, and a personal moment only where the
    // record says the era hit this person; personal facts are moments with an
    // impact estimated from the stress scale. Facts dated at or after the
    // opening describe the life as play starts and score nothing.
    const past = [...(actor.pastFacts ?? [])]
      .filter((fact) => fact.date < core.startedAt)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    for (const fact of past) {
      if (
        data.backdropPastFactPrefixes.some((prefix) =>
          fact.kind.startsWith(prefix),
        )
      ) {
        book.backdrop.push({
          id: `${personId}:past:${fact.id}`,
          personId,
          date: fact.date,
          sourceId: fact.id,
          kind: fact.kind,
          reach: "past",
        });
        for (const hit of data.pastEraHits) {
          const value = fact.facts?.[hit.factKey];
          if (value === undefined || data.pastNotRecordedValues.includes(value))
            continue;
          storePastMoment(
            book,
            fact,
            `${fact.kind}:${hit.factKey}`,
            hit.parameter,
            [],
          );
        }
        continue;
      }
      const row = data.pastFactMoments.find((entry) =>
        fact.kind.startsWith(entry.kindPrefix),
      );
      if (!row) continue;
      const related = [...kin]
        .filter(([otherId, relations]) => {
          const other = core.people.get(otherId);
          if (row.counterpart === "partner")
            return relations.includes("partner");
          if (row.counterpart === "child-born-that-day")
            return (
              relations.includes("child") && other?.birthDate === fact.date
            );
          return false;
        })
        .map(([otherId]) => otherId);
      storePastMoment(
        book,
        fact,
        fact.kind,
        row.parameter,
        related.length === one ? related : [],
      );
    }
    snapshots.set(personId, snapshot(core, actor));
  }

  /** A moment scored from the recorded past: journal material, never a scene. */
  function storePastMoment(
    book: PersonLedger,
    fact: { id: string; date: IsoDate },
    kind: string,
    parameter: string,
    counterpartIds: PersonId[],
  ): void {
    const impact = param(parameter);
    const moment: Moment = {
      id: `${book.personId}:${fact.date}:past:${fact.id}:${kind}`,
      personId: book.personId,
      date: fact.date,
      label: `past:${kind}`,
      // The core keeps a recorded-past fact on its person record, so the
      // moment cites that record and names the fact inside it.
      causeId: book.personId,
      causeFactId: fact.id,
      causeKind: kind,
      counterpartIds,
      impact,
      channels: [
        {
          channel: "past",
          raw: one,
          scale: impact,
          traitWeight: one,
          traits: [],
          contribution: impact,
        },
      ],
      hindsight: impact,
      hindsightAt: fact.date,
      past: true,
      echoes: [],
    };
    book.moments.push(moment);
    book.momentsById.set(moment.id, moment);
    for (const otherId of counterpartIds) {
      const list = book.momentsByOther.get(otherId) ?? [];
      list.push(moment.id);
      book.momentsByOther.set(otherId, list);
      ensureThread(book, otherId).momentIds.push(moment.id);
      // A dated record naming both people moves their first-known date back to it.
      const knew = book.keptFacts.get(
        `knew-each-other:${[book.personId, otherId].sort().join(":")}`,
      );
      if (knew && fact.date < knew.since) {
        knew.since = fact.date;
        knew.sinceBasis = "recorded";
        knew.sourceId = fact.id;
      }
    }
    book.schedule.push({
      momentId: moment.id,
      date: moment.date,
      outcome: "journal-line",
      mode: "before-opening",
      interrupt: false,
      stopsSkip: false,
      rank: zero,
      pace: zero,
      bindings: [],
    });
  }

  /** How strongly a date sits on a broad event's anniversary: highest on the date, halving every few days, no cut-off. */
  function anniversaryWeight(eventDate: IsoDate, date: IsoDate): number {
    const [year, month, day] = eventDate.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const now = Number(date.slice(zero, date.indexOf("-")));
    let nearest = Number.POSITIVE_INFINITY;
    for (const target of [now - one, now, now + one]) {
      if (target <= year) continue;
      const anniversary = new Date(Date.UTC(target, month - one, day))
        .toISOString()
        .slice(zero, eventDate.length);
      nearest = Math.min(
        nearest,
        Math.abs(daysBetween(makeIsoDate(anniversary), makeIsoDate(date))),
      );
    }
    if (!Number.isFinite(nearest)) return zero;
    return Math.pow(P.two, -nearest / param("directorAnniversaryHalfDays"));
  }

  /** The kept-fact key of a pair of people, built once per thread. */
  const factKeys = new WeakMap<Thread, string>();

  function fadingOf(thread: Thread, book: PersonLedger, date: IsoDate): number {
    // Living in one home is contact, whether or not the core records it.
    if (thread.sharedHome) return zero;
    let factKey = factKeys.get(thread);
    if (factKey === undefined) {
      factKey = `knew-each-other:${[thread.personId, thread.otherId].sort().join(":")}`;
      factKeys.set(thread, factKey);
    }
    const fact = book.keptFacts.get(factKey);
    const known = thread.lastContact ?? fact?.since;
    const last =
      thread.renewedAt && (!known || thread.renewedAt > known)
        ? thread.renewedAt
        : known;
    if (!last) return one;
    const days = Math.max(
      zero,
      daysBetween(makeIsoDate(last), makeIsoDate(date)),
    );
    const halfLife = thread.kin.length
      ? param("directorKinHalfLifeDays")
      : param("directorFriendHalfLifeDays");
    return one - Math.pow(P.two, -days / halfLife);
  }

  /** Forgotten broad events that hit both people in the thread. */
  function forgottenBroadFor(book: PersonLedger, thread: Thread): number {
    let sum = zero;
    for (const [eventId, impact] of book.forgottenBroad)
      if (ledger.hitBy.get(eventId)?.has(thread.otherId)) sum += impact;
    return sum;
  }

  /** A moment's impact without its re-entry part. */
  function historyOf(moment: Moment): number {
    return (
      moment.impact -
      moment.channels
        .filter((part) => part.channel === "re-entry")
        .reduce((sum, part) => sum + part.contribution, zero)
    );
  }

  function pairMoments(book: PersonLedger, otherId: PersonId): Moment[] {
    return (book.momentsByOther.get(otherId) ?? []).map((id) =>
      book.momentsById.get(id)!,
    );
  }

  /**
   * The moments that came from a broad event, kept as the person's moments
   * grow: a person's moments only ever grow by push, or are replaced by a
   * filtered copy, so each array is scanned once for its new entries.
   */
  const broadScans = new WeakMap<
    Moment[],
    { scanned: number; list: Moment[] }
  >();
  function broadMoments(book: PersonLedger): readonly Moment[] {
    let held = broadScans.get(book.moments);
    if (!held) {
      held = { scanned: zero, list: [] };
      broadScans.set(book.moments, held);
    }
    for (; held.scanned < book.moments.length; held.scanned += one) {
      const moment = book.moments[held.scanned]!;
      if (moment.broadEventId !== undefined) held.list.push(moment);
    }
    return held.list;
  }

  /** The pair's own moments, plus broad events that hit both of them. */
  function pairHistory(book: PersonLedger, otherId: PersonId): Moment[] {
    const shared = broadMoments(book).filter(
      (moment) => ledger.hitBy.get(moment.broadEventId!)?.has(otherId) === true,
    );
    return [...new Set([...pairMoments(book, otherId), ...shared])];
  }

  function importanceOf(
    book: PersonLedger,
    thread: Thread,
    date: IsoDate,
  ): number {
    const fading = fadingOf(thread, book, date);
    const discount = one - param("directorFadingDiscount") * fading;
    const forgotten =
      (thread.forgotten?.impact ?? zero) + forgottenBroadFor(book, thread);
    return (
      thread.tie +
      (pairHistory(book, thread.otherId).reduce(
        (sum, moment) => sum + moment.impact * discount,
        zero,
      ) +
        forgotten * discount)
    );
  }

  /**
   * Memories keep what matters and summarize the rest (owner, Oct 11). Moments
   * older than the recent window fold into a month's summary by label, except
   * the strongest by hindsight and any scene still waiting. A forgotten
   * moment's impact stays on its pair's thread, so importance is unchanged.
   * The player keeps every moment: the journal is theirs.
   */
  function forget(core: Readonly<CoreState>, book: PersonLedger): void {
    if (book.personId === core.playerId) return;
    const date = makeIsoDate(core.date);
    const window = param("directorMemoryRecentDays");
    const old = (at: string) => daysBetween(makeIsoDate(at), date) > window;
    const waiting = new Set(
      book.schedule
        .filter((entry) => entry.outcome === "scene-waiting")
        .map((entry) => entry.momentId),
    );
    const kept = new Set(
      book.moments
        .filter((moment) => old(moment.date) && !waiting.has(moment.id))
        .sort((a, b) => b.hindsight - a.hindsight || a.id.localeCompare(b.id))
        .slice(param("directorMemoryKeptMoments"))
        .map((moment) => moment.id),
    );
    if (kept.size) {
      for (const id of kept) {
        const moment = book.momentsById.get(id)!;
        const month = moment.date.slice(zero, moment.date.lastIndexOf("-"));
        const key = `${month}|${moment.label}`;
        const row = book.summaries.get(key) ?? {
          month,
          label: moment.label,
          count: zero,
          impact: zero,
          counterpartIds: [],
        };
        row.count += one;
        row.impact += moment.impact;
        for (const otherId of moment.counterpartIds)
          if (!row.counterpartIds.includes(otherId))
            row.counterpartIds.push(otherId);
        book.summaries.set(key, row);
        const broad = moment.broadEventId;
        if (broad)
          book.forgottenBroad.set(
            broad,
            (book.forgottenBroad.get(broad) ?? zero) + moment.impact,
          );
        for (const otherId of moment.counterpartIds) {
          const list = book.momentsByOther.get(otherId);
          if (list) {
            const left = list.filter((entry) => entry !== id);
            if (left.length) book.momentsByOther.set(otherId, left);
            else book.momentsByOther.delete(otherId);
          }
          const thread = book.threads.get(otherId);
          if (!thread) continue;
          thread.momentIds = thread.momentIds.filter((entry) => entry !== id);
          // A broad event that hit both is already counted by the event.
          if (broad && ledger.hitBy.get(broad)?.has(otherId)) continue;
          const sum = thread.forgotten ?? {
            count: zero,
            impact: zero,
            history: zero,
          };
          sum.count += one;
          sum.impact += moment.impact;
          sum.history += historyOf(moment);
          thread.forgotten = sum;
        }
        book.momentsById.delete(id);
      }
      book.moments = book.moments.filter((moment) => !kept.has(moment.id));
      book.schedule = book.schedule.filter(
        (entry) => !kept.has(entry.momentId),
      );
    }
    const backdrop = book.backdrop.filter((entry) => old(entry.date));
    if (backdrop.length) {
      for (const entry of backdrop)
        book.backdropCounts.set(
          entry.kind,
          (book.backdropCounts.get(entry.kind) ?? zero) + one,
        );
      book.backdrop = book.backdrop.filter((entry) => !old(entry.date));
    }
  }

  /**
   * Rescore the moments a pair shares by hindsight. `importance` holds each
   * counterpart's importance for this pass, so a moment with many
   * counterparts, stored for each of them, works each out once.
   */
  function rescoreHindsight(
    book: PersonLedger,
    otherId: PersonId,
    date: IsoDate,
    importance = new Map<PersonId, number>(),
  ) {
    const importanceFor = (id: PersonId) => {
      let value = importance.get(id);
      if (value === undefined) {
        const thread = book.threads.get(id);
        value = thread ? importanceOf(book, thread, date) : zero;
        importance.set(id, value);
      }
      return value;
    };
    for (const moment of pairMoments(book, otherId)) {
      moment.hindsight =
        moment.impact *
        (one +
          moment.counterpartIds.reduce(
            (sum, id) => sum + importanceFor(id),
            zero,
          ));
      moment.hindsightAt = date;
    }
  }

  function traitWeight(
    actor: Readonly<PersonState>,
    channelId: string,
    core: Readonly<CoreState>,
  ): { weight: number; traits: ChannelContribution["traits"] } {
    const scale = coreParam(core, "traitScale");
    let weight = one;
    const traits: { traitId: string; recorded: number; weight: number }[] = [];
    for (const row of channel(channelId).traitWeights) {
      const recorded = actor.traits[row.traitId];
      if (recorded === undefined) continue;
      const normalized = Math.min(
        one,
        Math.max(P.negativeOne, recorded / scale),
      );
      const factor = param(row.weightParameter);
      weight *= one + normalized * factor;
      traits.push({ traitId: row.traitId, recorded, weight: factor });
    }
    return { weight, traits };
  }

  // ---------------------------------------------------------------------
  // Daily measurement
  // ---------------------------------------------------------------------

  /**
   * Measures what changed for one watched person since the last measurement.
   * Every watched person is measured when the day closes. The controlled
   * person is also measured when an event reaches them before the day closes,
   * so their moment is rated at the time its event is recorded.
   */
  function measureDay(
    core: Readonly<CoreState>,
    book: PersonLedger,
    closing = true,
  ): void {
    const actor = core.people.get(book.personId);
    const before = snapshots.get(book.personId);
    if (!actor || !before) return;
    const date = core.date;
    const today = pending.get(book.personId) ?? { events: [], work: [] };
    pending.delete(book.personId);
    const changes = new Map<string, Change>();
    const change = (
      causeId: string,
      causeKind: string,
      channelId: string,
      raw: number,
      counterparts: readonly PersonId[] = [],
      broadEventId?: string,
    ): Change => {
      let row = changes.get(causeId);
      if (!row)
        changes.set(
          causeId,
          (row = {
            causeId,
            causeKind,
            counterparts: new Set(),
            raw: new Map(),
            renewals: new Set(),
          }),
        );
      for (const id of counterparts)
        if (id !== book.personId) row.counterparts.add(id);
      row.raw.set(channelId, (row.raw.get(channelId) ?? zero) + raw);
      if (broadEventId) row.broadEventId = broadEventId;
      return row;
    };

    // Feeling: the appraised impulse of each event the person met.
    for (const row of today.events) {
      const raw =
        (Math.abs(row.mood) + Math.max(zero, row.stress)) /
        param("directorFeelingSignals");
      if (raw > zero) {
        const made = change(
          row.event.id,
          `event:${row.event.kind}`,
          "feeling",
          raw,
          row.event.personIds,
        );
        if (row.event.personIds.includes(book.personId)) made.selfNamed = true;
      }
    }

    // Events an engine records without an appraised impact (a raise under a
    // new law) are sized from their own facts by the director's rules.
    for (const row of today.events) {
      const rule = data.eventImpacts?.find(
        (entry) => entry.eventKind === row.event.kind,
      );
      if (!rule) continue;
      let raw = zero;
      if (rule.impactParameter) {
        // The event's own impact reaches the people it names fully, and
        // those who learned of it through a tie by their relation.
        raw = param(rule.impactParameter);
        if (!row.event.personIds.includes(book.personId)) {
          const thread = row.event.personIds
            .map((id) => book.threads.get(id))
            .find(Boolean);
          if (!thread) continue;
          raw *=
            importanceOf(book, thread, date) /
            (one + importanceOf(book, thread, date));
        }
      } else if (rule.fromFact && rule.toFact) {
        if (!row.event.personIds.includes(book.personId)) continue;
        const before = Number(row.event.facts?.[rule.fromFact]);
        const after = Number(row.event.facts?.[rule.toFact]);
        if (!(before > zero) || !Number.isFinite(after)) continue;
        raw = Math.abs(after - before) / before;
      }
      if (raw <= zero) continue;
      const named = rule.counterpartFact
        ? row.event.facts?.[rule.counterpartFact]
        : undefined;
      const made = change(
        row.event.id,
        `event:${row.event.kind}`,
        rule.channel,
        raw,
        named ? [named] : row.event.personIds,
      );
      if (!named && row.event.personIds.includes(book.personId))
        made.selfNamed = true;
    }

    // Ties: every change in closeness, read once at the end of the day.
    directorStopgap("SG-P13-tie-day-order", ledger.stopgapHits);
    const fadedBefore = new Map<PersonId, number>();
    for (const id of core.relationshipsByPerson.get(book.personId) ?? []) {
      const row = core.relationships.get(id)!;
      const otherId = row.actorId === book.personId ? row.otherId : row.actorId;
      const prior = before.ties.get(id);
      const delta = row.level - (prior?.level ?? zero);
      const contacted =
        row.lastContactDate === date && prior?.lastContact !== date;
      if (delta === zero && !contacted) continue;
      const thread = ensureThread(book, otherId);
      const knew = book.keptFacts.get(
        `knew-each-other:${[book.personId, otherId].sort().join(":")}`,
      );
      const hadHistory =
        thread.lastContact !== undefined ||
        (knew !== undefined && knew.since < date);
      const fadingBefore = hadHistory ? fadingOf(thread, book, date) : zero;
      fadedBefore.set(otherId, fadingBefore);
      // Cites the relationship record; the moment id carries the date.
      const causeId = id;
      change(causeId, `contact:${row.kind}`, "tie", Math.abs(delta), [otherId]);
      if (
        thread.lastContact === undefined &&
        !prior &&
        fadingBefore < param("directorRenewedFading")
      )
        thread.turns.push({
          date,
          turn: "started",
          causeId,
          closeness: row.level,
        });
      thread.tone =
        delta > zero ? "rising" : delta < zero ? "souring" : thread.tone;
      thread.closeness = row.level;
      thread.lastContact = row.lastContactDate;
      knewFact(book, otherId, date, "recorded", causeId);
    }

    // Causes: a drive forming or growing stronger.
    for (const drive of actor.drives.values()) {
      const prior = before.drives.get(drive.id) ?? zero;
      if (drive.strength > prior)
        change(
          drive.sourceEventId,
          `drive:${drive.kind ?? drive.topic}`,
          "cause",
          drive.strength - prior,
        );
    }

    // Money: the household's pay changing, and unpaid wages.
    const pay = householdPay(core, actor.householdId);
    if (
      pay.total !== before.householdPay &&
      actor.householdId === before.householdId
    ) {
      const base = Math.max(pay.total, before.householdPay);
      const raw = Math.abs(pay.total - before.householdPay) / base;
      for (const [memberId, priorJob] of before.memberJobs) {
        const nowJob = pay.jobs.get(memberId);
        if (priorJob === nowJob) continue;
        // The work or employer record that day naming them (a layoff, a
        // closure), else the job itself; never another event that only
        // mentions them (a cause group's ad named a father whose job ended
        // that day).
        const named = today.events.find(
          (row) =>
            /^(?:work|organization)\./.test(row.event.kind) &&
            [...row.event.personIds, ...(row.event.witnessIds ?? [])].includes(
              memberId,
            ),
        );
        // A job the worker chose to leave (a quit for another job, leaving
        // work) is not a lost job: the worker's own record of the end says
        // which (`job:<id>:status`, its source).
        const endedBy = priorJob
          ? core.knowledgeByPerson.get(memberId)?.get(`job:${priorJob}:status`)
              ?.sourceId
          : undefined;
        const chosen = (data.chosenJobEnds ?? []).some((prefix) =>
          endedBy?.startsWith(prefix),
        );
        const kind =
          priorJob && !nowJob
            ? chosen
              ? "job-left"
              : "job-ended"
            : !priorJob && nowJob
              ? "job-started"
              : "job-changed";
        change(
          named ? named.event.id : (priorJob ?? nowJob)!,
          kind,
          "money",
          raw,
          memberId === book.personId ? [] : [memberId],
          named && ledger.broadEvents.has(named.event.id)
            ? named.event.id
            : undefined,
        );
        break;
      }
    }
    for (const receipt of today.work) {
      const monthly =
        actor.livingCostDailyMinor * param("directorCostHorizonDays");
      if (receipt.shortfallMinor > zero && monthly > zero)
        change(
          receipt.id,
          "unpaid-wages",
          "money",
          receipt.shortfallMinor / monthly,
        );
    }

    // Home and health.
    if (
      actor.householdId !== before.householdId ||
      actor.placeId !== before.placeId
    )
      change(actor.householdId, "moved", "home", one);
    if (before.alive && !actor.alive)
      change(book.personId, "died", "health", one);

    // Closed threads: a counterpart who died.
    for (const thread of book.threads.values())
      if (
        !thread.closedAt &&
        core.people.get(thread.otherId)?.alive === false
      ) {
        thread.closedAt = date;
        thread.turns.push({
          date,
          turn: "closed",
          causeId: thread.otherId,
          closeness: thread.closeness,
        });
      }

    // Re-entry: a change that names someone whose thread had faded adds the
    // pair's importance from before it faded, shared broad events included
    // (October 8, 2026 design, part 5, rule 1). One renewal per pair a day.
    const renewedToday = new Set<PersonId>();
    for (const row of changes.values())
      for (const otherId of row.counterparts) {
        const thread = book.threads.get(otherId);
        if (!thread || renewedToday.has(otherId)) continue;
        // Only someone with a recorded past can come back; a stranger cannot.
        const knew = book.keptFacts.get(
          `knew-each-other:${[book.personId, otherId].sort().join(":")}`,
        );
        if (
          !fadedBefore.has(otherId) &&
          thread.lastContact === undefined &&
          !(knew && knew.since < date)
        )
          continue;
        const fading = fadedBefore.get(otherId) ?? fadingOf(thread, book, date);
        if (fading < param("directorRenewedFading")) continue;
        renewedToday.add(otherId);
        row.renewals.add(otherId);
        // The history once: an earlier re-entry's own weight already held
        // the history before it, so it is left out rather than compounded.
        const importance =
          thread.tie +
          (thread.forgotten?.history ?? zero) +
          forgottenBroadFor(book, thread) +
          pairHistory(book, otherId).reduce(
            (sum, moment) => sum + historyOf(moment),
            zero,
          );
        if (importance > zero)
          row.raw.set(
            "re-entry",
            (row.raw.get("re-entry") ?? zero) + importance * fading,
          );
        thread.renewedAt = date;
        thread.turns.push({
          date,
          turn: "renewed",
          causeId: row.causeId,
          closeness: thread.closeness,
        });
        rescoreHindsight(book, otherId, date);
      }

    if (closing) book.observedDays += one;
    let scored = false;
    for (const row of changes.values()) {
      const contributions: ChannelContribution[] = [];
      for (const [channelId, raw] of row.raw) {
        const scale = param(channel(channelId).scaleParameter);
        const trait = traitWeight(actor, channelId, core);
        contributions.push({
          channel: channelId,
          raw,
          scale,
          traitWeight: trait.weight,
          traits: trait.traits,
          contribution: raw * scale * trait.weight,
        });
      }
      const impact = contributions.reduce(
        (sum, entry) => sum + entry.contribution,
        zero,
      );
      if (impact <= zero) continue;
      scored = true;
      const strongest = [...contributions].sort(
        (a, b) => b.contribution - a.contribution,
      )[zero]!;
      const label = `${strongest.channel}:${row.causeKind}`;
      if (impact < param("directorMomentFloor")) {
        book.belowFloor.set(label, (book.belowFloor.get(label) ?? zero) + one);
        continue;
      }
      const placeId = today.events.find(
        (entry) => entry.event.id === row.causeId,
      )?.event.placeId;
      if (placeId) row.placeId = placeId;
      storeMoment(core, book, row, label, impact, contributions);
    }
    if (closing && !scored) book.quietDays += one;
    snapshots.set(book.personId, snapshot(core, actor));
  }

  function storeMoment(
    core: Readonly<CoreState>,
    book: PersonLedger,
    row: Change,
    label: string,
    impact: number,
    contributions: ChannelContribution[],
  ): void {
    const date = core.date;
    const counterpartIds = [...row.counterparts].sort();
    // A cause measured twice in a day (once when its event is recorded, again
    // when the day closes) keeps one id per moment.
    const base = `${book.personId}:${date}:${row.causeId}`;
    let id = base;
    for (let n = P.two; book.momentsById.has(id); n += one) id = `${base}:${n}`;
    const moment: Moment = {
      id,
      personId: book.personId,
      date,
      label,
      causeId: row.causeId,
      causeKind: row.causeKind,
      counterpartIds,
      impact,
      channels: contributions,
      hindsight: impact,
      hindsightAt: date,
      ...(row.broadEventId ? { broadEventId: row.broadEventId } : {}),
      ...(row.placeId ? { placeId: row.placeId } : {}),
      ...(row.selfNamed ? { selfNamed: true as const } : {}),
      echoes: [],
    };
    // The label's channel is the strongest contribution.
    const strongest = label.slice(zero, label.indexOf(":"));
    for (const otherId of counterpartIds) {
      const earlier = pairMoments(book, otherId);
      const sameChannel = earlier
        .filter((entry) =>
          entry.channels.some((part) => part.channel === strongest),
        )
        .sort((a, b) => b.hindsight - a.hindsight)[zero];
      if (sameChannel)
        moment.echoes.push(
          link(
            sameChannel.id,
            "moment",
            otherId,
            "same-pair-channel",
            sameChannel.hindsight,
          ),
        );
      for (const id of book.keptFactsByOther.get(otherId) ?? []) {
        const fact = book.keptFacts.get(id)!;
        if (fact.kind === "knew-each-other") continue;
        moment.echoes.push(
          link(
            fact.id,
            "kept-fact",
            otherId,
            fact.endedAt === date ? "kept-fact-due" : "kept-fact-open",
            impact,
          ),
        );
      }
      // An anniversary: a broad event that hit both people links back, most
      // strongly near its date (owner answer 7). It never stages a scene.
      for (const shared of pairHistory(book, otherId)) {
        if (!shared.broadEventId || shared.id === moment.id) continue;
        const event = ledger.broadEvents.get(shared.broadEventId);
        // Within half a year of the event it is still recent, not an anniversary.
        const recent =
          !event ||
          daysBetween(makeIsoDate(event.date), makeIsoDate(date)) <
            coreParam(core, "yearSpanDays") / P.two;
        const weight = recent ? zero : anniversaryWeight(event.date, date);
        if (weight > zero)
          moment.echoes.push(
            link(
              shared.id,
              "moment",
              otherId,
              "anniversary",
              shared.hindsight * weight,
            ),
          );
      }
      if (row.renewals.has(otherId)) {
        const best = pairHistory(book, otherId)
          .filter((entry) => entry.id !== moment.id)
          .sort((a, b) => b.hindsight - a.hindsight)[zero];
        const knew = book.keptFacts.get(
          `knew-each-other:${[book.personId, otherId].sort().join(":")}`,
        );
        if (best)
          moment.echoes.push(
            link(best.id, "moment", otherId, "re-entry", best.hindsight),
          );
        else if (knew)
          moment.echoes.push(
            link(knew.id, "kept-fact", otherId, "re-entry", zero),
          );
      }
    }
    book.moments.push(moment);
    book.momentsById.set(moment.id, moment);
    if (moment.broadEventId) {
      let hit = ledger.hitBy.get(moment.broadEventId);
      if (!hit) ledger.hitBy.set(moment.broadEventId, (hit = new Set()));
      hit.add(book.personId);
    }
    for (const otherId of counterpartIds) {
      const list = book.momentsByOther.get(otherId) ?? [];
      list.push(moment.id);
      book.momentsByOther.set(otherId, list);
      const thread = ensureThread(book, otherId);
      thread.momentIds.push(moment.id);
      if (moment.channels.some((part) => part.channel === "tie"))
        thread.turns.push({
          date,
          turn: thread.tone === "souring" ? "soured" : "grew",
          causeId: row.causeId,
          momentId: moment.id,
          closeness: thread.closeness,
        });
    }
    // Every counterpart holds the moment before any is rescored, and each
    // counterpart's importance is worked out once for the moment.
    const importance = new Map<PersonId, number>();
    for (const otherId of counterpartIds)
      rescoreHindsight(book, otherId, date, importance);
    const filter = ledger.sceneFilters.get(moment.personId);
    const entry = scheduleMoment(core, book, moment, {
      mode,
      interruptImpact: param("directorInterruptImpact"),
      ...(filter ? { allowedKinds: new Set(filter.allowedKinds) } : {}),
    });
    book.schedule.push(entry);
    if (entry.interrupt) interrupts.push({ moment, entry });
  }

  /**
   * Tells the core's player clock that the controlled person's interrupting
   * moment stops it at the moment's own time: the clock's frontier when the
   * moment is measured. A moment rated as its event is recorded mid-day stops
   * the clock there; a moment measured as the day closes stops it at the
   * closing midnight, which is when the rest of the world's day is recorded.
   * A one-shot stop: the client's acknowledgment consumes it. Moments of
   * anyone not controlled stop nothing.
   */
  function registerInterrupts(core: CoreState): void {
    const line = param("directorInterruptImpact");
    for (const { moment, entry } of interrupts.splice(zero)) {
      if (
        !isExplicitlyControlledPersonV1(core, moment.personId) ||
        !core.people.get(moment.personId)?.alive
      )
        continue;
      const at = playerClockFrontierV1(core, moment.personId) ?? {
        date: addDays(makeIsoDate(core.date), one),
        minuteOfDay: zero,
      };
      registerModuleStopV1(core, {
        moduleId: module.id,
        recordId: moment.id,
        controlledPersonId: moment.personId,
        at,
        kind: "interrupt",
        reasonKey: data.interruptStop.reasonKey,
        source: {
          tag: "ESTIMATED",
          citation: data.interruptStop.citation,
          asOf: core.date,
          estimatedFrom: `Director moment ${moment.id}: impact ${moment.impact} at or over the interrupt line ${line}.`,
        },
        hold: false,
      });
      entry.stop = { recordId: moment.id, at };
    }
  }

  /**
   * Rates the controlled person's moment when its record is made. Before the
   * day closes the clock stands at the recording time, so an interrupting
   * moment stops it there. At the close the clock already stands at midnight
   * and the day-end measurement covers the rest of the world's day.
   */
  function rateNow(core: CoreState, personIds: readonly PersonId[]): void {
    for (const id of personIds) {
      const book = ledger.people.get(id);
      if (!book || !isExplicitlyControlledPersonV1(core, id)) continue;
      const now = playerClockFrontierV1(core, id);
      if (!now || now.date !== core.date) continue;
      measureDay(core, book, false);
      registerInterrupts(core);
    }
  }

  function link(
    earlierId: string,
    earlierKind: CallbackLink["earlierKind"],
    otherId: PersonId,
    reason: string,
    strength: number,
  ): CallbackLink {
    return { earlierId, earlierKind, otherId, reason, strength };
  }

  // ---------------------------------------------------------------------
  // Events as they happen
  // ---------------------------------------------------------------------

  /** Returns the watched people the event reached. */
  function onEvent(
    core: Readonly<CoreState>,
    event: CoreEventInput,
    learnedBy: readonly PersonId[],
  ): PersonId[] {
    const reached: PersonId[] = [];
    const named = new Set([...event.personIds, ...(event.witnessIds ?? [])]);
    const learned = new Set(learnedBy);
    const broad = data.broadEventFlags.some(
      (flag) => (event as unknown as Record<string, unknown>)[flag] === true,
    );
    for (const book of ledger.people.values()) {
      const id = book.personId;
      const actor = core.people.get(id);
      if (!actor) continue;
      let reach: string | undefined =
        named.has(id) || learned.has(id) ? "named" : undefined;
      if (!reach && broad) {
        const members = core.households.get(actor.householdId)?.memberIds ?? [];
        if (members.some((member) => named.has(member))) reach = "household";
        else if (
          actor.placeId === event.placeId ||
          actor.countyId === event.placeId
        )
          reach = "place";
      }
      if (!reach) continue;
      if (broad) recordBroad(core, event, book, reach);
      let mood = zero;
      let stress = zero;
      // A person who has died feels nothing; their death is the health moment.
      if (
        learned.has(id) &&
        actor.alive &&
        (event.moodImpulse !== undefined || event.stressImpulse !== undefined)
      ) {
        directorStopgap("SG-P13-appraisal-recompute", ledger.stopgapHits);
        const relation = event.personIds.reduce(
          (level, subject) =>
            Math.max(level, closenessBetween(core, id, subject)),
          zero,
        );
        const appraisal = appraiseEvent(
          actor,
          event,
          relation,
          parameterValues(core.data.parameters),
          core.data.appraisalTraits,
        );
        mood = appraisal.moodImpulse;
        stress = appraisal.stressImpulse;
      }
      pendingFor(id).events.push({ event, reach, mood, stress });
      reached.push(id);
      if (learned.has(id)) {
        produceKeptFacts(event, book);
        settleLies(core, event, book);
      }
    }
    return reached;
  }

  function recordBroad(
    core: Readonly<CoreState>,
    event: CoreEventInput,
    book: PersonLedger,
    reach: string,
  ): void {
    let record = ledger.broadEvents.get(event.id);
    if (!record)
      ledger.broadEvents.set(
        event.id,
        (record = {
          eventId: event.id,
          date: core.date,
          kind: event.kind,
          placeId: event.placeId,
          reached: [],
        }),
      );
    if (record.reached.some((row) => row.personId === book.personId)) return;
    record.reached.push({ personId: book.personId, reach });
    const entry: BackdropEntry = {
      id: `${book.personId}:broad:${event.id}`,
      personId: book.personId,
      date: core.date,
      sourceId: event.id,
      kind: event.kind,
      reach,
    };
    book.backdrop.push(entry);
  }

  function produceKeptFacts(event: CoreEventInput, book: PersonLedger): void {
    for (const kind of data.keptFactKinds) {
      if (!kind.producedBy.includes(event.kind)) continue;
      const [holderId, otherId] = event.personIds;
      if (!holderId || !otherId) continue;
      const fact: KeptFact = {
        id: `${kind.id}:${event.id}`,
        kind: kind.id,
        holderId,
        otherId,
        since: event.date,
        sinceBasis: "recorded",
        sourceId: event.id,
        ...(event.topic ? { concernsKey: event.topic } : {}),
      };
      keepFact(book, fact);
      if (kind.endsOn === "contradicting-fact-learned" && fact.concernsKey) {
        const key = `${otherId}|${fact.concernsKey}`;
        let set = ledger.liesByLearner.get(key);
        if (!set) ledger.liesByLearner.set(key, (set = new Set()));
        set.add(fact.id);
      }
    }
  }

  /** A lie ends the day its deceived person first learns the fact it denies. */
  function settleLies(
    core: Readonly<CoreState>,
    event: CoreEventInput,
    book: PersonLedger,
  ): void {
    for (const key of Object.keys(event.facts ?? {})) {
      const ids = ledger.liesByLearner.get(`${book.personId}|${key}`);
      if (!ids) continue;
      for (const factId of ids)
        for (const owner of ledger.people.values()) {
          const fact = owner.keptFacts.get(factId);
          if (fact && !fact.endedAt) {
            fact.endedAt = core.date;
            fact.endedBy = event.id;
          }
        }
      ledger.liesByLearner.delete(`${book.personId}|${key}`);
    }
  }

  const module: CoreModule = {
    id: "p13-story-director",
    eventKinds: data.eventKinds,
    onEvent(api, event, learnedBy) {
      if (!started) return;
      rateNow(api.state, onEvent(api.state, event, learnedBy));
    },
    relationshipKinds: data.relationshipKinds,
    onRelationshipChange(api, notice) {
      if (!started) return;
      rateNow(api.state, [notice.actorId, notice.otherId]);
    },
    onWorkResult(api, receipt) {
      if (!started || !ledger.people.has(receipt.personId)) return;
      if (receipt.shortfallMinor > zero)
        pendingFor(receipt.personId).work.push({ ...receipt });
    },
    onAfterDay(api) {
      if (!started)
        throw new Error("The story director was installed but not started.");
      for (const book of ledger.people.values()) measureDay(api.state, book);
      registerInterrupts(api.state);
      // Once a month, each watched person forgets what no longer matters.
      if (api.state.date.endsWith("-01"))
        for (const book of ledger.people.values()) forget(api.state, book);
    },
  };

  return {
    module,
    ledger,
    start(core) {
      if (started) return;
      started = true;
      for (const id of initial) beginWatching(core, id);
    },
    watch(core, personId) {
      if (!started)
        throw new Error(
          "Start the story director before watching more people.",
        );
      beginWatching(core, personId);
    },
    setMode(next) {
      mode = next;
    },
    setSceneFilter(personId, allowedKinds, date) {
      if (!allowedKinds) {
        ledger.sceneFilters.delete(personId);
        return null;
      }
      const known = new Set(SITUATION_LIBRARY.types.map((row) => row.key));
      const filter: SceneFilter = {
        id: `scene-filter:${personId}:${date}`,
        personId,
        allowedKinds: [...new Set(allowedKinds)]
          .filter((key) => known.has(key))
          .sort(),
        setOn: date,
      };
      ledger.sceneFilters.set(personId, filter);
      return filter;
    },
    importance(personId, otherId, date) {
      const book = ledger.people.get(personId);
      const thread = book?.threads.get(otherId);
      return book && thread ? importanceOf(book, thread, date) : zero;
    },
    fading(personId, otherId, date) {
      const book = ledger.people.get(personId);
      const thread = book?.threads.get(otherId);
      return book && thread ? fadingOf(thread, book, date) : one;
    },
  };
}
