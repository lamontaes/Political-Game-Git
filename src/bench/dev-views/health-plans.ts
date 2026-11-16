/**
 * Dev mode's employer health plans: the town's plans as the coverage review ranks them
 * today (src/core2/modules/coverage.ts employerPlansToday), on the Calendar. Reads only.
 */
import { employerPlansToday } from "../../core2/modules/coverage";
import { coreAPI } from "../../core2/state";
import type { DevView } from "../dev-views";

const view: DevView = {
  name: "health-plans",
  routes: {
    "GET health-plans": ({ mode }) => employerPlansToday(coreAPI(mode.core)),
  },
  client: "dev-health-plans.mjs",
  labels: {
    title: "Employer health plans today",
    date: "Date",
    workers: "Workers with a job",
    planShare: "Share who hold their own plan",
    plansGiven: "Plans that share gives",
    plansHeld: "Plans held",
    premiumMissed: "Left out for a missed premium",
    heldShare: "Held, of workers",
  },
};

export default view;
