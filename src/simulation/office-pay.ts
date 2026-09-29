import {
  GOVERNOR_SALARY_ROWS,
  LEGISLATOR_SALARY_ROWS,
  OFFICE_PAY_META,
  TRIAL_JUDGE_SALARY_ROWS,
} from "./office-pay.generated";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import { workRoleAt } from "./life-queries";
import type { World, WorkRelationship } from "./types";

export { OFFICE_PAY_META };

/**
 * What a state pays for an office, where the game holds it.
 *
 * The Council of State Governments' Book of the States 2023: the governor's
 * annual salary (as of January 1, 2022) and a legislator's annual salary
 * (2023), locked in `data/source/book-of-the-states`. A state that pays its
 * legislators a per diem or a weekly amount instead of one annual salary, or
 * two salaries by chamber, is absent: unknown is unknown, never zero and never
 * a neighbor's figure.
 *
 * A judge is paid the state's general trial court salary (table 5.4): the
 * game's judicial office start does not record a court level, so a judge is
 * read as a trial court judge. GAME ASSUMPTION until it does.
 *
 * A member of Congress is paid the salary Congress has set since January 2009,
 * $174,000 (Congressional Research Service report 97-1011, locked in
 * `data/source/crs-member-pay`). The Speaker and the party leaders are paid
 * more; the game does not yet record who holds those posts, so they read as
 * members.
 *
 * Other statewide officers, mayors, council members and civil servants are
 * not held yet.
 */

/** A member of Congress's annual salary, unchanged since January 2009. */
export const CONGRESS_MEMBER_SALARY_DOLLARS = 174_000;

function parse(rows: string): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const row of rows.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), Number(row.slice(colon + 1)));
  }
  return map;
}

let governors: ReadonlyMap<string, number> | null = null;
let legislators: ReadonlyMap<string, number> | null = null;
let judges: ReadonlyMap<string, number> | null = null;

export type PaidOffice =
  "governor" | "state-legislator" | "trial-court-judge" | "member-of-congress";

export interface OfficePay {
  readonly office: PaidOffice;
  /** Postal code of the state or territory that pays it. */
  readonly state: string;
  readonly annualDollars: number;
}

/** A state's published annual pay for an office, or null when it holds none. */
export function statePayFor(
  office: PaidOffice,
  state: string,
): OfficePay | null {
  if (office === "member-of-congress")
    return {
      office,
      state: "US",
      annualDollars: CONGRESS_MEMBER_SALARY_DOLLARS,
    };
  governors ??= parse(GOVERNOR_SALARY_ROWS);
  legislators ??= parse(LEGISLATOR_SALARY_ROWS);
  judges ??= parse(TRIAL_JUDGE_SALARY_ROWS);
  const table =
    office === "governor"
      ? governors
      : office === "trial-court-judge"
        ? judges
        : legislators;
  const annualDollars = table.get(state);
  return annualDollars === undefined ? null : { office, state, annualDollars };
}

const GOVERNOR_OCCUPATION = /^service:us-([a-z]{2})-governor$/;

/**
 * The published pay for the office a work relationship holds: a governor from
 * the office's own state, a state legislator from the state whose legislature
 * the seat is in. Null for any other office, and for a state the tables do
 * not carry.
 */
export function publishedOfficePay(
  world: World,
  work: WorkRelationship,
): OfficePay | null {
  const role = workRoleAt(world, work.id);
  if (!role) return null;
  if (work.kind === "employment:congress-member")
    return statePayFor("member-of-congress", "US");
  if (
    work.kind === "employment:judicial-office-practice" &&
    role.title === "Judicial office principal"
  ) {
    const place = role.locationJurisdictionId
      ? lifePlaceByJurisdictionId(role.locationJurisdictionId)
      : null;
    const key = place?.stateJurisdictionKey ?? null;
    return key && /^US-[A-Z]{2}$/.test(key)
      ? statePayFor("trial-court-judge", key.slice(3))
      : null;
  }
  if (work.kind === "employment:executive-office") {
    const match = GOVERNOR_OCCUPATION.exec(role.occupationClassification ?? "");
    return match ? statePayFor("governor", match[1]!.toUpperCase()) : null;
  }
  if (work.kind === "employment:legislative-member") {
    const jurisdiction = role.locationJurisdictionId
      ? world.jurisdictions[role.locationJurisdictionId]
      : undefined;
    const key = jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
    return key ? statePayFor("state-legislator", key.slice(3)) : null;
  }
  return null;
}
