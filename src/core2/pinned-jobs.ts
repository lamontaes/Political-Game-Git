/**
 * Jobs that a saved agreement (a visitor's lodging, a public supplier
 * contract) names as its provider's qualification. The core rejects the
 * agreement's next payment once such a job ends, so the jobs engine leaves
 * them alone and the people-moves engine keeps their holders in town, until
 * agreements re-resolve their qualifying worker. One lookup for both.
 */
import { stopgap } from "./stopgaps";
import type { CoreState } from "./types";

const pinnedByCore = new WeakMap<CoreState, Set<string>>();

/** Every job id a saved record names under `jobIds`, through nested JSON text. */
function collectJobIds(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    if (!value.includes("jobIds")) return;
    try {
      collectJobIds(JSON.parse(value), ids);
    } catch {
      return;
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectJobIds(item, ids);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "jobIds" && Array.isArray(item)) {
        for (const id of item) if (typeof id === "string") ids.add(id);
      } else collectJobIds(item, ids);
    }
  }
}

/** The jobs a saved agreement names as its provider's qualification. */
export function pinnedJobs(c: CoreState): Set<string> {
  let ids = pinnedByCore.get(c);
  if (ids) return ids;
  stopgap("SG-WORLD-jobs-agreement-pinned");
  ids = new Set();
  collectJobIds(Object.values(c.placeMetadata ?? {}), ids);
  for (const organization of c.organizations.values())
    collectJobIds(Object.values(organization.governmentFacts ?? {}), ids);
  pinnedByCore.set(c, ids);
  return ids;
}

/** Drop the remembered lookup, after the records it reads change. */
export function forgetPinnedJobs(c: CoreState): void {
  pinnedByCore.delete(c);
}
