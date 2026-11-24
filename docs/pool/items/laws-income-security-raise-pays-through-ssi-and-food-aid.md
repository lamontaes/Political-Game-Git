---
id: laws-income-security-raise-pays-through-ssi-and-food-aid
title: "A federal income security raise pays nobody in town more food aid or SSI"
area: laws
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: laws-social-security-raise-traced-to-the-law
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 15, 2026 (/mnt/project-files/laws/take-effect.md); approach ruled by the account lead Nov 15 00:42Z
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
claimed-at:
branch: claude/project-thread-8fxsy5
---

**What.** When Congress raises the income security line, the whole raise is paid to recipients elsewhere: no household in town gets more food aid or SSI, though both are paid from that line. The bill's page and dev mode's bill card name nobody in town. Seen: the law page's "What this did" and dev mode's bill card for a Congress bill that raises income security.

**Cause.** Found in code: food aid (`runFoodAid`, src/core2/law-reach/group-b-food-aid.ts) pays what the food-assistance maximum works out, and SSI (`paySsi`, src/core2/law-reach/group-b-money.ts) pays what the SSI rate works out; both are counted against the federal `incomeSecurity` line (`registerLinePayments`), and neither reads the line in force. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, the line raised a tenth and 40 days run: the bill's reach holds only `budget-line-paid` to one organization.

**Fix.** Each engine scales what its own law works out by the line in force over its base (`federalLineLevel` in src/core2/budgets-treasury.ts, the rule Social Security reads, with `socialSecurityLevel` now one use of it), and records the change on the bill's own record under `budget-line:incomeSecurity` (`federalBenefitLine`, `recordLineShare` in group-b-money.ts). No second payer; the rest of the line (tax credits, unemployment, housing) still goes to recipients elsewhere. The player sees it on the law page and the bill card.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: counted households are paid and counted by the same rule times their count. The chain is the acceptance. No dice.

**Done when.** A second session, not the builder, starts the bench in a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising income security by a tenth; after the next close, the bill card names households in town whose food aid or SSI rose, counts the counted ones, and shows the extra dollars.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b-food-aid.ts, src/core2/law-reach/income-security-reach.test.ts (new)

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-8fxsy5 since 2026-11-15 23:43 UTC, more than twice its 3-hour time box. Continue on branch claude/project-thread-8fxsy5.
