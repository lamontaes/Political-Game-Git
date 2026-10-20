/**
 * Age and the hiring decision. Where no law bars it, an employer too small
 * for the federal age law (fewer than 20 employees) weighs an older applicant
 * down by a researched amount that slides with age. A ban on discrimination in
 * housing and work that is law in the town reaches those small employers: the
 * penalty is not applied, and where that changed who was hired the law is
 * recorded as applied to the person it put in work and the wages that paid.
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { lawApplied } from "./law-reach/applied";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import type { CoreAPI } from "./types";

export const DISCRIMINATION_KEY =
  "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work";
const JOBS_ID = "jobs";

export interface AgeBias {
  /** The ban is law in the town, so the penalty is not applied. */
  readonly ban: boolean;
  readonly lawId: string | null;
  /** Fit points an applicant born on the date would lose where nothing bars it. */
  readonly penaltyOf: (birthDate: string) => number;
}

/** The bias that applies to an employer of this size in this place, or null where the federal law reaches it or the place is not the town. */
export function ageBiasAt(
  api: CoreAPI,
  placeId: string,
  employees: number,
): AgeBias | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  if (placeId !== lawChain(api).townPlaceId) return null;
  if (employees >= api.parameter("jobsAgeLawEmployees")) return null;
  const law = lawInForce(api, DISCRIMINATION_KEY);
  const from = api.parameter("jobsAgeBiasFromAge");
  const full = api.parameter("jobsAgeBiasFullAge");
  const weight = api.parameter("jobsOlderApplicantPenalty");
  const date = api.state.date;
  return {
    ban: law.value === 1 && !!law.governing,
    lawId: law.value === 1 ? (law.governing?.id ?? null) : null,
    penaltyOf: (birthDate) =>
      weight *
      Math.min(
        1,
        Math.max(
          0,
          (ageOnDate(makeIsoDate(birthDate), makeIsoDate(date)) - from) /
            (full - from),
        ),
      ),
  };
}

/** A small employer the ban binds, recorded when its staff is reviewed. */
export function recordEmployerBound(
  api: CoreAPI,
  organizationId: string,
  placeId: string,
  employees: number,
): void {
  const bias = ageBiasAt(api, placeId, employees);
  if (!bias?.ban || !bias.lawId) return;
  lawApplied(api, {
    key: DISCRIMINATION_KEY,
    lawId: bias.lawId,
    targetId: organizationId,
    target: "organization",
    engine: JOBS_ID,
    what: "hiring-bound-by-ban",
  });
}

/** The ban put this applicant in work over one the penalty would have preferred. */
export function recordHiredUnderBan(
  api: CoreAPI,
  bias: AgeBias,
  hired: { personId: string; counted: boolean; heads: number },
  annualPayMinor: number,
): void {
  if (!bias.ban || !bias.lawId) return;
  lawApplied(api, {
    key: DISCRIMINATION_KEY,
    lawId: bias.lawId,
    targetId: hired.counted ? `hired:${hired.personId}` : hired.personId,
    target: hired.counted ? "group" : "person",
    engine: JOBS_ID,
    what: "hired-over-age-penalty",
    count: hired.heads,
    amountMinor: annualPayMinor,
  });
}
