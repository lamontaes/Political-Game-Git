import rows from "./data/renewal/parameters.json" with { type: "json" };
import type { CoreAPI } from "./types";
import type { Parameter } from "./parameters";
export const RENEWAL_PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** Module numbers remain tagged without copying every ordinary actor's registry. */
export function renewalParameter(api: CoreAPI, key: string): number {
  if (!RENEWAL_PARAMETERS[key]) return api.parameter(key);
  const row = api.state.data.parameters[key] ?? RENEWAL_PARAMETERS[key]!;
  if (row.stopgapId) api.stopgap(row.stopgapId);
  if (!Number.isFinite(row.value))
    throw new Error(`Invalid renewal parameter: ${key}`);
  return row.value;
}
