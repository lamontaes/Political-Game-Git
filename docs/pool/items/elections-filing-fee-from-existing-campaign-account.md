---
id: elections-filing-fee-from-existing-campaign-account
title: "A candidate with a campaign account that already holds money pays the filing fee from it"
area: elections
kind: feature
priority: 3
size: S
status: open
standard: 2
after: elections-filing-fee-paid
blocked-on:
model: sonnet
effort: medium
root: none
source: carry of #8722 (PR #9153), account lead ruling Nov 14
lead: wire-elections
---

**What.** The filing fee leaves the candidate's own cash. A candidate who already has a campaign account with money in it (a second race filed in while another campaign is running) should be able to pay the fee from that account, as a campaign pays its other costs. Seen: on the Campaign tab, where the fee shows as a spend from the campaign account.

**Cause.** Found in code: `payGovernmentFee` in `src/core2/budgets-treasury.ts` takes `cash:<person>:residual`; a campaign's account is `organization:campaign:<filing id>` (`src/core2/modules/campaigns.ts`, line 737) and is made from the filing, so none exists at the first filing. The account lead's ruling of Nov 14 on #9153 asked that the fee be payable from a campaign account that already has money.

**Fix.** In `payFilingFee` (`src/core2/modules/elections.ts`), look for the person's campaigns with a standing balance (`campaignFor`, `campaigns.ts`) and pay from that account through `payGovernmentFee` when it covers the fee, else from the person's cash; `checkEligibility`'s `filing-fee` check counts the campaign balance with the cash. The campaigns module's spending record names the fee so the Campaign tab's money rows show it.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No dice. The account is the candidate's own campaign money, never another candidate's. An effect is a read: the Campaign tab reads the spend.

**Done when.** A second session plays a candidate with a funded campaign filing for a second race: the fee comes off the campaign account (journal entry by id), their cash is unchanged, and the Campaign tab shows it; names the place and seed.

**Waits on.** elections-filing-fee-paid (#9153).

**Files.** src/core2/modules/elections.ts, src/core2/modules/campaigns.ts, src/core2/budgets-treasury.ts

**Notes.** Filed by the #9153 carry thread, Nov 14.
