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
 * Trusts (owner, Oct 15, background only): a person of means, by their traits
 * and the size of their estate, has put part of it in a living trust, whose
 * beneficiaries take at death outside probate, in shares by closeness. The
 * trust is revocable, so it stays in the taxable estate: the estate tax is
 * figured on the whole estate, trust and probate together, and each part pays
 * its share. The part left to probate waits as before.
 *
 * Stopgap: SG-CORE-estate-cash-only (homes, loans and businesses are not
 * settled).
 */
import data from "./data/estates.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { outsideGovernment } from "./outside-governments";
import { estateTaxes, inheritanceTax, type DeathTax } from "./laws-death-taxes";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { closenessBetween } from "./closeness";
import { decisionLean } from "./trait-decisions";
import type { ModuleRow } from "./module-data";
import { registerModule } from "./state";
import {
  endRecipientIncomeAtDeath,
  handOverContractsAtDeath,
} from "./finance-state";
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
  return closenessShares(api, person);
}

/** The living family who would take, each weighted by how close they were to the person. */
function closenessShares(
  api: CoreAPI,
  person: Readonly<PersonState>,
): readonly { id: PersonId; weight: number }[] | null {
  const shares = [...person.familyIds]
    .filter((id) => api.state.people.get(id)?.alive)
    .sort()
    .map((id) => ({ id, weight: closenessBetween(api.state, person.id, id) }))
    .filter((row) => row.weight > api.parameter("zero"));
  return shares.length ? shares : null;
}

/**
 * Whether the person had put part of their estate in a living trust, and how
 * much: the trait lean toward setting one up over leaving it (the shared
 * trait table) plus how far the estate runs past `trustWealthMidpointMinor`,
 * per e-fold. The share in the trust is the estate over the estate plus that
 * midpoint, so it grows smoothly with wealth. Its beneficiaries are the
 * living family in shares by closeness. Null when they set none up, or have
 * no one to leave it to.
 */
export function trustOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
  estateMinor: number,
): {
  readonly share: number;
  readonly fundedMinor: number;
  readonly beneficiaries: readonly { id: PersonId; weight: number }[];
} | null {
  const p = (key: string) => api.parameter(key);
  if (estateMinor <= p("zero")) return null;
  const lean = decisionLean(
    api.state,
    person,
    "estates.trust",
    "set-up-trust",
    "leave-it",
  );
  const score =
    lean +
    p("trustWealthWeight") *
      Math.log(estateMinor / p("trustWealthMidpointMinor"));
  if (score <= p("zero")) return null;
  const beneficiaries = closenessShares(api, person);
  if (!beneficiaries) return null;
  const share = estateMinor / (estateMinor + p("trustWealthMidpointMinor"));
  return {
    share,
    fundedMinor: Math.floor(estateMinor * share),
    beneficiaries,
  };
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
 * A mortgage or lease the dead person paid: other payers keep it, a living
 * adult at home takes it over, and where no one is left it ends, with what it
 * was owed paid from the estate first (Uniform Probate Code §3-805).
 */
function payContractDebts(
  api: CoreAPI,
  personId: PersonId,
  from: string,
): number {
  const core = api.state as CoreState;
  const accounts = api.accounts();
  let paid = api.parameter("zero");
  for (const change of handOverContractsAtDeath(core, api, personId)) {
    if (change.outcome !== "ended") continue;
    const row = core.finance.contracts.get(change.contractId)!;
    const owed = Math.min(row.arrearsMinor, accounts.balance(from));
    if (owed <= api.parameter("zero")) continue;
    accounts.transfer({
      id: `estate-debt:${personId}:${row.id}`,
      from,
      to: accounts.main(row.payeeId),
      amountMinor: owed,
      reasonKey: "estate.debt",
      source: {
        tag: "SOURCED",
        asOf: api.state.date,
        citation: `Estate of ${personId}: unpaid ${row.kind} (${row.id}) ended at death with no one at home to take it over. Uniform Probate Code §3-805: debts are paid from the estate before heirs take.`,
      },
    });
    row.arrearsMinor -= owed;
    paid += owed;
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
  payContractDebts(api, personId, from);
  const base = accounts.balance(from);
  if (base <= api.parameter("zero")) return [];
  // A living trust pays its beneficiaries now, outside probate; what the
  // trust does not hold goes through probate as before.
  const trust = trustOf(api, person, base);
  const paid: { toId: string; amountMinor: number }[] = [];
  const carry: Carry = { estateTax: {}, heirs: {} };
  if (trust) {
    paid.push(
      ...distribute(api, personId, deathEventId, {
        kind: "trust",
        carry,
        baseMinor: base,
        share: trust.share,
        fundedMinor: trust.fundedMinor,
        beneficiaries: trust.beneficiaries,
      }),
    );
    if (accounts.balance(from) <= api.parameter("zero")) return paid;
  }
  const probate: Plan = {
    kind: "probate",
    ...(trust ? { carry } : {}),
    baseMinor: trust ? base : undefined,
    share: trust ? api.parameter("one") - trust.share : api.parameter("one"),
  };
  if (api.state.modules.has(ESTATES_MODULE_ID)) {
    // The estate tax is figured on the whole estate as it stood at death.
    if (trust)
      api
        .moduleState(ESTATES_MODULE_ID)
        .table("probate")
        .put({
          id: personId,
          baseMinor: base,
          share: probate.share,
          carry,
        } as unknown as ModuleRow);
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
    return paid;
  }
  return [...paid, ...distribute(api, personId, deathEventId, probate)];
}

/**
 * What a settlement pass settles: the part of the estate in a living trust
 * (paid at death to its beneficiaries) or the part that goes through probate.
 * `baseMinor` is the whole estate at death, the base the estate tax is
 * figured on, and `share` the part of that tax this pass pays.
 */
interface Carry {
  /** The estate tax the trust's pass paid, by `<series>:<jurisdiction>`. */
  readonly estateTax: Record<string, number>;
  /** What each beneficiary received from the trust before tax, and the inheritance tax it paid. */
  readonly heirs: Record<string, { grossMinor: number; taxMinor: number }>;
}

interface Plan {
  readonly kind: "trust" | "probate";
  /** Set when an estate has both a trust and probate: what the first pass paid, so the second pays the rest. */
  readonly carry?: Carry;
  readonly baseMinor?: number | undefined;
  readonly share: number;
  readonly fundedMinor?: number;
  readonly beneficiaries?: readonly { id: PersonId; weight: number }[];
}

/** Probate closes: the estate passes by the will, or by the law. */
function distribute(
  api: CoreAPI,
  personId: PersonId,
  deathEventId: string,
  plan: Plan = { kind: "probate", share: api.parameter("one") },
): readonly { toId: string; amountMinor: number }[] {
  const person = api.state.people.get(personId);
  if (!person) return [];
  const accounts = api.accounts();
  const from = accounts.main(personId);
  const trust = plan.kind === "trust";
  // The trust's part is what it holds; probate's is what is left in the account.
  const estate = trust
    ? Math.min(plan.fundedMinor ?? 0, accounts.balance(from))
    : accounts.balance(from);
  if (estate <= api.parameter("zero")) return [];
  api.stopgap(data.stopgapId);
  // A trust's beneficiaries take by its terms; probate follows the will or the law.
  const will = trust ? null : willOf(api, person);
  const { heirs, row } =
    trust || will ? { heirs: [], row: undefined } : heirsOf(api, person);
  const treasury =
    trust || will || heirs.length ? undefined : escheatTo(api, person);
  const takers: { id: string; weight: number }[] = trust
    ? [...(plan.beneficiaries ?? [])]
    : will
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
  const inherits = trust || Boolean(will) || heirs.length > 0;
  const stateKey = stateOf(api, person);
  const taxes: DeathTax[] = [];
  // A trust's transfers carry their own ids beside probate's.
  const part = trust ? ":trust" : "";
  const payTax = (tax: DeathTax) => {
    const to = treasuryOf(api, tax.jurisdiction);
    accounts.transfer({
      id: `estate:${personId}:${tax.series}:${tax.jurisdiction}${tax.heirId ? `:${tax.heirId}` : ""}${part}`,
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
  // The estate tax is figured on the whole estate (a revocable trust stays in
  // it) and each part pays its share of it.
  if (inherits)
    for (const tax of estateTaxes(api, stateKey, plan.baseMinor ?? estate)) {
      const key = `${tax.series}:${tax.jurisdiction}`;
      // The trust's pass pays its share of the tax; probate pays what is left of it.
      const due = trust
        ? Math.round(tax.amountMinor * plan.share)
        : tax.amountMinor - (plan.carry?.estateTax[key] ?? 0);
      const amountMinor = Math.min(Math.max(due, api.parameter("zero")), net);
      if (amountMinor <= api.parameter("zero")) continue;
      payTax({ ...tax, amountMinor });
      if (trust && plan.carry) plan.carry.estateTax[key] = amountMinor;
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
    // An heir who takes from both the trust and probate pays inheritance tax
    // on the two together, less what the first pass paid.
    const before = plan.carry?.heirs[taker.id];
    const grossMinor = amountMinor;
    const whole = inherits
      ? inheritanceTax(
          api,
          stateKey,
          relations.get(taker.id) ?? "",
          amountMinor + (before?.grossMinor ?? api.parameter("zero")),
        )
      : null;
    const dueTax = whole
      ? whole.amountMinor - (before?.taxMinor ?? api.parameter("zero"))
      : api.parameter("zero");
    const owed =
      whole && dueTax > api.parameter("zero")
        ? { ...whole, amountMinor: dueTax }
        : null;
    if (trust && plan.carry)
      plan.carry.heirs[taker.id] = {
        grossMinor,
        taxMinor: owed?.amountMinor ?? api.parameter("zero"),
      };
    if (owed) {
      payTax({ ...owed, heirId: taker.id });
      amountMinor -= owed.amountMinor;
    }
    if (amountMinor <= api.parameter("zero")) return;
    accounts.transfer({
      id: `estate:${personId}:${taker.id}${part}`,
      from,
      to: accounts.main(taker.id),
      amountMinor,
      reasonKey: trust
        ? "estate.trust"
        : will
          ? "estate.bequest"
          : heirs.length
            ? "estate.inheritance"
            : "estate.escheat",
      source: trust
        ? {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation: `Estate of ${personId} after ${deathEventId}: from their living trust, outside probate, a share by closeness.`,
            estimatedFrom: "trustOf (traits, estate size, closeness)",
          }
        : will
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
    if (inherits)
      noticeTaxes(api, personId, taker.id, amountMinor, taxes, part);
  });
  // Probate's close is a court record.
  api.emit({
    id: `estate.settled:${personId}:${api.state.date}${part}`,
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
      estimatedFrom: trust
        ? "the decedent's living trust"
        : will
          ? "the decedent's will"
          : "the intestate order",
    },
    publicRecord: true,
    facts: {
      decedentId: personId,
      by: trust
        ? "trust"
        : will
          ? "will"
          : heirs.length
            ? "intestacy"
            : "escheat",
      estateMinor: `${estate}`,
      // The whole estate at death, the base the estate tax is figured on.
      baseMinor: `${plan.baseMinor ?? estate}`,
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
  part: string,
): void {
  const heir = api.state.people.get(heirId);
  const mine = taxes.filter(
    (t) => t.series === "estate-tax" || t.heirId === heirId,
  );
  if (!heir?.alive || !mine.length) return;
  const noticeId = `event:estate.accounting:${personId}:${heirId}${part}`;
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
      id: `event:law.effect-learned:${personId}:${heirId}:${tax.lawId}${part}`,
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
  // Probate's calendar is the module's state; the table keeps an estate with a living trust: the base its tax is figured on and what the trust's pass paid.
  state: { schemaVersion: 1, tables: { probate: {} } },
  onCalendarWork(api, work) {
    if (work.kind !== PROBATE_CLOSES) return;
    const [personId, deathEventId] = work.sourceRecordIds as [string, string];
    // An estate with a living trust pays tax on the whole estate as it stood at death.
    const kept = api
      .moduleState(ESTATES_MODULE_ID)
      .table("probate")
      .get(personId) as unknown as
      { baseMinor: number; share: number; carry: Carry } | undefined;
    distribute(
      api,
      personId,
      deathEventId,
      kept
        ? {
            kind: "probate",
            baseMinor: kept.baseMinor,
            share: kept.share,
            carry: kept.carry,
          }
        : { kind: "probate", share: api.parameter("one") },
    );
  },
};

/** Run estates through probate (the bench's played world). */
export function openEstates(core: CoreState): void {
  if (core.modules.has(ESTATES_MODULE_ID)) return;
  registerModule(core, ESTATES_MODULE);
}
