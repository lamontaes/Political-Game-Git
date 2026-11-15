---
id: views-amount-read-from-own-pay-bills-taxes
title: "How a person or a member weighs a tax rate or wage floor ignores what that figure would do to their own pay, bills and taxes"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: governing
model: opus
effort: medium
source: Views thread and Bargaining thread, Nov 15 (amount sections weigh only their direction)
---

**What.** A bill's amount section (a tax rate, the minimum wage) is weighed by its direction only. Income tax from 4.4 to 2.5 weighs the same as 4.4 to 0, for every voter and member alike. A renter on the minimum wage and an owner of a business with twenty minimum-wage workers read a $15 floor through the same lean-and-life stance. Neither reads the dollars it would move for them. Seen: in the code, at every amount section.

**Cause.** Found in code:

- `provisionStance` in src/core2/modules/legislature.ts (near line 1730) returns position ±1 times `raiseIs` for any `law-amount` section, whatever its size. Only budget lines are sized (`budgetFullStanceShare`).
- A person's view of the question is `viewOn` in src/core2/modules/views.ts: an opening stance plus `stakeShift` (src/core2/life-stake-rule.ts). `stakeShift` moves a stance by a fixed weight per circumstance (renting, income fifth, no work, no private plan, a young child, a public job; data/views/stakes.json). It reads the question, never the bill's figure.
- The engines that compute what a figure does already exist, but no view reads them. Pay under a wage floor is `wageStepCosts` and `employerCosts` (legislature.ts), read today only by the employers' lobby (interest-groups.ts). Income tax on a pay is `withholdingFor` (src/core2/tax-withholding.ts), which takes the income-tax law as an argument. What a law in force did to whom is the law-reach records (src/core2/law-reach/).

**Fix.** One reader, `amountStake(api, personId, provision, level)`, in src/core2/life-stakes.ts beside the life facts. It returns the change in the person's own yearly money if the section became law, by the engine that pays it, computing nothing twice:

1. Minimum wage: the person's own open commitment, by `wageStepCosts`. For an owner, the employer's row from `employerCosts`.
2. Income tax and other withheld taxes: `withholdingFor` on the person's own pay. It runs twice, with the law in force and with the bill's rate put in its place, and the result is the difference.
3. A series with no paying engine yet stays on the direction-and-size scale that the bargaining thread is building, and says so in a comment.

Then, in `agreementWith`'s read of a bill section, the self-interest part of the stance is the sign of that money change times its size against the person's own yearly income, over an ESTIMATED full-stance share with a spread (data/views/stakes.json). It is weighed by the person's `care`, as `stakeShift` is. It replaces `stakeShift`'s fixed weight for that question when the section has a computed stake. A member reads their own stake the same way. A counted group reads the same rule times its count, through the counted pay rows that `groupWithholding` (src/core2/counted-money.ts) already reads.

A member's district stake (the share of their voters the figure helps or hurts) is the legislature's existing constituent read, not this item.

**Time box.** 6 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a stance follows the person's own money, care and views. One model, two tiers: a counted group reads the same rule times its count. An effect is a read: the voting and legislature engines read it at the vote. Replace, never layer: where a section has a computed stake, the bargaining thread's size scale and `stakeShift`'s fixed weight are not added on top. No new stopgaps.

**Done when.** A second session, on main, in a drawn place with a state income-tax bill and a minimum-wage bill (place and seed named), reads two people's agreement with each bill. The person whose own money it moves more holds the stronger stance, by record ids. A cut from 4.4 to 0 moves a taxpayer's stance more than 4.4 to 2.5. A pinned test shows both, and it fails on the old code.

**Waits on.** The bargaining thread's `amountSize` in legislature.ts (it lands first; this reader replaces it for the self-interest part where a stake is computed, and it stays for series no engine pays).

**Files.** src/core2/life-stakes.ts, src/core2/modules/views.ts, src/core2/modules/legislature.ts, src/core2/tax-withholding.ts, src/core2/data/views/stakes.json, src/core2/views-amount-stake.test.ts (new)

**Notes.**
Nov 15 (views thread): plan approved by the lead with three conditions. First, the bargaining thread lands `amountSize` first and this PR merges it, so one place decides size. Second, the test shows that a person whose money does not move still holds a view from their other reasons. Third, the PR brings year-1 timing at three places and says what is cached per person per bill.
