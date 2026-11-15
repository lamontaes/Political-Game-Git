/**
 * The fee levels a bill can set (pool item gov-fee-level-by-bill, owner Oct
 * 24: a council can set a fee level by bill where its powers allow). Each
 * charge a government collects that the world can show it runs (parks, sewer
 * and trash, hospital bills, tuition) has a law series whose value is the fee as a
 * percent of what the budget's charges line already assumes: 100 means as
 * today. The charge payment reads the level in force when it is paid, so the
 * people who use the service pay the new level and the charges line follows.
 */

/** The census service each fee series sets, by series. */
export const FEE_LEVEL_SERVICES: Readonly<Record<string, string>> = {
  "fee-level:parks-and-recreation": "parks-and-recreation",
  "fee-level:sewerage-and-solid-waste": "sewerage-and-solid-waste",
  "fee-level:hospitals": "hospitals",
  "fee-level:education": "education",
};

/**
 * What shows a government runs the thing a fee is for: the spending lines of
 * its own budget that pay for it (null: the charges row alone shows it, as
 * sewer and trash is billed per dwelling). Tolls and parking have no series
 * until a record of a toll road or a parking system exists (pool item
 * gov-fee-facility-record-for-tolls-and-parking); their series, bill names
 * and catalog rows return with it.
 */
export const FEE_LEVEL_RUNS: Readonly<
  Record<string, readonly string[] | null>
> = {
  "parks-and-recreation": ["parks"],
  "sewerage-and-solid-waste": null,
  hospitals: ["healthAndHospitals"],
  education: ["schools", "higherEducation"],
};

export const FEE_LEVEL_SERIES: readonly string[] =
  Object.keys(FEE_LEVEL_SERVICES);

export const FEE_LEVEL_UNIT = "percent of today's fee";

/** What a fee is worth with no bill: the schedule the budget already assumes. */
export const FEE_LEVEL_BASELINE = 100;

export const isFeeLevelSeries = (series: string): boolean =>
  series in FEE_LEVEL_SERVICES;
