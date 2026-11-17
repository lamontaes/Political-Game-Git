---
id: laws-spending-lines-grants-reach-no-government
title: "A raised spending line's grant share reaches no state, town or school: it goes to the outside account"
area: laws
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr:
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The grant share of a raised spending line (federal health, transportation, education, community development, international affairs and agriculture; a state's other programs and local aid) is paid to the outside account under "Grant recipients elsewhere". No state treasury, town treasury or school system receives it, so a federal raise for transportation does not reach the state's or the town's budget at all. Seen: the town's and the state's Budgets screens (aid received) and the bill card.

**Cause.** Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train head 9ed4bf9c4b065f8c4d260fd3431b28e7a35ab936. Each line was raised a tenth by a bill passed through the game's own legislature (`draftBill`, `provisionFor`, dev mode's `decideAt`), signed, and the world run 100 days; the applied rows for the bill's own law id were read from the law-reach store (probes `/mnt/project-files/laws/probes/budget-lines.ts` and `budget-state.ts`). Federal transportation H.R. 6: one applied row, $3.47 billion, target the outside account. Found in code: src/core2/budgets-treasury.ts, the monthly close, pays the `grantees` group (src/core2/data/budgets/spending-payees.json) to `accounts.main(outside)`; the same close already moves aid between governments (`treasury-aid` transfers and `aidReceived`, the `aid` list for `localAid`), but no federal or state line feeds it.

**Fix.** Pay a line's grant share through the existing treasury-aid transfer to the governments below it, by each one's stake in the line (`stateStake` in src/core2/modules/macro.ts already shares federal lines among states): the town's state and local treasuries receive their share as aid received, the rest reaches other states' ledgers in the country tier. The receiving government spends it through its own lines as it spends any aid.

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** One model, two tiers. Money moves only through the existing accounts and treasuries. The chain is the acceptance.

**Done when.** A second session, not the builder, in a drawn place passes a Congress bill raising Federal transportation by a tenth in dev mode; at the next monthly close the state's and the town's Budgets show aid received from it, the bill card names the governments reached with dollars, and twin money shows the U.S. treasury's loss arriving in those treasuries.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/macro.ts, src/core2/data/budgets/spending-payees.json

**Notes.** Nov 17 (Laws and effects lane, branch claude/laws-federal-transportation-aid): built for the five federal lines the close already charges aid to (health, income security, transportation, education, community development). Each line's part of a lower treasury's federal aid, split by the lines' base amounts, moves with the line in force over its base; a raise is paid under the bill's own payment id and recorded as reaching the government, a cut comes off the month's aid (`grantLineChanges` in src/core2/budgets-treasury.ts). Proven in the game for transportation; agriculture's and international affairs' grant shares are not federal aid to a state and stay with their own items.
