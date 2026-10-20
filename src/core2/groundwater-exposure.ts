/**
 * How much of a county's irrigation water is pumped groundwater (USGS water
 * use for 2015), which is what a groundwater-withdrawal law can take from a
 * farm there: a county that irrigates only from rivers loses nothing to it,
 * one that irrigates only from wells loses the whole statutory cut. A county
 * the file does not name starts from the national share, marked ESTIMATED.
 */
import use from "./data/laws/groundwater-irrigation-2015.json" with { type: "json" };

const counties = use.counties as unknown as Record<
  string,
  [number, number, number]
>;
const dry = new Set(use.dryCounties);

export interface GroundwaterExposure {
  /** Groundwater as a share of the county's irrigation water, 0 to 1. */
  readonly share: number;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly citation: string;
  /** The county's irrigated acres (thousand), when the file names it. */
  readonly irrigatedThousandAcres?: number;
}

export function groundwaterExposure(
  countyGeoid: string | undefined,
): GroundwaterExposure {
  const id = countyGeoid?.slice(-5) ?? "";
  const row = counties[id];
  if (row)
    return {
      share: row[0] / (row[0] + row[1]),
      tag: "SOURCED",
      citation: `${use.source} County ${id}: ${row[0]} Mgal/d groundwater and ${row[1]} surface water for irrigation.`,
      irrigatedThousandAcres: row[2],
    };
  if (dry.has(id))
    return {
      share: 0,
      tag: "SOURCED",
      citation: `${use.source} County ${id} irrigates nothing.`,
    };
  return {
    share: use.nationalGroundwaterShare,
    tag: "ESTIMATED",
    citation: `${use.source} Nationwide, groundwater was ${Math.round(use.nationalGroundwaterShare * 100)} percent of irrigation withdrawals; counties run from none to all.`,
  };
}
