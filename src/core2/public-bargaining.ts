/**
 * Public-sector bargaining as pay: where a state's law lets public workers
 * bargain through a union, bargained pay runs above what unrepresented public
 * workers earn (the public-sector union wage premium). Each month of the
 * phase-in this raises every public job in town toward its pay before the
 * law times the premium share reached so far, through the core's own pay seam
 * (`rerateJob`), and records whom it raised on the law that lets them
 * bargain: a full worker one by one, the counted workers of an employer
 * together with the people they stand for. It reads the law in force each
 * time it pays, so a repeal ends the raises (pay already bargained stays: a
 * repeal ends the right, not a contract already paid).
 * stopgapId: SG-GOV-REACH-A-bargaining
 */
import { PUBLIC_EMPLOYER_CLASSES } from "./public-pay-floor";
import { jobsAt } from "./law-reach/group-b-money";
import { payReach } from "./law-reach/pay-reach";
import { reachParameter, REACH_A_MODULE_ID } from "./law-reach/group-a-records";
import { lawInForce } from "./modules/laws";
import type { CoreAPI, Source } from "./types";

export const BARGAINING_KEY =
  "us-policy-positions:labor-workforce.public-sector-collective-bargaining";

/** Whether a level of the town's chain has the bargaining law in force today. */
export function bargainingStands(api: CoreAPI): boolean {
  return lawInForce(api, BARGAINING_KEY).levels.some(
    (level) => level.row?.value === 1,
  );
}

/**
 * Raise each public job toward its bargained pay for `share` of the premium
 * (0 to 1, as the phase-in stands); returns each job's pay before the law.
 */
export function holdBargainedPay(
  api: CoreAPI,
  input: {
    readonly lawId: string;
    readonly share: number;
    readonly baseMinor: Readonly<Record<string, number>>;
  },
): Record<string, number> {
  const base: Record<string, number> = { ...input.baseMinor };
  if (!bargainingStands(api)) return base;
  const premium = reachParameter("publicBargainingPayPremium");
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: `${input.lawId}; public-sector union wage premium`,
    estimatedFrom:
      "Public workers who bargain through a union are paid about five percent more than those who do not.",
  };
  const reach = payReach(api, {
    key: BARGAINING_KEY,
    lawId: input.lawId,
    engine: REACH_A_MODULE_ID,
    what: "bargained-pay-raised",
  });
  for (const job of jobsAt(api, PUBLIC_EMPLOYER_CLASSES)) {
    const hourly = job.hourlyMinor ?? 0;
    if (hourly <= 0) continue;
    base[job.id] ??= hourly;
    const target = Math.ceil(base[job.id]! * (1 + premium * input.share));
    // Pay already above the bargained level (a floor, a raise) stays.
    if (target > hourly) {
      api.rerateJob(job.id, target, source);
      reach.add(job, (job.wageDailyMinor * (target - hourly)) / hourly);
    }
  }
  reach.flush();
  return base;
}
