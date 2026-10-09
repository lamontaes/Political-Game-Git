/**
 * The story director on the new core: a read-only module that turns what
 * happens to a watched person into moments, threads, kept facts and
 * background entries (docs/design/director-on-core2.md).
 *
 * It reads the core through its module callbacks and its state, and calls no
 * writer. Impact is measured from the change itself on each channel, sized by
 * the person's own traits; there is no list of moment kinds. Nothing here
 * draws by chance.
 */
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { appraiseEvent } from "../core2/emotion";
import { P, parameterValues } from "../core2/parameters";
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
import { scheduleMoment } from "./scheduling";
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
  };
  const snapshots = new Map<PersonId, Snapshot>();
  const pending = new Map<PersonId, Pending>();
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
    // Public eras the person lived through are background, not personal moments.
    for (const fact of actor.pastFacts ?? [])
      if (
        data.backdropPastFactPrefixes.some((prefix) =>
          fact.kind.startsWith(prefix),
        )
      )
        book.backdrop.push({
          id: `${personId}:past:${fact.id}`,
          personId,
          date: fact.date,
          sourceId: fact.id,
          kind: fact.kind,
          reach: "past",
        });
    snapshots.set(personId, snapshot(core, actor));
  }

  function fadingOf(thread: Thread, book: PersonLedger, date: IsoDate): number {
    // Living in one home is contact, whether or not the core records it.
    if (thread.sharedHome) return zero;
    const fact = book.keptFacts.get(
      `knew-each-other:${[thread.personId, thread.otherId].sort().join(":")}`,
    );
    const last = thread.lastContact ?? fact?.since;
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

  function pairMoments(book: PersonLedger, otherId: PersonId): Moment[] {
    return (book.momentsByOther.get(otherId) ?? []).map((id) =>
      book.momentsById.get(id)!,
    );
  }

  /** The pair's own moments, plus broad events that hit both of them. */
  function pairHistory(book: PersonLedger, otherId: PersonId): Moment[] {
    const shared = book.moments.filter(
      (moment) =>
        moment.broadEventId !== undefined &&
        ledger.hitBy.get(moment.broadEventId)?.has(otherId) === true,
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
    return (
      thread.tie +
      pairHistory(book, thread.otherId).reduce(
        (sum, moment) => sum + moment.impact * discount,
        zero,
      )
    );
  }

  function rescoreHindsight(
    book: PersonLedger,
    otherId: PersonId,
    date: IsoDate,
  ) {
    for (const moment of pairMoments(book, otherId)) {
      moment.hindsight =
        moment.impact *
        (one +
          moment.counterpartIds.reduce((sum, id) => {
            const thread = book.threads.get(id);
            return sum + (thread ? importanceOf(book, thread, date) : zero);
          }, zero));
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

  function measureDay(core: Readonly<CoreState>, book: PersonLedger): void {
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
      if (raw > zero)
        change(
          row.event.id,
          `event:${row.event.kind}`,
          "feeling",
          raw,
          row.event.personIds,
        );
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
      const causeId = `tie:${id}:${date}`;
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
        const named = today.events.find((row) =>
          [...row.event.personIds, ...(row.event.witnessIds ?? [])].includes(
            memberId,
          ),
        );
        const kind =
          priorJob && !nowJob
            ? "job-ended"
            : !priorJob && nowJob
              ? "job-started"
              : "job-changed";
        change(
          named ? named.event.id : `job:${priorJob ?? nowJob}:${date}`,
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
      change(`home:${book.personId}:${date}`, "moved", "home", one);
    if (before.alive && !actor.alive)
      change(`death:${book.personId}`, "died", "health", one);

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
          causeId: `death:${thread.otherId}`,
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
        const importance =
          thread.tie +
          pairHistory(book, otherId).reduce(
            (sum, moment) => sum + moment.impact,
            zero,
          );
        if (importance > zero)
          row.raw.set(
            "re-entry",
            (row.raw.get("re-entry") ?? zero) + importance * fading,
          );
        thread.turns.push({
          date,
          turn: "renewed",
          causeId: row.causeId,
          closeness: thread.closeness,
        });
        rescoreHindsight(book, otherId, date);
      }

    book.observedDays += one;
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
    if (!scored) book.quietDays += one;
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
    const moment: Moment = {
      id: `${book.personId}:${date}:${row.causeId}`,
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
      rescoreHindsight(book, otherId, date);
    }
    book.schedule.push(
      scheduleMoment(core, book, moment, {
        mode,
        interruptImpact: param("directorInterruptImpact"),
      }),
    );
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

  function onEvent(
    core: Readonly<CoreState>,
    event: CoreEventInput,
    learnedBy: readonly PersonId[],
  ): void {
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
            Math.max(
              level,
              core.relationships.get([id, subject].sort().join(":"))?.level ??
                zero,
            ),
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
      if (learned.has(id)) {
        produceKeptFacts(event, book);
        settleLies(core, event, book);
      }
    }
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
      onEvent(api.state, event, learnedBy);
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
