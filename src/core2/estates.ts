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
  const share = Math.floor(estate / takers.length);
  takers.forEach((toId, index) => {
    // The first taker also receives the cents an equal split leaves over.
    const amountMinor = index
      ? share
      : estate - share * (takers.length - api.parameter("one"));
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
  });
  return paid;
}
