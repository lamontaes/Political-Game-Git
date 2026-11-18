---
id: laws-social-security-raise-traced-to-the-law
title: "A Social Security raise lifts retirees' checks, but no record names the law that did it"
area: laws
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-8fxsy5
pr:
after: laws-budget-line-reach-credited-to-latest-measure
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 15, 2026 (/mnt/project-files/laws/take-effect.md)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When Congress raises the Social Security line, every retiree's check in the played world rises by the same share from the next payment: full people's awards, the opening's award contracts and the counted retirees' pooled awards. But the law's page "What this did" and dev mode's bill card show only the money paid to retirees elsewhere, with no retiree in town named or counted, because nothing writes the raise on the law's own record. The owner asked that every law's effect be traceable in dev mode (Nov 14). Seen: the law page's "What this did" and dev mode's bill card for a Congress bill that raises Social Security.

**Cause.** Found in code: `applySocialSecurityLevel` in src/core2/budgets-treasury.ts sets each award from the line in force over its base (`socialSecurityLevel`), and `landOn` writes a `law.effect-landed` event and a row on the budgets module's `landed` table for what each person felt and later learned. It never calls `lawApplied`, the writer `lawReach` (src/core2/law-reach/applied.ts) reads for the bill card and the law page. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, the line raised a tenth and 40 days run: `lawReach` for the law holds one side, `budget-line-paid` to one organization, and no person.

**Fix.** In `applySocialSecurityLevel`, record each recipient on the law's own record with `lawApplied` under the key `budget-line:socialSecurity`: on the day the line changes their award (named, no money), and at each treasury close the month's award above its base. Full people are named; each counted pool (`countedRetirementAwards`, a reader added to src/core2/modules/residents.ts) is one group row with its retirees as the count. A line back at its base ends the rows (`lawNoLongerApplies`). The `landed` table stays as the record of what each person felt and learned (`attribute`, `learnedStoryOf`); the law's reach is only on the applied table. The player sees it on the law page and the dev-mode bill card.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One model, two tiers. The chain is the acceptance. No new store, no new engine. No dice.

**Done when.** A second session, not the builder, starts the bench in a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising Social Security by a tenth; after the next close, the bill card names retirees in town whose award rose, counts the counted retirees, and shows the month's extra dollars beside the money paid to retirees elsewhere.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/residents.ts, src/core2/law-reach/social-security-reach.test.ts (new)
