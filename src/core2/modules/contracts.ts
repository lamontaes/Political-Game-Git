/**
 * Public contracts (gov-public-contract-awards). A government's budget line
 * that buys work from private businesses is awarded to one of the town's
 * firms for the fiscal year, chosen from their bids by the government's own
 * body: each member of the body ranks the bids by what the firm's labor
 * costs against the other bidders, how large a workforce it has, and how
 * close the member is to the firm's owner. How much the price counts against
 * that tie follows the member's traits (rule-followers weigh price, rule-
 * benders weigh the tie), on a sliding scale. The firm with the most
 * members' first choices wins; a tie goes to the larger total score, then the
 * firm's id. Nothing rolls. A member who is a counted name rather than a full
 * person weighs price and workforce only. The treasury pays the winner the
 * line's purchases each month, and the award keeps those payments.
 */
import { closenessBetween } from "../closeness";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import rows from "../data/contracts/parameters.json" with { type: "json" };
import {
  budgetInForce,
  registerContractAwarder,
  type ContractAward,
  type ProviderFirm,
} from "../budgets-treasury";
import type { Parameter } from "../parameters";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import type { GovernmentRow } from "./budgets";
import { ownerOf } from "./business";
import { CORRUPTION_MODULE_ID, considerBribe } from "./corruption";
import { governingMembers, memberKey } from "./legislature";

export const CONTRACTS_MODULE_ID = "contracts";
const PARAMETERS = rows as unknown as Readonly<Record<string, Parameter>>;
const c = (key: string) => PARAMETERS[key]!.value;
const DECISION = "contracts.award";

export interface ContractBid {
  readonly organizationId: string;
  readonly staff: number;
  readonly wageDailyMinor: number;
}

export interface ContractAwardRow {
  readonly id: string;
  readonly governmentId: string;
  readonly line: string;
  readonly fiscalYear: number;
  readonly awardedOn: string;
  readonly organizationId: string;
  /** "vote" where the body's members chose; "rules" where it has none seated. */
  readonly basis: "vote" | "rules";
  readonly bids: readonly ContractBid[];
  /** Each member's first choice, by member key. */
  readonly votes: Readonly<Record<string, string>>;
  readonly tally: Readonly<Record<string, number>>;
  /** Bribes a bidder offered a member for this award, taken or refused (corruption.ts crime ids). */
  readonly bribes: readonly {
    readonly crimeId: string;
    readonly memberId: string;
    readonly organizationId: string;
    readonly taken: boolean;
  }[];
  /** Taken bribes whose member then ranked the briber's firm first: the votes a bribe took part in. */
  readonly boughtVotes: readonly string[];
  /** The firm the body would have chosen had no bribe been taken; absent when none was. */
  readonly withoutBribes?: string;
  readonly paidMinor: number;
  readonly paymentIds: readonly string[];
}

const table = (api: CoreAPI) =>
  api.moduleState(CONTRACTS_MODULE_ID).table("awards");

/** The award in force for a government's line, if any. */
export function contractFor(
  api: CoreAPI,
  governmentId: string,
  line: string,
): ContractAwardRow | undefined {
  if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return undefined;
  return [
    ...(table(api).query("byLine", [
      governmentId,
      line,
    ]) as unknown as ContractAwardRow[]),
  ]
    .sort((a, b) => a.awardedOn.localeCompare(b.awardedOn))
    .at(-1);
}

/** Every award a government has made. */
export function contractsOf(
  api: CoreAPI,
  governmentId: string,
): readonly ContractAwardRow[] {
  if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return [];
  return table(api).query("byGovernment", [
    governmentId,
  ]) as unknown as ContractAwardRow[];
}

function award(
  api: CoreAPI,
  input: {
    readonly gov: GovernmentRow;
    readonly line: string;
    readonly monthlyMinor: number;
    readonly firms: readonly ProviderFirm[];
  },
): ContractAward | null {
  const { gov, line, firms } = input;
  // The hook is registered once per process; a core without the module buys nothing in town.
  if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return null;
  const fiscalYear =
    budgetInForce(api, gov.id)?.fiscalYear ??
    Number(api.state.date.slice(0, 4));
  const held = contractFor(api, gov.id, line);
  if (
    held &&
    held.fiscalYear === fiscalYear &&
    firms.some((f) => f.organizationId === held.organizationId)
  )
    return { id: held.id, organizationId: held.organizationId };
  const mean = {
    wage: firms.reduce((s, f) => s + f.wageDailyMinor, 0) / firms.length,
    staff: firms.reduce((s, f) => s + f.staff, 0) / firms.length,
  };
  const members = governingMembers(api, gov);
  const state = api.state as CoreState;
  const owners = new Map(
    firms.map((f) => [f.organizationId, ownerOf(api, f.organizationId)]),
  );
  const bribes: ContractAwardRow["bribes"][number][] = [];
  // A bidder's owner may offer a member a bribe for the award, and the member
  // decides whether to take it (corruption.ts, each by their own traits,
  // money and tie). The favor is worth a year of the work.
  const given = new Map<string, number>();
  if (api.state.modules.has(CORRUPTION_MODULE_ID)) {
    const accounts = state.cashJournal.residualAccountByOwner;
    for (const member of members) {
      const person = member.personId
        ? state.people.get(member.personId)
        : undefined;
      if (!person || !accounts.has(person.id)) continue;
      for (const firm of firms) {
        const ownerId = owners.get(firm.organizationId);
        if (!ownerId || ownerId === person.id || !accounts.has(ownerId))
          continue;
        const crime = considerBribe(api, {
          offererId: ownerId,
          officialId: person.id,
          stakeMinor: input.monthlyMinor * 12,
          subjectId: `contract:${gov.id}:${line}:${api.state.date}`,
        });
        if (!crime?.offered) continue;
        bribes.push({
          crimeId: crime.id,
          memberId: person.id,
          organizationId: firm.organizationId,
          taken: crime.taken,
        });
        if (crime.taken)
          given.set(
            `${person.id}|${firm.organizationId}`,
            Math.log1p(
              crime.amountMinor / (person.livingCostDailyMinor * 30 + 1),
            ),
          );
      }
    }
  }
  // With no one seated the body's rules alone decide: price and workforce.
  const voters = members.length ? members : [null];
  const traitWeight = decisionTraitWeight(state, DECISION);
  const count = (withBribes: boolean) => {
    const totals = new Map(firms.map((f) => [f.organizationId, 0]));
    const tally = new Map(firms.map((f) => [f.organizationId, 0]));
    const votes: Record<string, string> = {};
    for (const member of voters) {
      const person = member?.personId
        ? state.people.get(member.personId)
        : undefined;
      const lean = person
        ? decisionLean(
            state,
            person,
            DECISION,
            "award-known-firm",
            "award-lowest-bid",
          )
        : 0;
      let best: { id: string; score: number } | undefined;
      for (const firm of firms) {
        const price = Math.log(mean.wage / Math.max(firm.wageDailyMinor, 1));
        const capacity = Math.log(firm.staff / mean.staff);
        const ownerId = owners.get(firm.organizationId);
        const tie =
          person && ownerId && ownerId !== person.id
            ? closenessBetween(state, person.id, ownerId)
            : 0;
        const score =
          c("contractPriceWeight") * (1 - traitWeight * lean) * price +
          c("contractCapacityWeight") * capacity +
          c("contractTieWeight") * (1 + traitWeight * lean) * tie +
          (withBribes && person
            ? c("contractBribeWeight") *
              (given.get(`${person.id}|${firm.organizationId}`) ?? 0)
            : 0);
        totals.set(
          firm.organizationId,
          totals.get(firm.organizationId)! + score,
        );
        if (
          !best ||
          score > best.score ||
          (score === best.score && firm.organizationId < best.id)
        )
          best = { id: firm.organizationId, score };
      }
      tally.set(best!.id, tally.get(best!.id)! + 1);
      if (member) votes[memberKey(member)] = best!.id;
    }
    const winner = firms
      .map((f) => f.organizationId)
      .sort(
        (a, b) =>
          tally.get(b)! - tally.get(a)! ||
          totals.get(b)! - totals.get(a)! ||
          a.localeCompare(b),
      )[0]!;
    return { winner, tally, votes };
  };
  const { winner, tally, votes } = count(true);
  const without = given.size ? count(false).winner : winner;
  const row: ContractAwardRow = {
    id: `contract:${gov.id}:${line}:${api.state.date}`,
    governmentId: gov.id,
    line,
    fiscalYear,
    awardedOn: api.state.date,
    organizationId: winner,
    basis: members.length ? "vote" : "rules",
    bids: firms.map((f) => ({
      organizationId: f.organizationId,
      staff: f.staff,
      wageDailyMinor: Math.round(f.wageDailyMinor),
    })),
    votes,
    tally: Object.fromEntries(tally),
    bribes,
    boughtVotes: bribes
      .filter((b) => b.taken && votes[b.memberId] === b.organizationId)
      .map((b) => b.crimeId),
    ...(without !== winner ? { withoutBribes: without } : {}),
    paidMinor: 0,
    paymentIds: [],
  };
  table(api).put(row as unknown as ModuleRow);
  return { id: row.id, organizationId: winner };
}

export const CONTRACTS_MODULE: CoreModule = {
  id: CONTRACTS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      awards: {
        indexes: {
          byLine: { fields: ["governmentId", "line"] },
          byGovernment: { fields: ["governmentId"] },
        },
      },
    },
  },
};

/** Register the module and tell the treasury how the body chooses its firms. */
export function openContracts(core: CoreState): void {
  if (!core.modules.has(CONTRACTS_MODULE_ID))
    registerModule(core, CONTRACTS_MODULE);
  registerContractAwarder({
    award,
    paid(api, awardId, payment) {
      if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return;
      const row = table(api).get(awardId) as unknown as
        ContractAwardRow | undefined;
      if (!row || row.paymentIds.includes(payment.id)) return;
      table(api).put({
        ...row,
        paidMinor: row.paidMinor + payment.amountMinor,
        paymentIds: [...row.paymentIds, payment.id],
      } as unknown as ModuleRow);
    },
  });
}
