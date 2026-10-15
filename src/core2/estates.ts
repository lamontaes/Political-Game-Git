/**
 * A full person's estate when they die (money stress audit defect 6; owner,
 * Oct 14: wills, probate, debts and taxes before heirs). Standing payments
 * to them (a benefit award) end. Their debts come first: what they owed and
 * hadn't paid on each standing payment is paid from the estate, and the
 * payment ends. Then probate: where the estates module runs, the estate
 * waits `probateDays` (a timeline, not a scene). Then the heirs: by the
 * person's will, where their traits and age led them to make one, in shares
 * by closeness among their family; else by the intestate order in
 * `data/estates.json` (Uniform Probate Code §2-102 to §2-103), equally within
 * the first class with anyone living; with no kin it escheats to their state
 * (UPC §2-105). The settlement is a public record.
 *
 * Before the heirs take, the estate pays the federal and state estate taxes
 * in force, and each heir's share pays the state's inheritance tax by their
 * relation (`laws-death-taxes.ts`, the law in force read on the day probate
 * closes); each heir gets the estate's accounting, naming the laws.
 *
 * Stopgaps: SG-CORE-estate-cash-only (homes, loans and businesses are not
 * settled) and SG-CORE-owner-decision-trusts (no trusts: how far trusts go
 * in 1.0 is the owner's call).
 */
import data from "./data/estates.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { outsideGovernment } from "./outside-governments";
import { estateTaxes, inheritanceTax, type DeathTax } from "./laws-death-taxes";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { closenessBetween } from "./closeness";
import { decisionLean } from "./trait-decisions";
import { registerModule } from "./state";
import { endRecipientIncomeAtDeath } from "./finance-state";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "./types";

export const ESTATES_MODULE_ID = "core2-estates-v1";
const PROBATE_CLOSES = "probate-closes";

export const ESTATES = data;

/** The relation the decedent recorded for each relative, from their past facts. */
function relationsOf(person: Readonly<PersonState>): Map<PersonId, string> {
  const out = new Map<PersonId, string>();
  for (const fact of person.pastFacts ?? []) {
    const otherId = fact.facts?.otherPersonId;
    if (!otherId || !fact.kind.startsWith("family:")) continue;
    if (!out.has(otherId)) out.set(otherId, fact.kind.slice("family:".length));
  }
  return out;
}

type OrderRow = (typeof data.intestateOrder)[number];

/** The living kin who inherit: the first class of the intestate order with anyone in it. */
export function heirsOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): { heirs: readonly PersonId[]; row?: OrderRow } {
  const relations = relationsOf(person);
  for (const row of data.intestateOrder) {
    const heirs = [...relations]
      .filter(
        ([id, relation]) =>
          row.relations.includes(relation) &&
          api.state.people.get(id)?.alive === true,
      )
      .map(([id]) => id)
      .sort();
    if (heirs.length) return { heirs, row };
  }
  return { heirs: [] };
}

/**
 * The state an heirless estate escheats to: the decedent's own. The town's
 * state keeps a treasury when the budgets engine runs; any other state is an
 * outside government.
 */
function escheatTo(
  api: CoreAPI,
  person: Readonly<PersonState>,
): string | undefined {
  const own = api.state.modules.has(BUDGETS_MODULE_ID)
    ? governments(api).find((row) => row.level === data.escheat.to)
    : undefined;
  // Officials and others recorded at a state hold its key as their place.
  const stateKey = /^US-[A-Z]{2}$/.test(person.placeId)
    ? person.placeId
    : own?.id;
  if (!stateKey) return undefined;
  if (own && own.id === stateKey) return own.organizationId;
  return outsideGovernment(api, stateKey);
}

/** The decedent's state: where they are recorded, or the town's own state. */
function stateOf(api: CoreAPI, person: Readonly<PersonState>): string | null {
  if (/^US-[A-Z]{2}$/.test(person.placeId)) return person.placeId;
  const own = api.state.modules.has(BUDGETS_MODULE_ID)
    ? governments(api).find((row) => row.level === "state")
    : undefined;
  if (own) return own.id;
  return api.state.modules.has(LAWS_MODULE_ID) ? lawChain(api).stateKey : null;
}

/** The treasury a tax is paid to: the government's own where this world keeps it, else an outside government. */
function treasuryOf(api: CoreAPI, jurisdiction: string): string {
  const own = api.state.modules.has(BUDGETS_MODULE_ID)
    ? governments(api).find((row) =>
        jurisdiction === "US"
          ? row.level === "federal"
          : row.id === jurisdiction,
      )
    : undefined;
  return own?.organizationId ?? outsideGovernment(api, jurisdiction);
}

/**
 * Whether the person made a will, from their traits and age: the trait lean
 * toward planning ahead over leaving things be (the shared trait table), plus
 * how much older than `willAgeMidpointYears` they are. Their will leaves
 * their estate to their living family in shares by how close each is.
 */
export function willOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): readonly { id: PersonId; weight: number }[] | null {
  const p = (key: string) => api.parameter(key);
  const age =
    daysBetween(makeIsoDate(person.birthDate), makeIsoDate(api.state.date)) /
    p("daysPerMeanYear");
  const lean = decisionLean(
    api.state,
    person,
    "estates.will",
    "make-will",
    "leave-it",
  );
  const score =
    lean +
    (p("willAgeWeight") * (age - p("willAgeMidpointYears"))) /
      p("willAgeMidpointYears");
  if (score <= p("zero")) return null;
  const shares = [...person.familyIds]
    .filter((id) => api.state.people.get(id)?.alive)
    .sort()
    .map((id) => ({ id, weight: closenessBetween(api.state, person.id, id) }))
    .filter((row) => row.weight > p("zero"));
  return shares.length ? shares : null;
}

/** Debts first: pays what the person owed and hadn't paid on each standing payment, then ends it. */
function payDebts(api: CoreAPI, personId: PersonId, from: string): number {
  const accounts = api.accounts();
  let paid = api.parameter("zero");
  for (const row of accounts.obligationsFrom(from)) {
    const owed = Math.min(row.arrearsMinor, accounts.balance(from));
    if (owed > api.parameter("zero")) {
      accounts.transfer({
        id: `estate-debt:${personId}:${row.id}`,
        from,
        to: row.to,
        amountMinor: owed,
        reasonKey: "estate.debt",
        source: {
          tag: "SOURCED",
          asOf: api.state.date,
          citation: `Estate of ${personId}: unpaid ${row.reasonKey} (${row.id}). Uniform Probate Code §3-805: debts are paid from the estate before heirs take.`,
        },
      });
      paid += owed;
    }
    accounts.endObligation(row.id);
  }
  return paid;
}

/**
 * Settle a dead person's estate: their payments end and their debts are paid
 * at once; the heirs take after probate where the estates module runs (else
 * now). Returns who received what now.
 */
export function settleEstate(
  api: CoreAPI,
  personId: PersonId,
  deathEventId: string,
): readonly { toId: string; amountMinor: number }[] {
  const person = api.state.people.get(personId);
  if (!person || person.alive) return [];
  const accounts = api.accounts();
  const from = accounts.main(personId);
  // Benefits, pensions and other standing payments to them stop with their death.
  accounts.endObligationsTo(from);
  endRecipientIncomeAtDeath(api.state as CoreState, personId);
  payDebts(api, personId, from);
  if (accounts.balance(from) <= api.parameter("zero")) return [];
  if (api.state.modules.has(ESTATES_MODULE_ID)) {
    api.moduleCalendar(ESTATES_MODULE_ID).schedule({
      key: `${PROBATE_CLOSES}:${personId}`,
      date: addDays(makeIsoDate(api.state.date), api.parameter("probateDays")),
      kind: PROBATE_CLOSES,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `Probate of the estate of ${personId} after ${deathEventId}.`,
        estimatedFrom: "probateDays",
      },
      sourceRecordIds: [personId, deathEventId],
    });
    return [];
  }
  return distribute(api, personId, deathEventId);
}

/** Probate closes: the estate passes by the will, or by the law. */
function distribute(
  api: CoreAPI,
  personId: PersonId,
  deathEventId: string,
): readonly { toId: string; amountMinor: number }[] {
  const person = api.state.people.get(personId);
  if (!person) return [];
  const accounts = api.accounts();
  const from = accounts.main(personId);
  const estate = accounts.balance(from);
  if (estate <= api.parameter("zero")) return [];
  api.stopgap(data.stopgapId);
  // No trusts: everything passes through probate.
  api.stopgap("SG-CORE-owner-decision-trusts");
  const will = willOf(api, person);
  const { heirs, row } = will
    ? { heirs: [], row: undefined }
    : heirsOf(api, person);
  const treasury = will || heirs.length ? undefined : escheatTo(api, person);
  const takers: { id: string; weight: number }[] = will
    ? [...will]
    : heirs.length
      ? heirs.map((id) => ({ id, weight: api.parameter("one") }))
      : treasury
        ? [{ id: treasury, weight: api.parameter("one") }]
        : [];
  if (!takers.length) return [];
  const paid: { toId: string; amountMinor: number }[] = [];
  // Before the heirs, the estate pays the estate taxes in force (an heirless
  // estate goes whole to the state). Each heir's share then pays their
  // state's inheritance tax by their relation to the decedent.
  const inherits = Boolean(will) || heirs.length > 0;
  const stateKey = stateOf(api, person);
  const taxes: DeathTax[] = [];
  const payTax = (tax: DeathTax) => {
    const to = treasuryOf(api, tax.jurisdiction);
    accounts.transfer({
      id: `estate:${personId}:${tax.series}:${tax.jurisdiction}${tax.heirId ? `:${tax.heirId}` : ""}`,
      from,
      to: accounts.main(to),
      amountMinor: tax.amountMinor,
      reasonKey: `estate.${tax.series}`,
      source: {
        tag: "SOURCED",
        asOf: api.state.date,
        citation: `Estate of ${personId} after ${deathEventId}: ${tax.lawId}`,
      },
    });
    taxes.push(tax);
    paid.push({ toId: to, amountMinor: tax.amountMinor });
  };
  let net = estate;
  if (inherits)
    for (const tax of estateTaxes(api, stateKey, estate)) {
      const amountMinor = Math.min(tax.amountMinor, net);
      if (amountMinor <= api.parameter("zero")) continue;
      payTax({ ...tax, amountMinor });
      net -= amountMinor;
    }
  const relations = relationsOf(person);
  const total = takers.reduce(
    (n, taker) => n + taker.weight,
    api.parameter("zero"),
  );
  const shares = takers.map((taker) =>
    Math.floor((net * taker.weight) / total),
  );
  takers.forEach((taker, index) => {
    // The first taker also receives the cents the shares leave over.
    let amountMinor = index
      ? shares[index]!
      : net -
        shares.reduce((n, share) => n + share, api.parameter("zero")) +
        shares[0]!;
    if (amountMinor <= api.parameter("zero")) return;
    const owed = inherits
      ? inheritanceTax(
          api,
          stateKey,
          relations.get(taker.id) ?? "",
          amountMinor,
        )
      : null;
    if (owed) {
      payTax({ ...owed, heirId: taker.id });
      amountMinor -= owed.amountMinor;
    }
    if (amountMinor <= api.parameter("zero")) return;
    accounts.transfer({
      id: `estate:${personId}:${taker.id}`,
      from,
      to: accounts.main(taker.id),
      amountMinor,
      reasonKey: will
        ? "estate.bequest"
        : heirs.length
          ? "estate.inheritance"
          : "estate.escheat",
      source: will
        ? {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation: `Estate of ${personId} after ${deathEventId}: by their will, a share by closeness.`,
            estimatedFrom: "willOf (traits, age, closeness)",
          }
        : row?.tag === "SOURCED"
          ? {
              tag: "SOURCED",
              asOf: api.state.date,
              citation: `Estate of ${personId} after ${deathEventId}. ${row.citation}`,
            }
          : {
              tag: "ESTIMATED",
              asOf: api.state.date,
              citation: `Estate of ${personId} after ${deathEventId}. ${row?.citation ?? data.escheat.citation}`,
              estimatedFrom:
                (row as { estimatedFrom?: string } | undefined)
                  ?.estimatedFrom ?? data.escheat.estimatedFrom,
            },
    });
    paid.push({ toId: taker.id, amountMinor });
    if (inherits) noticeTaxes(api, personId, taker.id, amountMinor, taxes);
  });
  // Probate's close is a court record.
  api.emit({
    id: `estate.settled:${personId}:${api.state.date}`,
    date: api.state.date,
    kind: "estate.settled",
    personIds: paid
      .map((row) => row.toId)
      .filter((id) => api.state.people.has(id)),
    placeId: person.placeId,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `Probate of the estate of ${personId} after ${deathEventId}.`,
      estimatedFrom: will ? "the decedent's will" : "the intestate order",
    },
    publicRecord: true,
    facts: {
      decedentId: personId,
      by: will ? "will" : heirs.length ? "intestacy" : "escheat",
      estateMinor: `${estate}`,
      heirs: paid.map((row) => `${row.toId}=${row.amountMinor}`).join(" "),
    },
  });
  return paid;
}

/**
 * The estate's accounting reaches each heir: what passed to them and the
 * taxes taken first, each naming its law. An heir whose share a tax took
 * from now ties that loss to the law, citing the accounting, and wants it
 * repealed (the views engine reads it).
 */
function noticeTaxes(
  api: CoreAPI,
  personId: PersonId,
  heirId: PersonId,
  receivedMinor: number,
  taxes: readonly DeathTax[],
): void {
  const heir = api.state.people.get(heirId);
  const mine = taxes.filter(
    (t) => t.series === "estate-tax" || t.heirId === heirId,
  );
  if (!heir?.alive || !mine.length) return;
  const noticeId = `event:estate.accounting:${personId}:${heirId}`;
  const source = {
    tag: "SOURCED" as const,
    asOf: api.state.date,
    citation: `Accounting of the estate of ${personId}`,
  };
  api.emit({
    id: noticeId,
    date: api.state.date,
    kind: "estate.accounting",
    personIds: [heirId],
    placeId: heir.placeId,
    facts: {
      decedentId: personId,
      receivedMinor: String(receivedMinor),
      taxLawIds: mine.map((t) => t.lawId).join(","),
    },
    publicRecord: false,
    source,
  });
  for (const tax of mine)
    api.emit({
      id: `event:law.effect-learned:${personId}:${heirId}:${tax.lawId}`,
      date: api.state.date,
      kind: "law.effect-learned",
      personIds: [heirId],
      placeId: heir.placeId,
      topic: tax.series,
      desiredChange: "repeal",
      facts: {
        lawId: tax.lawId,
        learnedFrom: `event:${noticeId}:experienced`,
        amountMinor: String(tax.amountMinor),
      },
      publicRecord: false,
      source: {
        ...source,
        citation: `Learned from the accounting of the estate of ${personId} that ${tax.lawId} took from the estate`,
      },
    });
}

export const ESTATES_MODULE: CoreModule = {
  id: ESTATES_MODULE_ID,
  // Probate's calendar is the module's state; no rows of its own.
  state: { schemaVersion: 1, tables: { probate: {} } },
  onCalendarWork(api, work) {
    if (work.kind !== PROBATE_CLOSES) return;
    const [personId, deathEventId] = work.sourceRecordIds as [string, string];
    distribute(api, personId, deathEventId);
  },
};

/** Run estates through probate (the bench's played world). */
export function openEstates(core: CoreState): void {
  if (core.modules.has(ESTATES_MODULE_ID)) return;
  registerModule(core, ESTATES_MODULE);
}
