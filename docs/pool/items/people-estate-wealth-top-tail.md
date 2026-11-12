---
id: people-estate-wealth-top-tail
title: "No resident's estate is large enough to owe an estate tax, so the estate tax never collects"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #8698
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
lead: laws
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-people-estate-wealth-top-tail
---

**What.** The estate tax settles nothing in any place it ran. Every full person holds at most about $504,000, below every state estate tax exemption and the federal one. The only people above an exemption are state cabinet members ($11M to $60M each), who have no kin, so their estates escheat and are assessed at 0. The Survey of Consumer Finances puts about one household in ten at a net worth above $1 million (recalled, not checked), and a few states' estate taxes start near there, so some deaths in a larger town should owe it. Seen: the estate-tax line in the budget, which collects nothing today because no resident is rich enough.

**Cause.** Found in code: (opus-5234, Nov 11, PR #8698) the measured cause holds (opening cash is the SCF 2022 transaction-account median by income, src/core2/starting-cash.ts; an estate is the cash balance plus a sold home's surplus, src/core2/estates.ts `settleEstate`), but the old Fix had nowhere to put the wealth: a person's money is one total, `liquidMinor` (named accounts only set part aside, src/core2/accounts.ts `balanceOf`), read directly as cash in 175 places across about 40 files (credit, candidacy, campaigns, housing, corruption and more), so SCF net worth there would make retirement and investment wealth spendable everywhere. Bank deposits (`depositsHeld`, src/core2/accounts.ts line 196) are no home for it either: housing and business foundings draw them (`withdrawSavings`, `founderSavings` in src/core2/modules/business.ts), and they sit on the town bank's books. `settleEstate` in src/core2/estates.ts (line 349) takes as the estate's base only the dead person's account balance after debts, plus a home still to sell, so wealth anywhere else never reaches the estate tax. SCF 2022 net worth by age (Fed, scf23.pdf Table 2, thousands of 2022 dollars, median / mean): under 35 39.0 / 183.5; 35-44 135.6 / 549.6; 45-54 247.2 / 975.8; 55-64 364.5 / 1,566.9; 65-74 409.9 / 1,794.6; 75+ 335.6 / 1,624.1.

**Fix.** A holdings record that only the estate reads. (1) Add `holdingsMinor` to the person record (src/core2/types.ts `PersonState`) and a matching column on counted members (src/core2/counted-groups.ts, carried to the person on fill-in as `liquid` is). It stands for retirement accounts, stocks and other wealth that is not cash: no spender reads it, so the 175 cash readers are untouched. (2) At the opening, set each adult's holdings from SCF 2022 net worth by age: the median and mean above give a lognormal per age band. A person's place in it follows the same income rank the opening cash uses (src/core2/starting-cash.ts), less the cash, deposits and home equity they already hold, floored at zero. Add the six bands as SOURCED parameters in src/core2/data/parameters.json, citing scf23.pdf Table 2. Counted members take the same rule; their weight multiplies them as for cash. (3) In `settleEstate`, before the base is read, move the dead person's holdings into their account from the outside account that stands for their custodian (the place's outside market, `townOutsideOf`), as one journal transfer with its own reason key, and zero the holdings. The estate tax, the trust and the heirs then work as now. (4) Register a stopgap for holdings that never grow or pay income during life. Report in the PR body the share of opening households above $1 million against the survey's.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a resident's wealth starts from the place's real distribution by age and household, with its spread and source. One model, two tiers: counted households carry the same distribution times their count. No dice: who dies follows the existing health records, not a roll.

**Done when.** A second session runs a played world (buildBenchWorld, a drawn place from all 56, seed named) and sees a death leave an estate above its state's or the federal exemption, with the estate tax's own payment named by journal id; full persons' and counted households' opening wealth follows the Survey of Consumer Finances by age including its top tail, and the share above $1 million is reported beside the survey's.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts, src/core2/types.ts, src/core2/counted-groups.ts, src/core2/starting-cash.ts, src/core2/accounts.ts, src/core2/modules/residents.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/lives.json

**Notes.** Filed by the laws lead, Oct 25, from the taxes helper's report. `core-opening-resident-cash` (done) gave residents opening cash; this is the top of the distribution.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:21 UTC) on branch claude/pool-people-estate-wealth-top-tail.

Released (2026-11-11): The Fix has no place in the code to hold non-cash wealth; findings and SCF research on PR 8698. Continue on branch claude/pool-people-estate-wealth-top-tail and pull request #8698.

Nov 11 (cause finder for Fable B): the cause was already measured. What was missing was a place for the wealth. Bank deposits are spendable and on the bank's books, and `settleEstate` reads only the account balance, so the Fix adds a holdings field that only the estate reads, moved into the estate at death.
