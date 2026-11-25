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
 * A relative still in the wider population inherits like any other: they are
 * filled in as the same person when the estate reaches them.
 *
 * A home whose owners have all died is sold when probate closes: the
 * outside market pays the dwelling's value, the lender is paid first, and
 * the surplus goes into the estate, so the estate tax and the heirs' shares
 * count it (housing-sale.ts). A household whose last living member the
 * decedent was, and which owns its home, sells it; a counted household's
 * home is sold by the same rule when its last member dies
 * (removeCountedPerson). SG-CORE-estate-cash-only: loans and businesses are
 * not settled.
 */
import data from "./data/estates.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { outsideGovernment } from "./outside-governments";
import { LAWS_MODULE_ID } from "./modules/laws";
import { coreStateKeyOfPlaceholderId } from "./place-lookup";
import {
  assessEstateTaxes,
  assessInheritanceTax,
  GOVERNMENT_HEIR,
  type DeathTax,
} from "./laws-death-taxes";
import { appliedTo, lawApplied } from "./law-reach/applied";
import { closenessBetween } from "./closeness";
import { leanedYes } from "./trait-decisions";
import type { ModuleRow } from "./module-data";
import { personOrFillIn, registerModule } from "./state";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { countedPayment } from "./counted-money";
import { isDemoted } from "./counted-groups";
import {
  endRecipientIncomeAtDeath,
  handOverContractsAtDeath,
} from "./finance-state";
import { addDays, makeIsoDate, daysBetweenText } from "./kernel/dates";
import { homeSaleOf, recordEstatePaid, sellHome } from "./housing-sale";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "./types";
import { placeRow, placeStateKey } from "./place-map";

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

/** A relative who is alive: a full person, or one still in the wider population (a husk) who is filled in when the estate reaches them. */
function livingKin(api: CoreAPI, id: PersonId): boolean {
  const kin = api.state.people.get(id);
  if (kin && !isDemoted(kin)) return kin.alive === true;
  return residentPerson(api.state, id) !== undefined;
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
          row.relations.includes(relation) && livingKin(api, id),
      )
      .map(([id]) => id)
      .sort();
    if (heirs.length) return { heirs, row };
  }
  return { heirs: [] };
}

/**
 * Who takes at the close of probate, from the heirs (or the will's
 * beneficiaries, each with their weight) the death recorded: one still living takes their share; one who died in the meantime is
 * represented by their own living descendants, who split that share
 * (Uniform Probate Code 2-103, "by representation"); a share nobody
 * represents lapses to the rest. Each taker carries the relation of the
 * recorded heir they stand for, which the inheritance tax reads.
 */
function takersAtClose(
  api: CoreAPI,
  recorded: readonly { id: PersonId; weight: number }[],
  relations: ReadonlyMap<PersonId, string>,
): { id: PersonId; weight: number; relation: string }[] {
  const out = new Map<PersonId, { weight: number; relation: string }>();
  const take = (
    id: PersonId,
    weight: number,
    relation: string,
    seen: Set<PersonId>,
  ) => {
    if (livingKin(api, id)) {
      const kept = out.get(id);
      out.set(id, { weight: (kept?.weight ?? 0) + weight, relation });
      return;
    }
    const gone = api.state.people.get(id);
    if (!gone || seen.has(id)) return;
    seen.add(id);
    const lines = [...relationsOf(gone)]
      .filter(([, r]) => r === "child")
      .map(([kid]) => kid)
      .sort();
    const living = lines.filter(
      (kid) => livingKin(api, kid) || api.state.people.has(kid),
    );
    for (const kid of living) take(kid, weight / living.length, relation, seen);
  };
  for (const { id, weight } of recorded)
    take(id, weight, relations.get(id) ?? "", new Set());
  return [...out].map(([id, v]) => ({ id, ...v }));
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
function taxStateOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): string | null {
  const own = placeRow(person.placeId);
  if (own?.level === "state") return own.id;
  return placeStateKey(api.state.placeMetadata?.placeKey);
}

/**
 * The record a death tax is applied to: the decedent for the state's estate
 * tax, beside it the federal one (the row under `<decedent>|US`), and the heir
 * whose share an inheritance tax took from.
 */
function appliedTarget(
  personId: PersonId,
  stateKey: string | null,
  tax: Pick<DeathTax, "jurisdiction" | "heirId">,
): string {
  if (tax.heirId !== undefined) return tax.heirId;
  return tax.jurisdiction === "US" && stateKey ? `${personId}|US` : personId;
}

/** The state a counted place is in: its own id, the state a city is in, else the town's. */
function countedStateOf(api: CoreAPI, placeId: string): string | null {
  const placeholder = coreStateKeyOfPlaceholderId(placeId);
  if (placeholder && !placeRow(placeId)) return placeholder;
  return (
    placeStateKey(placeId) ??
    placeStateKey(api.state.placeMetadata?.placeKey) ??
    null
  );
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
 * Whether the person made a will, from their traits and their own stakes:
 * the trait lean toward planning ahead over leaving things be (the shared
 * trait table, at the decision's own weight), plus how much they had to
 * leave, in months of their own living cost (`willStakeWeight` per e-fold),
 * plus the partner and children they would provide for (`willHeirWeight`
 * each), less the bother of making one (`willCostPull`). Age shows only
 * through what a life has built: savings and family. Their will leaves their
 * estate to their living family in shares by how close each is.
 */
export function willOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): readonly { id: PersonId; weight: number }[] | null {
  const made = leanedYes(
    api.state,
    person,
    "estates.will",
    "make-will",
    "leave-it",
    willReasons(api, person).pull,
  );
  if (!made) return null;
  return closenessShares(api, person);
}

/** The reasons behind `willOf`, kept on the probate row for dev mode's trace. */
export function willReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
): {
  estateMinor: number;
  monthlyCostMinor: number;
  heirs: number;
  pull: number;
} {
  const p = (key: string) => api.parameter(key);
  const accounts = api.accounts();
  const estateMinor = Math.max(
    p("zero"),
    accounts.balance(accounts.main(person.id)),
  );
  const monthlyCostMinor =
    (person.livingCostDailyMinor * p("daysPerMeanYear")) / p("monthsPerYear");
  let heirs = p("zero");
  for (const [id, relation] of relationsOf(person))
    if (WILL_HEIRS.has(relation) && livingKin(api, id)) heirs += p("one");
  // A person kept with no living cost of their own (an official outside the
  // town) has no measure of what their savings would keep them for.
  const months =
    monthlyCostMinor > p("zero") ? estateMinor / monthlyCostMinor : p("zero");
  return {
    estateMinor,
    monthlyCostMinor,
    heirs,
    pull:
      p("willStakeWeight") * Math.log(p("one") + months) +
      p("willHeirWeight") * heirs -
      p("willCostPull"),
  };
}

/** The kin a will provides for first: a partner and children. */
const WILL_HEIRS = new Set(["partner", "child"]);

/** The living family who would take, each weighted by how close they were to the person. */
function closenessShares(
  api: CoreAPI,
  person: Readonly<PersonState>,
): readonly { id: PersonId; weight: number }[] | null {
  const shares = [...person.familyIds]
    .filter((id) => livingKin(api, id))
    .sort()
    .map((id) => ({ id, weight: closenessBetween(api.state, person.id, id) }))
    .filter((row) => row.weight > api.parameter("zero"));
  return shares.length ? shares : null;
}

/**
 * Whether the person had put part of their estate in a living trust, and how
 * much: the trait lean toward setting one up over leaving it (the shared
 * trait table, at the decision's own weight) plus how far the estate runs past
 * `trustWealthMidpointMinor`, per e-fold. The share in the trust is the estate
 * over the estate plus that midpoint, so it grows smoothly with wealth. Its
 * beneficiaries are the living family in shares by closeness. Null when they
 * set none up, or have no one to leave it to.
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
  const set = leanedYes(
    api.state,
    person,
    "estates.trust",
    "set-up-trust",
    "leave-it",
    p("trustWealthWeight") *
      Math.log(estateMinor / p("trustWealthMidpointMinor")),
  );
  if (!set) return null;
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
/** The household whose home the estate sells: the decedent's, when they were its last living member and it owns the home. */
function homeOfLastOwner(
  api: CoreAPI,
  person: Readonly<PersonState>,
): string | undefined {
  const c = api.state as CoreState;
  if (!c.modules.has("housing")) return undefined;
  const household = c.households.get(person.householdId);
  if (!household || household.memberIds.some((id) => c.people.get(id)?.alive))
    return undefined;
  const dwelling = api
    .moduleState("housing")
    .table("dwellings")
    .get(`dwelling:${household.id}`) as unknown as
    { tenure?: string } | undefined;
  return dwelling?.tenure === "own" ? household.id : undefined;
}

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
  // A home still to sell keeps the estate open with no cash in it.
  const home = homeOfLastOwner(api, person);
  if (base <= api.parameter("zero") && !home) return [];
  // A living trust pays its beneficiaries now, outside probate; what the
  // trust does not hold goes through probate as before.
  const trust =
    base > api.parameter("zero") ? trustOf(api, person, base) : undefined;
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
    // The estate tax is figured on the whole estate as it stood at death,
    // and the heirs are the kin the law named on that day: a death during
    // probate does not change who the estate was left to.
    api
      .moduleState(ESTATES_MODULE_ID)
      .table("probate")
      .put({
        id: personId,
        ...(trust ? { baseMinor: base, carry } : {}),
        share: probate.share,
        heirs: heirsOf(api, person).heirs,
        will: willOf(api, person),
        willReasons: willReasons(api, person),
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
 * The relation of a counted heir to the person who died: the counts keep
 * family pairs without their kind, so it is read from the years between them.
 * Someone a parent's age younger is a child, a parent's age older a parent,
 * anyone nearer in age the partner (a sibling is told apart from a partner
 * only in a full person's record).
 */
function countedRelation(
  api: CoreAPI,
  deceasedBorn: string,
  heirBorn: string,
): string {
  // stopgapId: SG-LAW-estates-counted-people
  api.stopgap("SG-LAW-estates-counted-people");
  const years = api.parameter("minimumParentAgeAtBirth");
  const gap =
    daysBetweenText(deceasedBorn, heirBorn) / api.parameter("daysPerMeanYear");
  return gap >= years ? "child" : gap <= -years ? "parent" : "partner";
}

/**
 * A counted resident's estate, settled like a full person's: when a death in
 * the counts passes the dead person's cash to the household that outlives
 * them, the estate and inheritance taxes in force read the estate and each
 * heir's share on the day, and what is due is paid from the heir's group to
 * the named treasury, times the households the record stands for. Each law
 * read is recorded against the dead person's record (the group of estates it
 * stands for) and the heir's, with the money; an estate under the exemption
 * is recorded with nothing due. The state is the one the place is in.
 */
export function settleCountedEstate(
  api: CoreAPI,
  input: {
    readonly deceasedId: PersonId;
    readonly placeId: string;
    readonly estate: {
      readonly householdId: string;
      readonly households: number;
      readonly bornOn: string;
      readonly heirs: readonly PersonId[];
      readonly estateMinor: number;
    };
  },
): void {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!rt || !api.state.modules.has(LAWS_MODULE_ID)) return;
  // Equal shares among the heirs; the first takes the odd cents.
  const each = Math.floor(
    input.estate.estateMinor / Math.max(1, input.estate.heirs.length),
  );
  const heirs = input.estate.heirs.map((heirId, index) => ({
    heirId,
    amountMinor:
      index === 0
        ? input.estate.estateMinor - each * (input.estate.heirs.length - 1)
        : each,
  }));
  const store = rt.store;
  const stateKey = countedStateOf(api, input.placeId);
  const estateMinor = input.estate.estateMinor;
  if (estateMinor <= 0) return;
  const households = Math.max(1, input.estate.households);
  // A record that dies in part dies again later under the same person id, so
  // each death's transfers carry its day (one illness at a time ends in one
  // death a day, so two settle on one day only if a caller settles one twice).
  const date = api.state.date;
  const source = (citation: string) => ({
    tag: "SOURCED" as const,
    asOf: date,
    citation,
  });
  const apply = (
    tax: DeathTax,
    heirId: PersonId | undefined,
    /** What moved, for every household the settlement stands for. */
    movedMinor: number,
  ) =>
    lawApplied(api, {
      key: tax.series,
      lawId: tax.lawId,
      targetId: appliedTarget(input.deceasedId, stateKey, { ...tax, heirId }),
      target: "group",
      count: households,
      engine: ESTATES_MODULE_ID,
      what:
        movedMinor > 0
          ? heirId
            ? "inheritance-taxed"
            : "estate-taxed"
          : heirId
            ? "inheritance-assessed"
            : "estate-assessed",
      amountMinor: movedMinor,
    });
  // The estate tax is figured on the whole estate; each heir bears their share of it.
  const shares = new Map<PersonId, number>(
    heirs.map((h) => [h.heirId, h.amountMinor]),
  );
  // An estate with no one to take it goes to the state, deductible as in a
  // full person's (26 U.S.C. 2055(a)(1)): assessed on nothing.
  for (const tax of assessEstateTaxes(
    api,
    stateKey,
    heirs.length ? estateMinor : 0,
  )) {
    let paid = 0;
    let left = tax.amountMinor;
    heirs.forEach((h, index) => {
      const part =
        index === heirs.length - 1
          ? left
          : Math.floor((tax.amountMinor * h.amountMinor) / estateMinor);
      left -= part;
      if (part <= 0) return;
      const moved = countedPayment(api, {
        id: `estate:${input.deceasedId}:${tax.series}:${tax.jurisdiction}:${h.heirId}:${date}`,
        placeId: input.placeId,
        personId: h.heirId,
        otherOwnerId: treasuryOf(api, tax.jurisdiction),
        // The share of the record the death reaches pays, not the record's
        // whole weight (a part death's heirs live in the households left).
        amountMinor: Math.round(part * households),
        whole: true,
        reasonKey: `estate.${tax.series}`,
        source: source(
          `Estate of ${input.deceasedId}, a counted resident: ${tax.lawId}`,
        ),
      });
      paid += moved;
      shares.set(h.heirId, (shares.get(h.heirId) ?? 0) - moved / households);
    });
    apply(tax, undefined, paid);
  }
  // With no one to take it, the state is the heir, and the state's statute
  // says whether its inheritance tax reaches a government (`governmentHeir`
  // on the row): the law is applied all the same.
  if (!heirs.length) {
    const exempt = assessInheritanceTax(
      api,
      stateKey,
      GOVERNMENT_HEIR,
      estateMinor,
    );
    if (exempt)
      lawApplied(api, {
        key: exempt.series,
        lawId: exempt.lawId,
        targetId: treasuryOf(api, exempt.jurisdiction),
        target: "government",
        engine: ESTATES_MODULE_ID,
        what: "inheritance-assessed",
      });
  }
  const born = (id: PersonId) => {
    const m = store.countedMember(id);
    return m === undefined ? undefined : store.born[m];
  };
  const deceasedBorn = input.estate.bornOn;
  for (const h of heirs) {
    const heirBorn = born(h.heirId);
    if (!deceasedBorn || !heirBorn) continue;
    const assessment = assessInheritanceTax(
      api,
      stateKey,
      countedRelation(api, deceasedBorn, heirBorn),
      shares.get(h.heirId) ?? h.amountMinor,
    );
    if (!assessment) continue;
    const moved =
      assessment.amountMinor > 0
        ? countedPayment(api, {
            id: `estate:${input.deceasedId}:${assessment.series}:${assessment.jurisdiction}:${h.heirId}:${date}`,
            placeId: input.placeId,
            personId: h.heirId,
            otherOwnerId: treasuryOf(api, assessment.jurisdiction),
            amountMinor: Math.round(assessment.amountMinor * households),
            whole: true,
            reasonKey: `estate.${assessment.series}`,
            source: source(
              `Estate of ${input.deceasedId}, a counted resident: ${assessment.lawId}`,
            ),
          })
        : 0;
    apply(assessment, h.heirId, moved);
  }
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
  /** The kin the intestate order named on the day of death, kept on the probate row until it closes. */
  readonly heirsAtDeath?: readonly PersonId[];
  /** The will's bequests as of the death (none when no will was made). */
  readonly willAtDeath?: readonly { id: PersonId; weight: number }[] | null;
  readonly share: number;
  /** The cash was paid while the home was still for sale: the pass after the sale pays its proceeds to the same heirs, on the whole estate's tax. */
  readonly partial?: boolean;
  readonly fundedMinor?: number;
  readonly beneficiaries?: readonly { id: PersonId; weight: number }[];
}

/**
 * The estate's house is still for sale: probate stays open, keeping the plan
 * it closes by, and looks again in a month.
 */
function keepProbateOpen(
  api: CoreAPI,
  personId: PersonId,
  deathEventId: string,
  plan: Plan,
): void {
  // The heirs, the will and its reasons stay as they stood on the day of
  // death: a probate held open for a house never reads them again later,
  // when the estate has grown (World, #9747 07:13Z). A pass that paid the cash
  // while the house was for sale marks the row `partial`.
  const table = api.moduleState(ESTATES_MODULE_ID).table("probate");
  table.put({
    ...(table.get(personId) ?? {}),
    id: personId,
    share: plan.share,
    ...(plan.baseMinor === undefined ? {} : { baseMinor: plan.baseMinor }),
    ...(plan.carry === undefined ? {} : { carry: plan.carry }),
    ...(plan.heirsAtDeath === undefined ? {} : { heirs: plan.heirsAtDeath }),
    ...(plan.willAtDeath === undefined ? {} : { will: plan.willAtDeath }),
    ...(plan.partial ? { partial: true } : {}),
  } as unknown as ModuleRow);
  const month = Math.round(
    api.parameter("daysPerMeanYear") / api.parameter("macroMonthsPerYear"),
  );
  api.moduleCalendar(ESTATES_MODULE_ID).schedule({
    key: `${PROBATE_CLOSES}:${personId}:${api.state.date}`,
    date: addDays(makeIsoDate(api.state.date), month),
    kind: PROBATE_CLOSES,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `Probate of the estate of ${personId} after ${deathEventId}, open while its house is for sale.`,
      estimatedFrom: "daysPerMeanYear / macroMonthsPerYear",
    },
    sourceRecordIds: [personId, deathEventId],
  });
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
  // Probate puts a home whose owners have all died on the market; the estate stays open with the house in it until a buyer takes it, and what the buyer paid, after the lender, joins the estate.
  const home = trust ? undefined : homeOfLastOwner(api, person);
  if (home)
    sellHome(api, home, "estate.probate-closes", {
      decedentId: personId,
      deathEventId,
    });
  const listed = trust ? undefined : homeSaleOf(api, person.householdId);
  const sale = listed?.decedentId === personId ? listed : undefined;
  // The trust's part is what it holds; probate's is what is left in the account.
  const estate = trust
    ? Math.min(plan.fundedMinor ?? 0, accounts.balance(from))
    : accounts.balance(from);
  // An estate whose house is still for sale pays the heirs its cash when probate closes, and the house's proceeds to the same heirs when it sells: the cash does not wait on a sale that may take years. Nothing in the account to pay, or the cash already paid, keeps the estate open for the sale.
  const homeUnsold = sale?.status === "listed";
  if (homeUnsold && (plan.partial || estate <= api.parameter("zero"))) {
    keepProbateOpen(api, personId, deathEventId, plan);
    return [];
  }
  if (estate <= api.parameter("zero")) return [];
  // What this pass paid, so the pass after the sale pays only the rest.
  const carry: Carry | undefined =
    plan.carry ?? (homeUnsold ? { estateTax: {}, heirs: {} } : undefined);
  api.stopgap(data.stopgapId);
  // A trust's beneficiaries take by its terms; probate follows the will or the law.
  // The will, like the heirs, is read as of the day of death and kept on the probate row; one paid with no wait reads it now.
  const relations = relationsOf(person);
  const willRows = trust
    ? null
    : plan.heirsAtDeath
      ? (plan.willAtDeath ?? null)
      : willOf(api, person);
  const willTakers = willRows ? takersAtClose(api, willRows, relations) : [];
  // A will whose beneficiaries are all gone with no one to represent them leaves the estate to the law.
  const will = willTakers.length ? willTakers : null;
  for (const t of will ?? []) relations.set(t.id, t.relation);
  const named = trust || will ? undefined : heirsOf(api, person);
  const row = named?.row;
  const represented =
    trust || will
      ? []
      : plan.heirsAtDeath
        ? takersAtClose(
            api,
            plan.heirsAtDeath.map((id) => ({
              id,
              weight: api.parameter("one"),
            })),
            relations,
          )
        : (named?.heirs ?? []).map((id) => ({
            id,
            weight: api.parameter("one"),
            relation: relations.get(id) ?? "",
          }));
  // When the heirs of the day of death and all who represent them are gone, the next class living at the close takes.
  const closing =
    represented.length || trust || will || plan.heirsAtDeath?.length === 0
      ? represented
      : (named?.heirs ?? []).map((id) => ({
          id,
          weight: api.parameter("one"),
          relation: relations.get(id) ?? "",
        }));
  const heirs = closing.map((h) => h.id);
  for (const h of closing) relations.set(h.id, h.relation);
  const treasury =
    trust || will || heirs.length ? undefined : escheatTo(api, person);
  const takers: { id: string; weight: number }[] = trust
    ? [...(plan.beneficiaries ?? [])]
    : will
      ? [...will]
      : closing.length
        ? closing.map((h) => ({ id: h.id, weight: h.weight }))
        : treasury
          ? [{ id: treasury, weight: api.parameter("one") }]
          : [];
  if (!takers.length) return [];
  // An heir still in the wider population is filled in as the same person, seeded from the world, when the estate reaches them.
  for (const taker of takers)
    if (
      !api.state.people.has(taker.id) ||
      isDemoted(api.state.people.get(taker.id)!)
    )
      personOrFillIn(api.state, taker.id);
  const paid: { toId: string; amountMinor: number }[] = [];
  // Before the heirs, the estate pays the estate taxes in force (an heirless
  // estate goes whole to the state). Each heir's share then pays their
  // state's inheritance tax by their relation to the decedent.
  const inherits = trust || Boolean(will) || heirs.length > 0;
  const stateKey = taxStateOf(api, person);
  const taxes: DeathTax[] = [];
  // A trust's transfers carry their own ids beside probate's.
  // The pass after the house sold is its own pass beside the one that paid the cash.
  const part = trust ? ":trust" : plan.partial ? ":home" : "";
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
    // The estate (the decedent) or the heir whose share paid was taxed by the
    // law row read; the federal estate tax sits beside a state's on the
    // decedent, the state's being the row under the decedent's own id.
    const heir = tax.heirId !== undefined;
    lawApplied(api, {
      key: tax.series,
      lawId: tax.lawId,
      targetId: appliedTarget(personId, stateKey, tax),
      target: "person",
      engine: ESTATES_MODULE_ID,
      what: heir ? "inheritance-taxed" : "estate-taxed",
      amountMinor: tax.amountMinor,
    });
  };
  // An estate (or an heir's share) under the exemption was assessed by the
  // same law and owes nothing: the law was applied to it all the same.
  const assessed = (
    tax: DeathTax,
    heirId?: string,
    target: "person" | "government" = "person",
  ) => {
    const targetId = appliedTarget(personId, stateKey, {
      ...tax,
      heirId: heirId as PersonId | undefined,
    });
    if (
      appliedTo(api, targetId).some((r) => r.key === tax.series && !r.endedOn)
    )
      return;
    lawApplied(api, {
      key: tax.series,
      lawId: tax.lawId,
      targetId,
      target,
      engine: ESTATES_MODULE_ID,
      what: heirId ? "inheritance-assessed" : "estate-assessed",
    });
  };
  let net = estate;
  // The estate tax is figured on the whole estate (a revocable trust stays in
  // it) and each part pays its share of it. An estate that goes wholly to the
  // state (no will, no kin) is assessed on nothing: a transfer to a state is
  // deductible (26 U.S.C. 2055(a)(1)).
  for (const tax of assessEstateTaxes(
    api,
    stateKey,
    inherits
      ? plan.partial
        ? (plan.baseMinor ?? api.parameter("zero")) + estate
        : (plan.baseMinor ?? estate)
      : api.parameter("zero"),
  )) {
    const key = `${tax.series}:${tax.jurisdiction}`;
    // The trust's pass pays its share of the tax; probate pays what is left of it.
    const due = trust
      ? Math.round(tax.amountMinor * plan.share)
      : tax.amountMinor - (carry?.estateTax[key] ?? 0);
    const amountMinor = Math.min(Math.max(due, api.parameter("zero")), net);
    if (amountMinor <= api.parameter("zero")) {
      assessed(tax);
      continue;
    }
    payTax({ ...tax, amountMinor });
    if ((trust || homeUnsold) && carry) carry.estateTax[key] = amountMinor;
    net -= amountMinor;
  }
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
    const before = carry?.heirs[taker.id];
    const grossMinor = amountMinor;
    const whole = inherits
      ? assessInheritanceTax(
          api,
          stateKey,
          relations.get(taker.id) ?? "",
          amountMinor + (before?.grossMinor ?? api.parameter("zero")),
        )
      : treasury
        ? assessInheritanceTax(api, stateKey, GOVERNMENT_HEIR, amountMinor)
        : null;
    const dueTax = whole
      ? whole.amountMinor - (before?.taxMinor ?? api.parameter("zero"))
      : api.parameter("zero");
    const owed =
      whole && dueTax > api.parameter("zero")
        ? { ...whole, amountMinor: dueTax }
        : null;
    if ((trust || homeUnsold) && carry)
      carry.heirs[taker.id] = {
        grossMinor,
        taxMinor: owed?.amountMinor ?? api.parameter("zero"),
      };
    if (whole && !owed)
      assessed(whole, taker.id, inherits ? "person" : "government");
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
  // The house is still for sale: the cash is paid and the estate waits for its proceeds, to the same heirs, on the same plan.
  if (homeUnsold) {
    keepProbateOpen(api, personId, deathEventId, {
      ...plan,
      partial: true,
      ...(carry ? { carry } : {}),
      baseMinor: plan.baseMinor ?? estate,
      heirsAtDeath: plan.heirsAtDeath ?? heirs,
      willAtDeath: plan.willAtDeath ?? (will ? [...will] : null),
    });
    return paid;
  }
  // Probate's close is a court record; the home it sold names whom it paid.
  const settledId = `estate.settled:${personId}:${api.state.date}${part}`;
  if (sale) recordEstatePaid(api, sale, settledId, paid);
  api.emit({
    id: settledId,
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
      | {
          baseMinor?: number;
          share: number;
          carry?: Carry;
          partial?: boolean;
          heirs: readonly PersonId[];
          will?: readonly { id: PersonId; weight: number }[] | null;
        }
      | undefined;
    distribute(
      api,
      personId,
      deathEventId,
      kept
        ? {
            kind: "probate",
            baseMinor: kept.baseMinor,
            share: kept.share,
            ...(kept.carry ? { carry: kept.carry } : {}),
            ...(kept.partial ? { partial: true } : {}),
            heirsAtDeath: kept.heirs,
            willAtDeath: kept.will ?? null,
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
