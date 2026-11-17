/**
 * Veterans' benefits paid in town from the federal veterans line (pool item
 * laws-veterans-line-pays-the-towns-veterans). The past's service pass
 * (`serviceOf`, src/core2/past-work.ts) already says which full residents
 * served; the counted residents are counted by the same ACS veteran share
 * for their age. The treasury's monthly close pays each veteran the average
 * benefit times the share of veterans who draw one, times the veterans line
 * in force over its base, as SSI is paid. The money counts against the line,
 * so the close pays only the rest to veterans elsewhere, and a bill that
 * changed the line has the change written on its own record.
 */
import type { CoreAPI, CoreState } from "../types";
import { lawChain } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import { serviceOf } from "../past";
import { reachParameter, townFacts } from "./group-b-people";
import {
  federalBenefitLine,
  governmentAt,
  reconcileObligations,
  recordLineShare,
  takesUp,
} from "./group-b-money";

/** The federal budget line veterans' benefits are paid from, and its law-reach key. */
export const VETERANS_LINE = "veterans";
export const VETERANS_KEY = `budget-line:${VETERANS_LINE}`;

/** Whether a full resident served, read once per world from the past's service pass. */
const servedCache = new WeakMap<CoreState, Map<string, boolean>>();
function served(core: CoreState, personId: string): boolean {
  let byPerson = servedCache.get(core);
  if (!byPerson) servedCache.set(core, (byPerson = new Map()));
  const hit = byPerson.get(personId);
  if (hit !== undefined) return hit;
  const person = core.people.get(personId);
  const yes = person ? serviceOf(core, person) !== undefined : false;
  byPerson.set(personId, yes);
  return yes;
}

/**
 * Pay the town's veterans their month's benefit from the federal treasury.
 * Returns the full veterans paid and the counted veterans paid for.
 */
export function payVeterans(api: CoreAPI): {
  readonly named: number;
  readonly counted: number;
} {
  const core = api.state as CoreState;
  const payer = governmentAt(api, "federal");
  if (!payer) return { named: 0, counted: 0 };
  const town = lawChain(api).townPlaceId;
  const facts = townFacts(api, town);
  const line = federalBenefitLine(api, VETERANS_LINE);
  const cents = reachParameter("centsPerDollar");
  // Each veteran's benefit: the average paid to one who draws. Who draws is
  // each veteran's own case to take it up (`takesUp`), not a published share.
  const base = Math.round(
    reachParameter("veteransMonthlyBenefitDollars") * cents,
  );
  const monthly = Math.round(base * line.level);
  const want = new Map<string, number>();
  let named = 0;
  let countedVeterans = 0;
  if (monthly > 0) {
    // One model, two tiers: the counted residents' veterans who draw are the
    // full residents' own share by ten-year age band (their served records
    // and their own take-up), times the counted count in that band.
    const band = (age: number) => Math.floor(age / 10);
    const full = new Map<number, { people: number; drawing: number }>();
    for (const r of facts.residents) {
      if (!r.named || r.age < reachParameter("votingAge")) continue;
      const row = full.get(band(r.age)) ?? { people: 0, drawing: 0 };
      row.people += 1;
      full.set(band(r.age), row);
      if (!served(core, r.id)) continue;
      if (
        !takesUp(
          api,
          r.id,
          monthly,
          facts.households.get(r.householdId),
          VETERANS_KEY,
        ).yes
      )
        continue;
      row.drawing += 1;
      named += 1;
      want.set(`${payer.id}|${r.id}`, monthly);
      recordLineShare(api, line, {
        key: VETERANS_KEY,
        targetId: r.id,
        target: "person",
        what: "veterans-benefit-changed-by-line",
        baseMinor: base,
        paidMinor: monthly,
      });
    }
    for (const r of facts.residents) {
      if (r.named || r.age < reachParameter("votingAge")) continue;
      const row = full.get(band(r.age));
      if (!row?.people) continue;
      countedVeterans += (row.drawing / row.people) * (r.scale ?? 1);
    }
  }
  const residentsOrg = residentsRuntime(core)?.input.accounts.find(
    (a) => a.placeId === town,
  )?.accountId;
  const counted = Math.round(countedVeterans);
  if (residentsOrg && counted > 0) {
    want.set(
      `${payer.id}|${residentsOrg}`,
      Math.floor(monthly * countedVeterans),
    );
    recordLineShare(api, line, {
      key: VETERANS_KEY,
      targetId: `${town}:veterans`,
      target: "group",
      what: "veterans-benefit-changed-by-line",
      count: counted,
      baseMinor: Math.floor(base * countedVeterans),
      paidMinor: Math.floor(monthly * countedVeterans),
    });
  }
  reconcileObligations(api, {
    rowKind: "benefit",
    key: VETERANS_KEY,
    want,
    line: VETERANS_LINE,
    reasonKey: "law-reach:veterans-benefit",
    citation:
      "Veterans' benefits (38 U.S.C. chapters 11 and 15): the federal Treasury pays compensation and pensions to veterans from the veterans line",
  });
  return { named, counted };
}
