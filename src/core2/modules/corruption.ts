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
  for (const id of api.state.relationshipsByPerson.get(a) ?? []) {
    const row = api.state.relationships.get(id)!;
    if (row.actorId === b || row.otherId === b) return row.level;
  }
  return api.parameter("zero");
}

/** The person's lean toward a corrupt act, from risk-taking and low reliability. */
function temperament(api: CoreAPI, person: Readonly<PersonState>): number {
  const zero = api.parameter("zero");
  const risk = person.traits["people-mind-v1:risk"] ?? zero;
  const reliability = person.traits["people-mind-v1:reliability"] ?? zero;
  return (risk - reliability) / (api.parameter("two") * api.parameter("two"));
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
    actKinds: yes ? ["self-interest"] : ["follow-rules"],
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
  const offer = decide(
    api,
    ask.offererId,
    "offer",
    {
      temperament: c(api, "corruptionTraitWeight") * temperament(api, offerer),
      // How much the favor matters: its worth against a year of the
      // offerer's living costs.
      stake: Math.log1p(
        ask.stakeMinor /
          (offerer.livingCostDailyMinor * api.parameter("daysPerMeanYear") +
            one),
      ),
      tie: c(api, "corruptionTieWeight") * tie,
    },
    ask.subjectId,
  );
  const month = official.livingCostDailyMinor * c(api, "daysPerMonth");
  const take = offer.yes
    ? decide(
        api,
        ask.officialId,
        "take",
        {
          temperament:
            c(api, "corruptionTraitWeight") * temperament(api, official),
          // The bribe against a month of living costs plus the cash on hand:
          // larger for someone with little cushion.
          need:
            (c(api, "corruptionNeedWeight") * amount) /
            (month + official.liquidMinor + one),
          tie: c(api, "corruptionTieWeight") * tie,
        },
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
    reasons: { offer: offer.values, ...(take ? { take: take.values } : {}) },
  };
  if (!offer.yes) return record;
  table(api, "crimes").put(record as unknown as { id: string });
  if (record.taken) {
    pay(api, record);
    partiesOf(api).add(record.offererId).add(record.officialId);
  }
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
              c(api, "corruptionTraitWeight") * temperament(api, teller),
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
          if (row.level > best) {
            best = row.level;
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
      }
    }
  },
};
