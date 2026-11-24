/**
 * Dev mode's Industries check (dev-law-industries.ts) as a registered view:
 * POST twin-industries compares this world's industries with the same world
 * given a do-nothing bill for each bill here; with `series` and `level` it
 * shows what that law the town opened with is doing. The page part draws on
 * the bill card after the money check.
 */
import type { DevView } from "../dev-views";
import { DevMode } from "../dev-mode";
import {
  industriesAgainstNullBill,
  industriesWithoutOpeningLaw,
  type TwinWorld,
} from "../dev-law-industries";
import type { CoreState } from "../../core2/types";

const twinDev = (core: CoreState, built: TwinWorld) =>
  new DevMode(core, built.director, undefined, built.placeId);

const view: DevView = {
  name: "law-industries",
  routes: {
    "POST twin-industries": ({ mode, input }) =>
      input.series
        ? industriesWithoutOpeningLaw(mode.core, mode.marks(), twinDev, {
            series: String(input.series),
            level: String(input.level),
          })
        : industriesAgainstNullBill(mode.core, mode.marks(), twinDev),
  },
  client: "dev-law-industries.mjs",
  labels: {
    title:
      "Industries, against the same world given a bill that changes nothing",
    run: "Compare industries",
    runOpening: "What this opening law is doing",
    running:
      "Building the twin, passing its do-nothing bills and running it to today",
    span: "{from} to {to}",
    done: "Done here and not in the twin",
    nothingDone: "Nothing was done here that the twin lacks",
    baseline: "Bills and laws the twin passed that change nothing: {n}",
    baselineOpening:
      "The twin set aside this law from the day after the opening",
    nothing: "No industry differs",
    staff: "Staff",
    open: "Open",
    sales: "Sales",
    pay: "Pay",
    prices: "Prices",
    cash: "Cash",
    businesses: "Businesses that moved most ({n} differ)",
    onlyHere: "Only in this world",
    onlyTwin: "Only in the twin",
    closedHere: "Closed here, open in the twin",
    closedTwin: "Open here, closed in the twin",
  },
};

export default view;
