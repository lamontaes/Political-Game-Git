/**
 * A person's resting stress: the level their stress returns to when nothing is
 * happening to them. It is a weighted read of the person's own situation,
 * never one number for everyone: how many months of living costs their cash
 * covers, whether a person of working age has a job, their age, how much they
 * brood and how calm they are, and (for a full person) how much their health
 * asks of them. Every term slides; nothing flips at a threshold and nothing
 * rolls a die. The scale is the PSS-10 total over its 40 points, so the
 * population's average and spread can be checked against the survey norms.
 * The same function serves a full person (monthly, in the resting-stress
 * module) and a counted person (when a counted group decides), so a counted
 * resident reads the same rule as a full person (one model, two tiers).
 */
import reachParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { moduleState } from "./module-state";
import { webReach } from "./modules/laws";
import { parameterValues } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreState, PersonInput } from "./types";

export type RestingStressRow = Pick<
  PersonInput,
  | "birthDate"
  | "liquidMinor"
  | "livingCostDailyMinor"
  | "jobId"
  | "traits"
  | "placeId"
>;

/** What a read of the web needs of a world (outcome-web-reach.ts): its state and its modules' tables. */
type WebHost = Parameters<typeof webReach>[0];

/** The web's reach on a world, built from its state alone: the counted tier decides without an engine API. */
const HOSTS = new WeakMap<CoreState, WebHost>();
function webHost(core: CoreState): WebHost {
  let host = HOSTS.get(core);
  if (!host) {
    host = { state: core, moduleState: (id) => moduleState(core, id) };
    HOSTS.set(core, host);
  }
  return host;
}

/**
 * The web's factor on the share of teens in a major depressive episode, for a
 * person in the ages the social media age check covers (its reach row in
 * data/laws/reach-group-a.json: from `socialMediaAgeFrom` up to the voting
 * age); undefined for everyone else, and one where the web keeps no month for
 * the place.
 * The age check moves that share by age-verification-to-youth-depressive-episode
 * (an estimate from the nearest research, with a spread across zero).
 */
function teenDistressFactor(
  core: CoreState,
  row: RestingStressRow,
  age: number,
  votingAge: number,
): number | undefined {
  if (age < reachParameters.parameters.socialMediaAgeFrom.value)
    return undefined;
  if (age >= votingAge) return undefined;
  // stopgapId: SG-LAW-age-check-teen-distress: one for one with the share in an episode; no mood or depression record.
  stopgap("SG-LAW-age-check-teen-distress", core);
  return webReach(
    webHost(core),
    row.placeId,
    "health.youth-major-depressive-episode",
    { age },
  ).factor;
}

/** The share of a rise between two points that a value has made, held in 0..1. */
function ramp(
  value: number,
  from: number,
  to: number,
  zero: number,
  one: number,
) {
  return Math.min(one, Math.max(zero, (value - from) / (to - from)));
}

/** One value from the cached numeric view, or the same throw as an untagged row. */
function valueOf(
  values: Readonly<Record<string, number>>,
  key: string,
): number {
  const value = values[key];
  if (value === undefined)
    throw new Error(`Untagged numeric parameter: ${key}`);
  return value;
}

/**
 * The resting stress for this person on this date. `healthNeed` is the share
 * (0..1) of care the person's own health asks, which only a full person has.
 */
export function restingStress(
  core: CoreState,
  row: RestingStressRow,
  healthNeed = 0,
): number {
  // The cached numeric view of the table: a counted group calls this daily.
  const values = parameterValues(core.data.parameters);
  const zero = valueOf(values, "zero");
  const one = valueOf(values, "one");
  const age =
    Number(core.date.slice(zero, valueOf(values, "isoYearCharacters"))) -
    Number(row.birthDate.slice(zero, valueOf(values, "isoYearCharacters")));
  // Money: the months of living costs the person's cash covers. Pressure is
  // one with no cash and falls smoothly as the cushion grows.
  const monthlyCost =
    row.livingCostDailyMinor *
    (valueOf(values, "daysPerMeanYear") / valueOf(values, "monthsPerYear"));
  // Someone with no recorded living costs has no money pressure to read.
  const money =
    monthlyCost > zero
      ? valueOf(values, "restingStressMoneyWeight") *
        (one /
          (one +
            Math.max(zero, row.liquidMinor) /
              monthlyCost /
              valueOf(values, "restingStressMoneyHalfMonths")))
      : zero;
  // Work: a person in the years people work, without a job. The weight rises
  // into those years and falls out of them, so a retiree or a child is not
  // counted as out of work.
  const workAge =
    ramp(
      age,
      valueOf(values, "restingStressWorkAgeFrom"),
      valueOf(values, "restingStressWorkAgeFullFrom"),
      zero,
      one,
    ) *
    (one -
      ramp(
        age,
        valueOf(values, "restingStressWorkAgeFullTo"),
        valueOf(values, "restingStressWorkAgeTo"),
        zero,
        one,
      ));
  const jobless = row.jobId
    ? zero
    : valueOf(values, "restingStressJoblessWeight") * workAge;
  // Age: the young run higher, and the old run lower. A teen's gap moves with
  // the web's factor on the share of teens in a depressive episode, where the
  // social media age check is in force (teenDistressFactor).
  const young =
    valueOf(values, "restingStressYouthWeight") *
    (one -
      ramp(
        age,
        valueOf(values, "restingStressYouthFromAge"),
        valueOf(values, "restingStressYouthToAge"),
        zero,
        one,
      )) *
    (teenDistressFactor(core, row, age, valueOf(values, "votingAge")) ?? one);
  const old =
    valueOf(values, "restingStressElderWeight") *
    ramp(
      age,
      valueOf(values, "restingStressElderFromAge"),
      valueOf(values, "restingStressElderToAge"),
      zero,
      one,
    );
  // Traits: brooding raises it and calm lowers it, each on a two-sided scale.
  const scale = valueOf(values, "traitScale");
  const brooding = Math.min(
    one,
    Math.max(
      valueOf(values, "negativeOne"),
      (row.traits["personality-v1:facet-brooding"] ?? zero) / scale,
    ),
  );
  const calm = Math.min(
    one,
    Math.max(
      valueOf(values, "negativeOne"),
      (row.traits["personality-v1:facet-calm"] ?? zero) / scale,
    ),
  );
  const traits =
    valueOf(values, "restingStressBroodingWeight") * brooding -
    valueOf(values, "restingStressCalmWeight") * calm;
  const health =
    valueOf(values, "restingStressHealthWeight") *
    Math.min(one, Math.max(zero, healthNeed));
  return Math.max(
    zero,
    valueOf(values, "restingStressFloor") +
      money +
      jobless +
      young -
      old +
      traits +
      health,
  );
}
