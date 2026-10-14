/**
 * A full person's estate when they die (money stress audit defect 6): their
 * cash passes, in one balanced journal entry per heir, to their nearest
 * living kin by the intestate order in `data/estates.json` (Uniform Probate
 * Code §2-102 to §2-103), shared equally within that class. With no living
 * kin it escheats to their state (UPC §2-105). Standing payments to them
 * (a benefit award) end. Stopgap
 * SG-CORE-estate-cash-only: only cash passes; homes, loans and businesses
 * are not settled, and no will is read.
 */
import data from "./data/estates.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { outsideGovernment } from "./outside-governments";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { estateTaxes, inheritanceTax, type DeathTax } from "./laws-death-taxes";
import type { CoreAPI, PersonId, PersonState } from "./types";

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

/** Pass a dead person's cash to their heirs, or to the state. Returns who received what. */
export function settleEstate(
  api: CoreAPI,
  personId: PersonId,
  deathEventId: string,
): readonly { toId: string; amountMinor: number }[] {
  const person = api.state.people.get(personId);
  if (!person || person.alive) return [];
  const accounts = api.accounts();
  const from = accounts.main(personId);
  // Benefits and other standing payments to them stop with their death.
  accounts.endObligationsTo(from);
  const estate = accounts.balance(from);
  if (estate <= api.parameter("zero")) return [];
  api.stopgap(data.stopgapId);
  const { heirs, row } = heirsOf(api, person);
  const treasury = heirs.length ? undefined : escheatTo(api, person);
  const takers = heirs.length ? heirs : treasury ? [treasury] : [];
  if (!takers.length) return [];
  const paid: { toId: string; amountMinor: number }[] = [];
  // Before the heirs, the estate pays the estate taxes in force (an heirless
  // estate goes whole to the state). Each heir's share then pays their
  // state's inheritance tax by their relation to the decedent.
  const stateKey = stateOf(api, person);
  const taxes: DeathTax[] = [];
  const payTax = (tax: DeathTax, heirId?: string) => {
    const owedBy = heirId ? { ...tax, heirId } : tax;
    accounts.transfer({
      id: `estate:${personId}:${tax.series}:${tax.jurisdiction}${heirId ? `:${heirId}` : ""}`,
      from,
      to: accounts.main(treasuryOf(api, tax.jurisdiction)),
      amountMinor: tax.amountMinor,
      reasonKey: `estate.${tax.series}`,
      source: {
        tag: "SOURCED",
        asOf: api.state.date,
        citation: `Estate of ${personId} after ${deathEventId}: ${tax.lawId}`,
      },
    });
    taxes.push(owedBy);
    paid.push({
      toId: treasuryOf(api, tax.jurisdiction),
      amountMinor: tax.amountMinor,
    });
  };
  let net = estate;
  if (heirs.length)
    for (const tax of estateTaxes(api, stateKey, estate)) {
      const amountMinor = Math.min(tax.amountMinor, net);
      if (amountMinor <= api.parameter("zero")) continue;
      payTax({ ...tax, amountMinor });
      net -= amountMinor;
    }
  const relations = relationsOf(person);
  const share = Math.floor(net / takers.length);
  takers.forEach((toId, index) => {
    // The first taker also receives the cents an equal split leaves over.
    let amountMinor = index
      ? share
      : net - share * (takers.length - api.parameter("one"));
    if (amountMinor <= api.parameter("zero")) return;
    const owed = heirs.length
      ? inheritanceTax(api, stateKey, relations.get(toId) ?? "", amountMinor)
      : null;
    if (owed) {
      payTax(owed, toId);
      amountMinor -= owed.amountMinor;
    }
    if (amountMinor <= api.parameter("zero")) return;
    accounts.transfer({
      id: `estate:${personId}:${toId}`,
      from,
      to: accounts.main(toId),
      amountMinor,
      reasonKey: heirs.length ? "estate.inheritance" : "estate.escheat",
      source:
        row?.tag === "SOURCED"
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
    paid.push({ toId, amountMinor });
    if (heirs.length) noticeTaxes(api, personId, toId, amountMinor, taxes);
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
