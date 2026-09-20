import type { Evidence, Sourced } from "../../core/index";

export type CpsVotingTable = "4a" | "4b" | "4c";
export type CpsMetricKey =
  | "adultPopulation"
  | "citizenAdultPopulation"
  | "reportedRegistered"
  | "registeredTotalPercent"
  | "registeredTotalMoe"
  | "registeredCitizenPercent"
  | "registeredCitizenMoe"
  | "reportedVoted"
  | "votedTotalPercent"
  | "votedTotalMoe"
  | "votedCitizenPercent"
  | "votedCitizenMoe";
export interface CpsVotingCell {
  readonly literal: string;
  readonly value: Sourced<number>;
  readonly unit: "people" | "percent" | "percentage-points";
  readonly denominator: "none" | "total-adults" | "citizen-adults";
  readonly confidenceLevel: 90 | null;
  /** Published count columns use whole thousands; zero may reflect rounding. */
  readonly publishedResolution: 1000 | 0.1;
  readonly evidence: Evidence;
}
export interface CpsVotingRecord {
  readonly recordId: string;
  readonly table: CpsVotingTable;
  readonly geographyName: string;
  readonly geographyLevel: "nation" | "state-or-district";
  readonly group: string;
  readonly dimension: "total" | "sex" | "race-and-hispanic-origin" | "age";
  readonly period: "2024-11";
  readonly releaseDate: "2025-04-30";
  readonly universe: "civilian-noninstitutionalized-age-18-and-over";
  readonly collection: "self-or-proxy-reported";
  readonly metrics: Readonly<Record<CpsMetricKey, CpsVotingCell>>;
}
