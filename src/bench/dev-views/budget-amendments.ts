import { coreAPI } from "../../core2/state";
import {
  amendmentRoom,
  governmentOfJurisdiction,
} from "../../core2/modules/budgets";
import {
  billJurisdiction,
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../../core2/modules/legislature";
import { townGovernment } from "../../core2/output-number-readers";
import type { DevView } from "../dev-views";

/**
 * Dev mode's Budget amendments: for the player's town government (or the one named in `government`),
 * the arithmetic that lets its body amend the adopted budget this year (what the treasury has
 * taken in a month since the year began against the months before it, the revenue planned for the
 * months closed, what is already amended in, and the room left), and each amendment bill the body
 * has filed with the cause its provision carries. It reads the one `amendmentRoom` the filing
 * reads, and the bills' own provisions, so it shows what the body acted on (owner, Nov 16:
 * everything traced by code must be traceable in dev mode).
 */
const view: DevView = {
  name: "budget-amendments",
  client: "budget-amendments.mjs",
  labels: {
    title: "Budget amendments",
    none: "No government with a closed month of its adopted year",
    now: "Monthly take this year",
    pace: "Monthly take in the months before",
    planned: "Revenue planned for the months closed",
    amended: "Already amended in this year",
    room: "Room to amend",
    cause: "Cause",
    months: "Months closed",
    bills: "Amendment bills",
    noBills: "No amendment bill filed yet",
    causes: {
      "receipts-over-plan": "Receipts over plan: raise lines",
      "receipts-under-plan": "Receipts under plan: cut lines",
    },
  },
  routes: {
    "GET budget-amendments": ({ mode, q }) => {
      const core = mode.core;
      const api = coreAPI(core);
      const home = core.playerId
        ? core.people.get(core.playerId)?.placeId
        : undefined;
      const named = q("government");
      const gov = named
        ? governmentOfJurisdiction(api, named)
        : home
          ? townGovernment(api, home)
          : undefined;
      if (!gov) return { government: null };
      const room = amendmentRoom(api, gov.id);
      const bills = (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as BillRow[]
      )
        .filter(
          (bill) =>
            governmentOfJurisdiction(api, billJurisdiction(api, bill))?.id ===
            gov.id,
        )
        .flatMap((bill) =>
          bill.provisions
            .filter((p) => p.kind === "budget-line" && p.cause)
            .map((p) => ({
              id: bill.id,
              number: bill.number,
              introduced: bill.introduced,
              status: bill.status,
              line: p.line ?? "",
              deltaMinor: p.value,
              cause: p.cause ?? "",
            })),
        );
      return { government: gov.id, room, bills };
    },
  },
};

export default view;
