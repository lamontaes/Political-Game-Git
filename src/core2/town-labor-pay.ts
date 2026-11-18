import { campaignParameter } from "./campaign-data";
import { lawChain } from "./modules/laws";
import type { CoreAPI, CoreState } from "./types";

/**
 * What the town's own labor market pays an hour, in cents, at a place in the
 * ranking of its private jobs' pay (0.5 is the median, 0.85 the pay of a job
 * better paid than most): read from the jobs the town's private employers hold
 * today, so a post paid from it rises and falls with the town's wages and never
 * stands at a published dollar. Where the town holds no private job yet, the
 * named parameter's estimate stands (the caller registers that stopgap).
 * Read once a day for each place in the ranking.
 */
const held = new WeakMap<
  CoreState,
  Map<number, { date: string; minor: number | null }>
>();

export function townPayAt(api: CoreAPI, quantile: number): number | null {
  const state = api.state as CoreState;
  let byQuantile = held.get(state);
  if (!byQuantile) held.set(state, (byQuantile = new Map()));
  const known = byQuantile.get(quantile);
  if (known?.date === state.date) return known.minor;
  const town = lawChain(api).townPlaceId;
  const pays: number[] = [];
  for (const job of state.jobs.values()) {
    if (job.endsAt !== undefined || !((job.hourlyMinor ?? 0) > 0)) continue;
    const org = state.organizations.get(job.organizationId);
    if (
      org?.placeId !== town ||
      org.kind !== "employer" ||
      org.publicPayAuthority ||
      org.outsideFlow
    )
      continue;
    pays.push(job.hourlyMinor!);
  }
  pays.sort((a, b) => a - b);
  const minor = pays.length
    ? Math.round(
        pays[
          Math.min(
            pays.length - 1,
            Math.floor(pays.length * Math.min(Math.max(quantile, 0), 1)),
          )
        ]!,
      )
    : null;
  byQuantile.set(quantile, { date: state.date, minor });
  return minor;
}

/** An appointed department head's pay an hour, in cents: the town's own pay at the rank the parameter gives (stopgapId: SG-LABOR-head-pay-estimate where the town has no private job). */
export function appointeeHourlyMinor(api: CoreAPI): number {
  const minor = townPayAt(api, campaignParameter("appointeePayQuantile"));
  if (minor !== null) return minor;
  api.stopgap("SG-LABOR-head-pay-estimate");
  return campaignParameter("appointeeHourlyMinor");
}
