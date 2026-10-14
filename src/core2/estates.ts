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
 * Stopgaps: SG-CORE-estate-cash-only (homes, loans and businesses are not
 * settled), SG-CORE-estate-tax-awaits-gov (no estate or inheritance tax series
 * exists yet; GOV adds them and this reads them), and
 * SG-CORE-owner-decision-trusts (no trusts: how far trusts go in 1.0 is the
 * owner's call).
 */
import data from "./data/estates.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { outsideGovernment } from "./outside-governments";
import { closenessBetween } from "./closeness";
import { decisionLean } from "./trait-decisions";
import { registerModule } from "./state";
import { endRecipientIncomeAtDeath } from "./finance-state";
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
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
  // No estate or inheritance tax series exists yet; none is taken.
  api.stopgap("SG-CORE-estate-tax-awaits-gov");
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
  const total = takers.reduce(
    (n, taker) => n + taker.weight,
    api.parameter("zero"),
  );
  const paid: { toId: string; amountMinor: number }[] = [];
  const shares = takers.map((taker) =>
    Math.floor((estate * taker.weight) / total),
  );
  takers.forEach((taker, index) => {
    // The first taker also receives the cents the shares leave over.
    const amountMinor = index
      ? shares[index]!
      : estate -
        shares.reduce((n, share) => n + share, api.parameter("zero")) +
        shares[0]!;
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
