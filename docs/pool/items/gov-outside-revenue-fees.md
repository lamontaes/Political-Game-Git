---
id: gov-outside-revenue-fees
title: "Charges, fees and miscellaneous revenue are paid by the people and businesses that use the service"
area: gov
kind: stopgap
priority: 1
size: M
status: dropped
claimed-by:
pr: #8399
blocked-on:
standard: 2
model: haiku
effort: low
lead: governing
root: rc1-world-outside-town
source: added with npm run pool -- add
claimed-at:
after:
checked: fable 2026-11-10
branch: claude/pool-gov-outside-revenue-fees
---

**What.** Charges, fees and miscellaneous general revenue (tuition at public colleges, hospital and park charges, transit fares, permits, utility charges) reach each treasury today as an even twelfth of Census revenue from the outside account, with nobody paying them. Replace that share so each charge is paid by the households and businesses that use the service, on the day they use it, at the price the law and the budget set, into the treasury of the government that runs it. The player would notice that raising a park or transit fee costs the people who use the park or ride, and that a fee nobody uses brings in nothing.

**Cause.** Measured: `CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/closures.mjs --seed f82d361b5e5231df` on main b6ce398c52 (Jane Lew, West Virginia, a fresh draw). Over 365 days, check 6 matches every charges dollar: `goods-and-services: accounts.transfer treasury-charges`, $1,986,621,442 owed in 36 entries (12 months for each of 3 governments), paid by `service-users` (`src/core2/data/budgets/revenue-payers.json`, `chargesAndFees`). `outsideRevenueMonthly` in `src/core2/budgets-treasury.ts` (line 889) skips every line with named payers, so no fee dollar rides the `outside-revenue` plug. The town's households pay their part out of their living cost, and sewer and trash by dwelling and firm (`src/core2/budgets-service-charges.ts`; gov-service-charges-by-use is done). The carry-permit fee is levied on named payers into the state treasury (`src/core2/public-safety.ts`, near line 1598), not from the outside. The only public-safety dollars unmatched in check 6 are not fees: `accounts.transfer public-safety`, $16,499 in 73 entries, is the county and state paying court, jail and prison costs to the outside account (`treasuryPays`, `src/core2/public-safety.ts` line 476), which no row in `src/core2/data/outside-flows.json` names. What the item still asks for is a council bill that raises a park or transit fee. No such policy question exists (the only fare law is fare-free transit, `SG-GOV-REACH-B-transit-fare-price` in `src/core2/modules/place-prices.ts`). Building one is a new mechanic that the golden path, _The Political Process_ and the owner have not asked for.

**Fix.** Nothing to build. Proposed: the CTO drops the item (`npm run pool -- status gov-outside-revenue-fees dropped --by=cto`). The fees are paid by named payers, and the depth left over (per-service use, a fee-raising bill) is depth no player sees, under the owner's Nov 10 ruling. If the CTO keeps it, the one small piece is a row in `src/core2/data/outside-flows.json` for `idPrefix` `public-safety`, kind `accounts.transfer`, `matchedBy` `goods-and-services`, naming the court, jail and prison costs. That is the only fee-adjacent line check 6 still calls unmatched.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the outside-flows row.

**Rules.** Wire to the world: every fee moves a payer's money to a treasury on the journal, proven in a generated world, and covers every service line in the module; An effect is a read, not a record: the price in force is read from the law and budget at the moment the service is used or billed; One model, two tiers: counted households pay by the same rule as full people times their count; This is a game, not a spreadsheet: no new form, receipt or payment step is added for the player; the fee rides on the existing purchase, tuition or fare writers; No dice: use decides who pays, never a roll; One rule, all 56 places: no state or city named; fee schedules live in place data; Estimate, never UNKNOWN: an unsourced fee level starts from the real average marked ESTIMATED with source and spread; Replace, never layer: the fee share of the monthly plug is deleted in the same change; Speed: fees post on the day of use through existing writers, with no new world scan.

**Done when.** The CTO drops the item. If it is kept for the row, a second session runs `scripts/core2-year/closures.mjs` on a drawn place and seed (both named) and sees check 6 list no `accounts.transfer public-safety` under unmatched, and `treasury-charges` still matched.

**Waits on.** Nothing (gov-service-charges-by-use is done).

**Files.** src/core2/data/outside-flows.json, src/core2/budgets-treasury.ts, src/core2/budgets-service-charges.ts, src/core2/public-safety.ts, scripts/core2-year/closures.mjs

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`). Claim released Oct 23: branch idle since Oct 16.

Oct 20: gov-outside-revenue-fees-wiring is done, so the item no longer waits on it.

Sent back 2026-10-24 UTC from PR #5926 (branch claude/outside-revenue-fees): council fee-change acceptance explicitly unmet and aggregate budget twelfths do not prove per-use payer chain; fee-family permit closure follow-up needs named tracking or valid bounded scope; finish on that branch, merge main into it first.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:51 UTC) on branch claude/pool-gov-outside-revenue-fees.

Released (2026-11-11): Cause no longer matches main: chargesAndFees already has named payers (treasury-charges) and is skipped by the monthly plug; the permit fee is levied on named payers; see PR #8399. Continue on branch claude/pool-gov-outside-revenue-fees and pull request #8399.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:52 UTC) on branch claude/pool-gov-outside-revenue-fees.

Released (2026-11-11): Cause no longer matches main (see PR #8399); set to Needs cause. Continue on branch claude/pool-gov-outside-revenue-fees and pull request #8399.

Nov 11 (CTO): the Fix above is set to the standard text because the Cause now reads "Needs cause." The fix written before the cause stopped reproducing, kept for whoever finds the new cause: Charge each fee to the households and businesses that use the service, on the day of use at the price the law and budget set, into the issuing government's treasury. Include the public-safety permit fee (taken from the dropped gov-permit-fee-to-treasury). Delete the fee share of the monthly plug.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Fee payment by use is already built in the done items gov-outside-revenue-fees-wiring, -named-payers and -data; what is left is removing an outside share nobody reads.

Nov 11 (cause finder for Fable B): measured one played year on main b6ce398c52 in Jane Lew, West Virginia (seed f82d361b5e5231df). Every charges and fees dollar is paid by named payers and matched in check 6. No fee dollar is left in the monthly plug. Check 6 still fails, but on the `outside-revenue` plug for the other revenue lines (gov-outside-revenue-retire-plug and gov-outside-revenue-real-payers) and on unmatched household living and medical spending, not on fees. I propose dropping this item. The court and jail costs paid to the outside are the one public-safety line left unmatched; that row is in the Fix in case the CTO keeps the item.
