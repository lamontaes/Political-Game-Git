/**
 * What a paper found when it exposed an official (press.ts `press.exposed`),
 * read from the act's own record so the reporter who calls says what the
 * story says, not only that there is one (owner, Nov 15, on the scandal call:
 * "I've got a story about the water rates, and your name is in it... that's
 * very ambiguous"; Words lead's lines in reply-sets/oath-bribe-scandal.md C).
 *
 * - a bribe taken (corruption.ts crime record): who paid, and what the money
 *   was for, the bill or the contract award, read the same way the offer
 *   scene reads it (`wantedFacts`);
 * - a conflict on an award (contracts.ts award row, its conflict): the award
 *   by the work it pays for, the firm, and whose firm it is, the official's
 *   own or a relative's.
 */
import {
  CORRUPTION_MODULE_ID,
  crimeRecord,
  wantedFacts,
} from "../core2/modules/corruption";
import { OWNER_RELATION } from "../core2/modules/contracts";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

/** The finding behind an exposure, with the records that hold it. */
export interface ExposedFinding {
  readonly found: "bribe" | "conflict";
  /** The crime record or the award the story is on. */
  readonly recordId: string;
  /** The bill a bribe bought a vote on. */
  readonly billId?: string;
  /** The award, by its id and its spending line. */
  readonly contractId?: string;
  readonly contractLine?: string;
  /** Who paid the bribe. */
  readonly briberId?: string;
  /** The firm an interested member chose, its owner and the owner's relation to the member. */
  readonly firmId?: string;
  readonly ownerId?: string;
  readonly ownFirm?: boolean;
}

/** The finding an exposure's facts name; null when its record is gone. */
export function exposedFinding(
  core: Readonly<CoreState>,
  said: Readonly<Record<string, string>>,
): ExposedFinding | null {
  const key = (prefix: string) =>
    Object.keys(said).find((row) => row.startsWith(prefix));
  const crimeKey = key("crime:");
  if (crimeKey && said[crimeKey] === "bribe-taken") {
    if (!core.modules.has(CORRUPTION_MODULE_ID)) return null;
    const crimeId = crimeKey.slice("crime:".length);
    const crime = crimeRecord(coreAPI(core as CoreState), crimeId);
    if (!crime) return null;
    const wanted = wantedFacts(crime.subjectId);
    return {
      found: "bribe",
      recordId: crime.id,
      briberId: crime.offererId,
      ...(wanted.billId ? { billId: wanted.billId } : {}),
      ...(wanted.contractId ? { contractId: wanted.contractId } : {}),
      ...(wanted.contractLine ? { contractLine: wanted.contractLine } : {}),
    };
  }
  const awardKey = key("award:");
  if (awardKey && said[awardKey] === "conflict-of-interest") {
    const awardId = awardKey.slice("award:".length);
    const wanted = wantedFacts(awardId);
    return {
      found: "conflict",
      recordId: awardId,
      contractId: awardId,
      ...(wanted.contractLine ? { contractLine: wanted.contractLine } : {}),
      ...(said.organizationId ? { firmId: said.organizationId } : {}),
      ...(said.ownerId ? { ownerId: said.ownerId } : {}),
      ownFirm: said.relation === OWNER_RELATION,
    };
  }
  return null;
}
