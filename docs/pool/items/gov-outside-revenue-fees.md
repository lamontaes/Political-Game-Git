---
id: gov-outside-revenue-fees
title: "Charges, fees and miscellaneous revenue are paid by the people and businesses that use the service"
area: gov
kind: stopgap
priority: 1
size: M
status: open
claimed-by:
pr: #8399
blocked-on:
standard: 2
model: opus
effort: high
lead: governing
root: rc1-world-outside-town
source: added with npm run pool -- add
claimed-at:
after:
checked: fable 2026-11-10
branch: claude/pool-gov-outside-revenue-fees
---

**What.** Charges, fees and miscellaneous general revenue (tuition at public colleges, hospital and park charges, transit fares, permits, utility charges) reach each treasury today as an even twelfth of Census revenue from the outside account, with nobody paying them. Replace that share so each charge is paid by the households and businesses that use the service, on the day they use it, at the price the law and the budget set, into the treasury of the government that runs it. The player would notice that raising a park or transit fee costs the people who use the park or ride, and that a fee nobody uses brings in nothing.

**Cause.** Found in code: src/core2/modules/budgets.ts function closeMonth (line 1006, marker at line 1010) credits each treasury an even twelfth of Census revenue from the outside account, and src/core2/data/outside-flows.json marks those rows plug; the public-safety permit-fee transfers (src/core2/public-safety.ts, near line 1648) match no row in check 6 of scripts/core2-year/closures.mjs.

**Fix.** Charge each fee to the households and businesses that use the service, on the day of use at the price the law and budget set, into the issuing government's treasury. Include the public-safety permit fee (taken from the dropped gov-permit-fee-to-treasury). Delete the fee share of the monthly plug.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every fee moves a payer's money to a treasury on the journal, proven in a generated world, and covers every service line in the module; An effect is a read, not a record: the price in force is read from the law and budget at the moment the service is used or billed; One model, two tiers: counted households pay by the same rule as full people times their count; This is a game, not a spreadsheet: no new form, receipt or payment step is added for the player; the fee rides on the existing purchase, tuition or fare writers; No dice: use decides who pays, never a roll; One rule, all 56 places: no state or city named; fee schedules live in place data; Estimate, never UNKNOWN: an unsourced fee level starts from the real average marked ESTIMATED with source and spread; Replace, never layer: the fee share of the monthly plug is deleted in the same change; Speed: fees post on the day of use through existing writers, with no new world scan.

**Done when.** A second session, in a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), finds `scripts/core2-year/closures.mjs` check 6 showing no unmatched plug dollars for the fees family, the treasury's charges revenue equal to the sum of named payers' payments on the journal, and a named household's fare or fee traced from its cash to the treasury. The test is added beside `src/core2/budgets.test.ts`. In the running game, raising a transit or park fee in a council bill later shows the budget's charges line move and who paid; today nothing on Politics, Budgets reads it.

**Waits on.** Nothing (gov-service-charges-by-use is done).

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/purchase-tax.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps/gov.json, src/core2/public-safety.ts

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`). Claim released Oct 23: branch idle since Oct 16.

Oct 20: gov-outside-revenue-fees-wiring is done, so the item no longer waits on it.

Sent back 2026-10-24 UTC from PR #5926 (branch claude/outside-revenue-fees): council fee-change acceptance explicitly unmet and aggregate budget twelfths do not prove per-use payer chain; fee-family permit closure follow-up needs named tracking or valid bounded scope; finish on that branch, merge main into it first.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:51 UTC) on branch claude/pool-gov-outside-revenue-fees.

Released (2026-11-11): Cause no longer matches main: chargesAndFees already has named payers (treasury-charges) and is skipped by the monthly plug; the permit fee is levied on named payers; see PR #8399. Continue on branch claude/pool-gov-outside-revenue-fees and pull request #8399.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:52 UTC) on branch claude/pool-gov-outside-revenue-fees.

Released (2026-11-11): Cause no longer matches main (see PR #8399); set to Needs cause. Continue on branch claude/pool-gov-outside-revenue-fees and pull request #8399.
