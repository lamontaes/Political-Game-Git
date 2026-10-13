/**
 * The 14 values (M1-10): each person's strength on each, -1 to 1, formed from
 * their own record the first time it is read, like their lean.
 *
 * A value's answer key is the Cooperative Election Study 2024
 * (src/core2/data/views/ces-2024-values.json): the mean for the person's state
 * and age band, moved along the value's slope on lean by how far the person's
 * own lean sits from that cell's, plus a residual keyed to the person (who
 * they are at the opening, never a choice). So a person's values agree with
 * their lean as much as surveyed people's do, and no more. A value the survey
 * does not measure (transparency) starts from a neutral estimate with a
 * spread (SG-P15-views-first-version).
 *
 * A policy's support follows from the values it bears on
 * (src/core2/data/views/policy-values.json, the authored bearings): the
 * weighted mean of the person's values, each signed by whether the policy is
 * consistent with or against it.
 */
import valuesJson from "./data/views/ces-2024-values.json" with { type: "json" };
import policyJson from "./data/views/policy-values.json" with { type: "json" };
import viewsJson from "./data/views/views.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { normal, VIEWS_MODULE_ID, viewOf } from "./modules/views";
import type { CoreAPI, PersonId } from "./types";

interface ValueKey {
  strength: string;
  mean: number;
  sd: number;
  slopeOnLean: number;
  residualSd: number;
  cells: Readonly<
    Record<string, { n: number; mean: number; leanMean: number }>
  >;
}
const KEYS = valuesJson as unknown as {
  ageBands: readonly string[];
  values: Readonly<Record<string, ValueKey>>;
};
export const POLICY_VALUES = policyJson as unknown as {
  values: readonly { key: string; name: string }[];
  policies: Readonly<
    Record<
      string,
      { issue: string; bearings: Readonly<Record<string, number>> }
    >
  >;
};
const PARAMETERS = (
  viewsJson as unknown as {
    parameters: Readonly<Record<string, { value: number; stopgapId?: string }>>;
  }
).parameters;
const v = (key: string): number => {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Untagged views parameter: ${key}`);
  return row.value;
};

export type Values = Readonly<Record<string, number>>;

function band(age: number): string {
  for (const row of KEYS.ageBands) {
    const [low, high] = row.split("-");
    if (age >= Number(low) && (high === "plus" || age <= Number(high)))
      return row;
  }
  return KEYS.ageBands[v("zero")]!;
}

/** A person's strengths on the 14 values, formed from their record when first read. */
export function valuesOf(api: CoreAPI, personId: PersonId): Values | null {
  const table = api.moduleState(VIEWS_MODULE_ID).table("values");
  const held = table.get(personId) as unknown as { values: Values } | undefined;
  if (held) return held.values;
  const person = api.state.people.get(personId);
  const view = viewOf(api, personId);
  if (!person || !view) return null;
  const key = lifePlaceByJurisdictionId(
    person.placeId as never,
  )?.stateJurisdictionKey;
  const state = key ? key.slice(key.lastIndexOf("-") + v("one")) : "US";
  const age = band(
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.startedAt)),
  );
  const out: Record<string, number> = {};
  for (const { key: value } of POLICY_VALUES.values) {
    const row = KEYS.values[value];
    const z = normal(`${api.state.seed}:values:${value}:${person.id}`);
    if (!row) {
      // No survey key: a neutral estimate with a spread.
      api.stopgap("SG-P15-views-first-version");
      out[value] = clamp(v("valuesUnkeyedSd") * z);
      continue;
    }
    const cell =
      row.cells[`${state}:${age}`] ?? row.cells[`US:${age}`] ?? undefined;
    const mean = cell?.mean ?? row.mean;
    const leanMean = cell?.leanMean ?? v("zero");
    out[value] = clamp(
      mean + row.slopeOnLean * (view.lean - leanMean) + row.residualSd * z,
    );
  }
  table.put({ id: personId, values: out } as unknown as { id: string });
  return out;
}

function clamp(value: number): number {
  return Math.max(-v("one"), Math.min(v("one"), value));
}

/**
 * How far a person's values support a policy, -1 (against) to 1 (for): the
 * mean of their values weighted by the policy's bearing on each. Null for a
 * policy with no recorded bearings.
 */
export function valueSupport(
  api: CoreAPI,
  personId: PersonId,
  policyKey: string,
): number | null {
  const policy = POLICY_VALUES.policies[policyKey];
  const values = valuesOf(api, personId);
  if (!policy || !values) return null;
  let sum = v("zero");
  let weight = v("zero");
  for (const [value, bearing] of Object.entries(policy.bearings)) {
    sum += bearing * (values[value] ?? v("zero"));
    weight += Math.abs(bearing);
  }
  return weight > v("zero") ? sum / weight : null;
}
