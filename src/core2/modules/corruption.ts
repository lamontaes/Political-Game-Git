/**
 * Basic corruption (M3-09). A bribe is two decisions made through the core's
 * one chooser: someone who wants a favor decides whether to offer, and the
 * official decides whether to take it, each from their own traits, money and
 * tie to the other. A taken bribe moves the offerer's own money to the
 * official's own money through the cash journal, so every dollar balances and
 * the payment is on the books, and both hold the crime as a record. Nothing
 * rolls to catch anyone: it surfaces only through a real route, such as one
 * party falling out with the other and deciding to tell someone.
 */
import { scoreOffers, decisionFromScores } from "../choice";
import { closenessBetween, currentCloseness } from "../closeness";
import { decisionKinds, decisionLean } from "../trait-decisions";
import rows from "../data/corruption/parameters.json" with { type: "json" };
import type { CashJournalPosting } from "../journal";
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";

export const CORRUPTION_MODULE_ID = "corruption";
/** A bribe taken to the press: public record the news carries. */
export const SCANDAL_REPORTED = "scandal.reported";
const SOURCE_KIND = "corruption:bribe";
const PARAMETERS = rows as Readonly<Record<string, Parameter>>;
const c = (api: CoreAPI, key: string) => {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
};

export interface BribeAsk {
  offererId: PersonId;
  officialId: PersonId;
  /** What the favor is worth to the person who wants it, in minor units. */
  stakeMinor: number;
  /** What the favor is: a vote, a permit, a contract (a record id). */
  subjectId: string;
}

export interface CrimeRecord {
  id: string;
  kind: "bribe";
  date: string;
  offererId: PersonId;
  officialId: PersonId;
  amountMinor: number;
  subjectId: string;
  offered: boolean;
  taken: boolean;
  /** Taken bribes by this official that the offerer had learned of when offering (knowledge records). */
  heardOf?: readonly string[];
  reasons: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(CORRUPTION_MODULE_ID).table(name);
const pending = new WeakMap<
  object,
  { role: "offer" | "take" | "tell"; values: Record<string, number> }
>();
const journalRecords = new WeakMap<object, Map<string, unknown>>();
/** People party to a taken bribe, rebuilt from the table when first read. */
const partySets = new WeakMap<object, Set<PersonId>>();
function partiesOf(api: CoreAPI): Set<PersonId> {
  let set = partySets.get(api.state);
  if (!set) {
    set = new Set();
    for (const row of table(api, "crimes").rows() as unknown as CrimeRecord[])
      if (row.taken) set.add(row.offererId).add(row.officialId);
    partySets.set(api.state, set);
  }
  return set;
}

function closeness(api: CoreAPI, a: PersonId, b: PersonId): number {
  return closenessBetween(api.state, a, b);
}

/** The person's lean toward a corrupt act, from every trait through the shared trait table, about -1..1. */
function temperament(
  api: CoreAPI,
  person: Readonly<PersonState>,
  role: "offer" | "take" | "tell",
): number {
  return decisionLean(
    api.state,
    person,
    `corruption.${role}`,
    `corruption-${role}-yes`,
    `corruption-${role}-no`,
  );
}

function decide(
  api: CoreAPI,
  personId: PersonId,
  role: "offer" | "take" | "tell",
  values: Record<string, number>,
  targetId: string,
): { yes: boolean; values: Record<string, number> } {
  const action = (id: string, yes: boolean): ActionDefinition => ({
    id,
    actKinds: decisionKinds(`corruption.${role}`, id),
    goalKinds: [],
    need: "money",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "crime",
    effect: "corruption",
    reasonBindings: [
      {
        id: "circumstances",
        provider: "corruption-circumstances",
        weightParameter: "one",
        arguments: { yes: String(yes) },
        stopgapId: "SG-P15-corruption-weights",
      },
    ],
  });
  const offers: ActOffer[] = [
    action(`corruption-${role}-no`, false),
    action(`corruption-${role}-yes`, true),
  ].map((definition) => ({
    definition,
    targetId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  pending.set(api.state, { role, values });
  const scored = scoreOffers(api.state, personId, offers, {
    needValues: { money: api.parameter("zero") },
  });
  pending.delete(api.state);
  const decision = decisionFromScores(api.state, personId, scored);
  return {
    yes: decision.selected?.definition.id === `corruption-${role}-yes`,
    values,
  };
}

/**
 * What an official weighs in taking a bribe of this size from someone this
 * close: their temperament, the bribe against a month of living costs plus
 * the cash on hand (larger for someone with little cushion), and the tie.
 * Read without paying, so a calibration can order a town's adults by it.
 */
export function takeValues(
  api: CoreAPI,
  official: Readonly<PersonState>,
  amountMinor: number,
  tie: number,
): Record<string, number> {
  const month = official.livingCostDailyMinor * c(api, "daysPerMonth");
  return {
    temperament:
      c(api, "corruptionTakeTraitWeight") * temperament(api, official, "take"),
    // The bribe's share of the bribe plus the cushion: a sliding scale, not a ratio that grows without bound.
    need:
      (c(api, "corruptionNeedWeight") * amountMinor) /
      (amountMinor + month + official.liquidMinor + api.parameter("one")),
    tie: c(api, "corruptionTieWeight") * tie,
  };
}

/** Someone who wants a favor may offer a bribe; the official may take it. */
export function considerBribe(api: CoreAPI, ask: BribeAsk): CrimeRecord | null {
  const offerer = api.state.people.get(ask.offererId);
  const official = api.state.people.get(ask.officialId);
  if (!offerer?.alive || !official?.alive) return null;
  const amount = Math.min(
    offerer.liquidMinor,
    Math.round(ask.stakeMinor * c(api, "bribeShareOfStake")),
  );
  if (amount <= api.parameter("zero")) return null;
  const tie = closeness(api, ask.offererId, ask.officialId);
  const one = api.parameter("one");
  // What the offerer has learned of this official: bribes they are known to
  // have taken, from the offerer's own knowledge records.
  const heardOf = crimesKnownTo(api, ask.offererId)
    .filter((row) => row.taken && row.officialId === ask.officialId)
    .map((row) => row.id)
    .sort();
  const offer = decide(
    api,
    ask.offererId,
    "offer",
    {
      temperament:
        c(api, "corruptionTraitWeight") * temperament(api, offerer, "offer"),
      // How much the favor matters: its worth against a year of the
      // offerer's living costs.
      stake: Math.log1p(
        ask.stakeMinor /
          (offerer.livingCostDailyMinor * api.parameter("daysPerMeanYear") +
            one),
      ),
      tie: c(api, "corruptionTieWeight") * tie,
      reputation:
        c(api, "corruptionReputationWeight") * Math.log1p(heardOf.length),
    },
    ask.subjectId,
  );
  const take = offer.yes
    ? decide(
        api,
        ask.officialId,
        "take",
        takeValues(api, official, amount, tie),
        ask.subjectId,
      )
    : undefined;
  const id = `bribe:${api.state.date}:${ask.offererId}:${ask.officialId}:${ask.subjectId}`;
  const record: CrimeRecord = {
    id,
    kind: "bribe",
    date: api.state.date,
    offererId: ask.offererId,
    officialId: ask.officialId,
    amountMinor: amount,
    subjectId: ask.subjectId,
    offered: offer.yes,
    taken: !!take?.yes,
    ...(heardOf.length ? { heardOf } : {}),
    reasons: { offer: offer.values, ...(take ? { take: take.values } : {}) },
  };
  if (!offer.yes) return record;
  // A taken bribe is on the record once the money has moved.
  if (record.taken) pay(api, record);
  table(api, "crimes").put(record as unknown as { id: string });
  if (record.taken) partiesOf(api).add(record.offererId).add(record.officialId);
  // Both parties hold the act; no one else does.
  for (const personId of [ask.offererId, ask.officialId])
    api.observe(personId, {
      key: `crime:${id}`,
      value: record.taken ? "bribe-taken" : "bribe-refused",
      learnedAt: api.state.date,
      sourceId: id,
      access: "self",
    });
  return record;
}

/** The offerer's own money to the official's own money, on the books. */
function pay(api: CoreAPI, record: CrimeRecord): void {
  const state = api.state as CoreState;
  const journal = state.cashJournal;
  const from = journal.residualAccountByOwner.get(record.offererId);
  const to = journal.residualAccountByOwner.get(record.officialId);
  if (!from || !to)
    throw new Error("A bribe requires both people's cash accounts.");
  const postings: CashJournalPosting[] = [
    {
      id: `${record.id}:from`,
      accountId: from,
      deltaMinor: -record.amountMinor,
    },
    { id: `${record.id}:to`, accountId: to, deltaMinor: record.amountMinor },
  ];
  let held = journalRecords.get(api.state);
  if (!held) journalRecords.set(api.state, (held = new Map()));
  held.set(record.id, {
    resolved: {
      kind: SOURCE_KIND,
      id: record.id,
      date: api.state.date,
      source: {
        tag: "ESTIMATED",
        citation: "A bribe offered and taken through the shared chooser.",
        asOf: api.state.date,
        estimatedFrom: "SG-P15-corruption-weights",
      },
      expectedPostings: postings,
      requiredRelatedRefs: [],
      relatedRecords: [],
    },
    marker: {},
  });
  api.postJournal({
    id: `journal:${api.state.date}:${journal.nextSequence}`,
    date: api.state.date,
    expectedSequence: journal.nextSequence,
    sourceRef: { kind: SOURCE_KIND, id: record.id },
    postings,
  });
}

export function crimesKnownTo(api: CoreAPI, personId: PersonId): CrimeRecord[] {
  const known = api.state.knowledgeByPerson.get(personId);
  return [...(known?.values() ?? [])]
    .filter((fact) => fact.key.startsWith("crime:"))
    .map((fact) => table(api, "crimes").get(fact.key.slice("crime:".length)))
    .filter(Boolean) as unknown as CrimeRecord[];
}

export const corruptionModule: CoreModule = {
  id: CORRUPTION_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      crimes: {
        indexes: {
          byOfferer: { fields: ["offererId"] },
          byOfficial: { fields: ["officialId"] },
        },
      },
      surfaced: { indexes: { byCrime: { fields: ["crimeId"] } } },
      reported: { indexes: { byOfficial: { fields: ["officialId"] } } },
      settled: { indexes: { byCrime: { fields: ["crimeId"] } } },
    },
  },
  journalSourceProviders: {
    [SOURCE_KIND]: (api, reference) =>
      journalRecords.get(api.state)?.get(reference.id) as never,
  },
  reasonProviders: {
    "corruption-circumstances": (api, actor, _offer, binding) => {
      const held = pending.get(api.state);
      if (!held) return undefined;
      return {
        value:
          binding.arguments?.yes === "true"
            ? Object.values(held.values).reduce(
                (a, b) => a + b,
                api.parameter("zero"),
              )
            : held.role === "tell"
              ? c(api, "corruptionQuietPull")
              : held.role === "take"
                ? c(api, "corruptionTakeHonestPull")
                : c(api, "corruptionHonestPull"),
        sourceIds: [actor.id],
      };
    },
  },
  relationshipKinds: ["*"],
  onRelationshipChange(api, notice) {
    // Most ties have no crime behind them: skip them without a table read.
    const parties = partiesOf(api);
    if (!parties.has(notice.actorId) || !parties.has(notice.otherId)) return;
    // A party to a taken bribe whose tie to the other sours may tell someone.
    const level = notice.changes.find((row) => row.measure === "level");
    if (!level || level.measure !== "level" || level.after >= level.before)
      return;
    for (const [tellerId, otherId] of [
      [notice.actorId, notice.otherId],
      [notice.otherId, notice.actorId],
    ] as const) {
      const shared = (
        table(api, "crimes").query("byOfferer", [
          tellerId,
        ]) as unknown as CrimeRecord[]
      )
        .concat(
          table(api, "crimes").query("byOfficial", [
            tellerId,
          ]) as unknown as CrimeRecord[],
        )
        .filter(
          (row) =>
            row.taken &&
            (row.offererId === otherId || row.officialId === otherId) &&
            !(table(api, "surfaced").query("byCrime", [row.id]) as unknown[])
              .length,
        );
      for (const crime of shared) {
        const teller = api.state.people.get(tellerId);
        if (!teller?.alive) continue;
        const told = decide(
          api,
          tellerId,
          "tell",
          {
            soured:
              c(api, "corruptionTellWeight") * (level.before - level.after),
            temperament:
              c(api, "corruptionTraitWeight") *
              temperament(api, teller, "tell"),
          },
          crime.id,
        );
        if (!told.yes) continue;
        // To the person they are closest to, other than the one they fell out with.
        let listener: PersonId | undefined;
        let best = -Infinity;
        for (const id of api.state.relationshipsByPerson.get(tellerId) ?? []) {
          const row = api.state.relationships.get(id)!;
          const other = row.actorId === tellerId ? row.otherId : row.actorId;
          if (other === otherId || !api.state.people.get(other)?.alive)
            continue;
          const level = currentCloseness(api.state, row);
          if (level > best) {
            best = level;
            listener = other;
          }
        }
        if (!listener) continue;
        const eventId = `${crime.id}:told:${tellerId}:${api.state.date}`;
        api.emit({
          id: eventId,
          date: api.state.date,
          kind: "crime.told",
          personIds: [listener],
          witnessIds: [tellerId],
          placeId: teller.placeId,
          facts: { [`crime:${crime.id}`]: "bribe-taken" },
          source: {
            tag: "SOURCED",
            citation:
              "A party to a recorded bribe told someone after falling out with the other.",
            asOf: api.state.date,
          },
        });
        table(api, "surfaced").put({
          id: eventId,
          crimeId: crime.id,
          tellerId,
          listenerId: listener,
          date: api.state.date,
          reasons: told.values,
        });
        reportToPress(api, crime, listener);
      }
    }
  },
};

/**
 * Whoever learns of a bribe decides whether to take it to the press: the
 * farther they are from the official, the less they hold back, and their
 * temperament leans one way or the other. A report is public record, so the
 * local outlet carries it and readers and word of mouth spread it; nobody
 * holds the scandal against the official until it reaches them.
 */
function reportToPress(
  api: CoreAPI,
  crime: CrimeRecord,
  listenerId: PersonId,
): void {
  const listener = api.state.people.get(listenerId);
  const official = api.state.people.get(crime.officialId);
  if (!listener?.alive || !official) return;
  const reported = decide(
    api,
    listenerId,
    "tell",
    {
      distance:
        c(api, "corruptionReportWeight") *
        (api.parameter("one") -
          closenessBetween(
            api.state as CoreState,
            listenerId,
            crime.officialId,
          )),
      temperament:
        c(api, "corruptionTraitWeight") * temperament(api, listener, "tell"),
    },
    `${crime.id}:report`,
  );
  if (!reported.yes) return;
  const id = `${crime.id}:reported:${listenerId}:${api.state.date}`;
  api.emit({
    id,
    date: api.state.date,
    kind: SCANDAL_REPORTED,
    personIds: [crime.officialId],
    witnessIds: [listenerId],
    placeId: official.placeId,
    publicRecord: true,
    news: true,
    facts: { crimeId: crime.id, officialId: crime.officialId },
    source: {
      tag: "SOURCED",
      citation: "Someone who learned of a recorded bribe took it to the press.",
      asOf: api.state.date,
    },
  });
  table(api, "reported").put({
    id,
    crimeId: crime.id,
    officialId: crime.officialId,
    reporterId: listenerId,
    date: api.state.date,
    reasons: reported.values,
  });
}

/**
 * What the bribes an official took on one decision pull them toward: each
 * taken bribe's amount against a month of the official's living costs,
 * sliding toward the offerer's side and never past the weight. Zero where
 * none was taken. (The offerers are those who lose money on it, so the pull
 * is against the subject.)
 */
export function bribePull(
  api: CoreAPI,
  officialId: PersonId,
  subjectId: string,
): number {
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return 0;
  const official = api.state.people.get(officialId);
  if (!official) return 0;
  const taken = (
    table(api, "crimes").query("byOfficial", [
      officialId,
    ]) as unknown as CrimeRecord[]
  )
    .filter((row) => row.taken && row.subjectId === subjectId)
    .reduce((sum, row) => sum + row.amountMinor, 0);
  if (!taken) return 0;
  const month = official.livingCostDailyMinor * c(api, "daysPerMonth");
  return -c(api, "bribeVoteWeight") * (taken / (taken + month));
}

/**
 * A bribe taken on a bill is settled when the bill is voted. The payers are
 * those who lose money on it, so the favor is a "no"; an official who took
 * the money and voted "yes" cheated the payer, who loses closeness to them in
 * proportion to what the bribe was worth against the payer's own living costs.
 * That souring is the real route by which a taken bribe surfaces (the tie
 * handler below decides whether the payer tells someone). A bribe delivered
 * keeps the tie as it was. Each bribe is settled once.
 */
export function settleBribes(
  api: CoreAPI,
  billId: string,
  voteOf: (officialId: PersonId) => "yes" | "no" | "abstain" | undefined,
): void {
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return;
  const taken = (
    table(api, "crimes").rows() as unknown as CrimeRecord[]
  ).filter((row) => row.taken && row.subjectId === billId);
  for (const crime of taken) {
    const id = `settled:${crime.id}`;
    if (table(api, "settled").get(id)) continue;
    const vote = voteOf(crime.officialId);
    if (vote === undefined) continue;
    const delivered = vote !== "yes";
    table(api, "settled").put({
      id,
      crimeId: crime.id,
      billId,
      date: api.state.date,
      vote,
      delivered,
    });
    const payer = api.state.people.get(crime.offererId);
    if (delivered || !payer?.alive || !api.state.people.get(crime.officialId))
      continue;
    const hours =
      c(api, "bribeBreachHoursPerDayOfCost") *
      (crime.amountMinor / Math.max(payer.livingCostDailyMinor, 1));
    api.relationship(
      crime.offererId,
      crime.officialId,
      "contact",
      -hours,
      undefined,
      { cause: "bribe-unrewarded", sourceId: crime.id },
    );
  }
}

/** The scandal stories reported about an official by the date (each a news story id). */
export function scandalsOf(
  api: CoreAPI,
  officialId: PersonId,
  date: string,
): readonly string[] {
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return [];
  return (
    table(api, "reported").query("byOfficial", [officialId]) as unknown as {
      id: string;
      date: string;
    }[]
  )
    .filter((row) => row.date <= date)
    .map((row) => row.id);
}
