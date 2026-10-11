/** Work defaults are data only, independent of scheduler and cash initialization. */
import workJson from "./data/work.json" with { type: "json" };
import type { WorkData } from "./types";

const payrollGroupAttributionRule = workJson.payrollGroupAttributionRule;
if (payrollGroupAttributionRule !== "arrears-then-newly-due-commitment-id")
  throw new Error(
    "Work defaults lack their declared payroll attribution rule.",
  );

export const DEFAULT_WORK_DATA: WorkData = {
  ...workJson,
  payrollGroupAttributionRule,
  patterns: workJson.patterns.map((row) => ({
    ...row,
    source: { ...row.source, tag: "ESTIMATED" as const },
  })),
};
