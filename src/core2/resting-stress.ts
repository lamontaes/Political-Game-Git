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
import { parameterValues } from "./parameters";
import type { CoreState, PersonInput } from "./types";

export type RestingStressRow = Pick<
  PersonInput,
  "birthDate" | "liquidMinor" | "livingCostDailyMinor" | "jobId" | "traits"
>;

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

/**
 * The resting stress for this person on this date. `healthNeed` is the share
 * (0..1) of care the person's own health asks, which only a full person has.
 */
export function restingStress(
  core: Pick<CoreState, "data" | "date">,
  row: RestingStressRow,
  healthNeed = 0,
): number {
  // The cached numeric view of the table: a counted group calls this daily.
  const values = parameterValues(core.data.parameters);
  const p = (key: string): number => {
    const value = values[key];
    if (value === undefined)
      throw new Error(`Untagged numeric parameter: ${key}`);
    return value;
  };
  const zero = p("zero");
  const one = p("one");
  const age =
    Number(core.date.slice(zero, p("isoYearCharacters"))) -
    Number(row.birthDate.slice(zero, p("isoYearCharacters")));
  // Money: the months of living costs the person's cash covers. Pressure is
  // one with no cash and falls smoothly as the cushion grows.
  const monthlyCost =
    row.livingCostDailyMinor * (p("daysPerMeanYear") / p("monthsPerYear"));
  // Someone with no recorded living costs has no money pressure to read.
  const money =
    monthlyCost > zero
      ? p("restingStressMoneyWeight") *
        (one /
          (one +
            Math.max(zero, row.liquidMinor) /
              monthlyCost /
              p("restingStressMoneyHalfMonths")))
      : zero;
  // Work: a person in the years people work, without a job. The weight rises
  // into those years and falls out of them, so a retiree or a child is not
  // counted as out of work.
  const workAge =
    ramp(
      age,
      p("restingStressWorkAgeFrom"),
      p("restingStressWorkAgeFullFrom"),
      zero,
      one,
    ) *
    (one -
      ramp(
        age,
        p("restingStressWorkAgeFullTo"),
        p("restingStressWorkAgeTo"),
        zero,
        one,
      ));
  const jobless = row.jobId ? zero : p("restingStressJoblessWeight") * workAge;
  // Age: the young run higher, and the old run lower.
  const young =
    p("restingStressYouthWeight") *
    (one -
      ramp(
        age,
        p("restingStressYouthFromAge"),
        p("restingStressYouthToAge"),
        zero,
        one,
      ));
  const old =
    p("restingStressElderWeight") *
    ramp(
      age,
      p("restingStressElderFromAge"),
      p("restingStressElderToAge"),
      zero,
      one,
    );
  // Traits: brooding raises it and calm lowers it, each on a two-sided scale.
  const scale = p("traitScale");
  const brooding = Math.min(
    one,
    Math.max(
      p("negativeOne"),
      (row.traits["personality-v1:facet-brooding"] ?? zero) / scale,
    ),
  );
  const calm = Math.min(
    one,
    Math.max(
      p("negativeOne"),
      (row.traits["personality-v1:facet-calm"] ?? zero) / scale,
    ),
  );
  const traits =
    p("restingStressBroodingWeight") * brooding -
    p("restingStressCalmWeight") * calm;
  const health =
    p("restingStressHealthWeight") * Math.min(one, Math.max(zero, healthNeed));
  return Math.max(
    zero,
    p("restingStressFloor") + money + jobless + young - old + traits + health,
  );
}
