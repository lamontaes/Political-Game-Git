import {
  adoptedCountyLevy,
  countyBudgetHearings,
} from "./county-budget-record";
import { COUNTY_SERVICE_FAMILIES } from "./law-consequences/service-delivered-data";
import { recordAdoptedAppropriation } from "./governing/program-governing";
import { openProgramMattersForAllOffices } from "./governing/state-governing";
import { BUDGET_PROGRAMS } from "./public-budgets/store";
import type { EntityId, IsoDate, World } from "./types";

/**
 * A county's own services, funded by its board's voted budget lines (CO-9).
 *
 * When the fiscal year a board voted a levy for opens, each service line the
 * county's budget carries becomes one appropriation on the county's public
 * account: health clinics from the health and hospitals line, road repair from
 * the highways line, the fair from the parks line. The board's measure is the
 * appropriation's source, so the money has the board's vote behind it. The
 * county's executive then commits it through the same program decision every
 * government uses, to an organization already working in the county, and the
 * service reaches residents through the shared request, attendance and
 * delivered-service records. A county with no such organization commits
 * nothing, and no provider is made up.
 *
 * One rule for every county; no place is named here.
 */

const COUNTY_PREFIX = "county:";

function programKeyFor(family: string, governmentKey: string): string {
  return `${family}:${governmentKey.slice(COUNTY_PREFIX.length)}`;
}

function editionFor(hearingKey: string, family: string): string {
  return `${hearingKey}:${family}`.replace(/[^a-z0-9._:-]+/gi, "-");
}

/**
 * Writes the service appropriations of every county whose voted budget year
 * opened in the month just closed. Idempotent: each is keyed by the hearing it
 * came from, so a second pass writes nothing.
 */
export function ensureCountyServiceAppropriations(
  world: World,
  openedSince: IsoDate,
): World {
  const store = world.publicBudgets;
  if (!store || countyBudgetHearings(world).length === 0) return world;
  let next = world;
  const fresh = new Set<EntityId>();
  for (const government of store.governments) {
    if (government.level !== "county") continue;
    const year = government.years.at(-1);
    if (!year || year.basis !== "board-vote" || !year.hearingKey) continue;
    if (year.startsOn < openedSince) continue;
    const hearing = adoptedCountyLevy(next, government.key, year.fiscalYear);
    if (!hearing) continue;
    // The county's own account is the one its tax proposal names; that is
    // where the voted levy's money lands.
    const proposal = (next.history.taxProposals ?? []).find(
      (row) => row.id === hearing.taxProposalId,
    );
    const identity = proposal?.publicGovernmentIdentity;
    if (!identity || identity.kind !== "local-government") continue;
    for (const { family, line } of COUNTY_SERVICE_FAMILIES) {
      const dollars = year.appropriations[BUDGET_PROGRAMS.indexOf(line)] ?? 0;
      if (!(dollars > 0)) continue;
      const written = recordAdoptedAppropriation(next, {
        familyKey: family,
        programKey: programKeyFor(family, government.key),
        jurisdictionId: government.jurisdictionId,
        publicGovernmentIdentity: identity,
        amountMinorUnits: Math.round(dollars) * 100,
        adoptedOn: year.startsOn,
        availableThrough: year.endsOn,
        edition: editionFor(hearing.key, family),
        basisNote: `county-services/v1: the county board's voted ${year.fiscalYear} budget; this is that budget's ${line} line.`,
        sourceMeasureId: hearing.measureId,
      });
      if (!written) continue;
      next = written.world;
      fresh.add(written.appropriationId);
    }
  }
  return fresh.size > 0 ? openProgramMattersForAllOffices(next, fresh) : next;
}
