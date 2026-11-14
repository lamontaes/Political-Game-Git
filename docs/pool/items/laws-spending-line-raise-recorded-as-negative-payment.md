---
id: laws-spending-line-raise-recorded-as-negative-payment
title: "Raising a state's corrections line records a payment of minus the whole raise to one organization"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** After Minnesota's legislature raised the corrections line by $66,704,134.08 (HF 5), law reach holds an applied row for that bill paying an organization exactly minus $66,704,134.08. A screen that sums reach (the bill card, "What this did") shows the law taking that much from someone. Seen: dev mode's bill card for the bill.

**Cause.** Needs cause. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train head 9ed4bf9c4b065f8c4d260fd3431b28e7a35ab936. Each line was raised a tenth by a bill passed through the game's own legislature (`draftBill`, `provisionFor`, dev mode's `decideAt`), signed, and the world run 100 days; the applied rows for the bill's own law id were read from the law-reach store (probes `/mnt/project-files/laws/probes/budget-lines.ts` and `budget-state.ts`). The row's target is an organization in the played world (not the outside account), amount -6670413408 minor; which engine wrote it was not read (the probe filtered by law id only). Start from the `lawApplied` calls in src/core2/budgets-treasury.ts (lines 1043 and 1489) and the budget-line handler in src/core2/law-reach/group-b.ts.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Ask why: name the writer by file and line.

**Done when.** A second session, not the builder, raises a state's corrections line in dev mode at the place above and reads no negative applied row for the bill on its bill card, naming the bill's law record id and every applied row it holds, each with a payee and a positive amount.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/law-reach/group-b.ts
