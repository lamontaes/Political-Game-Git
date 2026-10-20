/**
 * Law reach, group A (see index.ts): labor, business, housing, justice,
 * rights, technology and government policies. Every policy in
 * `data/laws/reach-group-a.json` puts its effect on the records of the named
 * people, organizations, officeholders and counted groups it reaches; where
 * a mechanic runs (minimum wages, the leave premium, budget lines' staff and
 * money, election costs) it runs through the engine that owns the thing.
 */
import { registerPolicyHandler, type PolicyHandler } from "./host";
import { applyRecords, POLICIES } from "./group-a-records";
import {
  federalMinimumWage,
  localWageAuthority,
  raiseMinimumWage,
} from "./group-a-wages";
import { paidLeave, parksFunding } from "./group-a-money";
import { staffing } from "./group-a-staffing";
import { votingLaw } from "./group-a-voting";
import { rightToWork } from "./group-a-union";
import { publicBargaining } from "./group-a-bargaining";

const records: PolicyHandler = (api, change) =>
  applyRecords(api, change.key, change.lawId, change.inForce);

/** Each mechanic's handler, by the mechanic name a policy's data row gives. */
const MECHANICS: Readonly<Record<string, readonly PolicyHandler[]>> = {
  none: [records],
  // Credit reads the law at quotation; no blanket personal knowledge write.
  "consumer-loan-quote": [],
  // Housing reads the law when renewing full leases and counted rent flows.
  // Eligibility alone must not tell every adult that their rent changed.
  "rent-renewal": [],
  "housing-construction": [],
  "eviction-counsel": [],
  // The legislature's authority check reads home rule when the council
  // proposes a question the state has not settled (policy-authority.ts).
  "policy-authority": [],
  "federal-minimum-wage": [records, federalMinimumWage],
  "raise-minimum-wage": [records, raiseMinimumWage],
  "local-wage-authority": [records, localWageAuthority],
  "paid-leave-premium": [paidLeave],
  "parks-funding": [parksFunding],
  // The housing engine pays the assistance monthly (housing-assistance.ts).
  "housing-assistance": [],
  staffing: [staffing],
  "public-bargaining": [records, publicBargaining],
  "right-to-work": [records, rightToWork],
  voting: [votingLaw],
  "office-limits": [votingLaw],
};

export function registerGroupA(): void {
  for (const [key, policy] of Object.entries(POLICIES)) {
    // The minimum wage as an amount runs in the laws engine itself.
    if (!policy.reaches.length && policy.mechanic === "none") continue;
    const handlers = MECHANICS[policy.mechanic];
    if (!handlers) throw new Error(`No law-reach mechanic: ${policy.mechanic}`);
    for (const handler of handlers) registerPolicyHandler(key, handler);
  }
}
