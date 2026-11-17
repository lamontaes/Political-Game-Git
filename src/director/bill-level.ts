import { billLevelWord } from "../english/bill-names";
import type { CoreAPI } from "../core2/types";
import {
  billJurisdiction,
  billReach,
  type BillRow,
} from "../core2/modules/legislature";
import { governmentOfJurisdiction } from "../core2/modules/budgets";

/**
 * The word a bill's body goes by in its title ("federal", "state", "county",
 * or a town's own class word: "village", "borough", "city"), from the body's
 * level and its government's own record.
 */
export function billLevelOf(api: CoreAPI, bill: BillRow): string {
  const { level } = billReach(api, bill);
  const government =
    level === "city"
      ? governmentOfJurisdiction(api, billJurisdiction(api, bill))
      : undefined;
  return billLevelWord(level, government?.name);
}
