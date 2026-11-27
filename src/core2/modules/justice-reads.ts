import type { CoreAPI } from "../types";
import { CORRUPTION_MODULE_ID, type CrimeRecord } from "./corruption";
import { CRIME_MODULE_ID, type CrimeMonth } from "./crime";
import {
  JUSTICE_MODULE_ID,
  type CaseRow,
  type CustodyRow,
  type SentenceRow,
} from "./justice";

/**
 * Justice's read doors: a case, a sentence and a custody stay from the courts,
 * a bribe-taking crime from corruption, and a place's crime months. Callers
 * outside justice, crime and corruption ask these and never open
 * `core2-justice-v1`, `core2-crime-v1` or `corruption`. Each door returns the
 * stored rows unchanged and none registers a module.
 */

/** One criminal case by its id. */
export function justiceCaseById(
  api: CoreAPI,
  caseId: string,
): CaseRow | undefined {
  return api
    .moduleState(JUSTICE_MODULE_ID)
    .table("cases")
    .get(caseId) as unknown as CaseRow | undefined;
}

/** One sentence by its id. */
export function sentenceById(
  api: CoreAPI,
  sentenceId: string,
): SentenceRow | undefined {
  return api
    .moduleState(JUSTICE_MODULE_ID)
    .table("sentences")
    .get(sentenceId) as unknown as SentenceRow | undefined;
}

/** One custody stay by its row id (the custody prefix and the sentence id). */
export function custodyById(
  api: CoreAPI,
  custodyId: string,
): CustodyRow | undefined {
  return api
    .moduleState(JUSTICE_MODULE_ID)
    .table("custody")
    .get(custodyId) as unknown as CustodyRow | undefined;
}

/** One official's recorded corruption, by the crime's id. */
export function corruptionCrimeById(
  api: CoreAPI,
  crimeId: string,
): CrimeRecord | undefined {
  return api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("crimes")
    .get(crimeId) as unknown as CrimeRecord | undefined;
}

/** One place's crime month by its row id (`<place>:<month>`). */
export function crimeMonthById(
  api: CoreAPI,
  monthId: string,
): CrimeMonth | undefined {
  return api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .get(monthId) as unknown as CrimeMonth | undefined;
}

/** Every crime month the world kept for one place. */
export function crimeMonthsOfPlace(
  api: CoreAPI,
  placeId: string,
): readonly CrimeMonth[] {
  return api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly CrimeMonth[];
}
