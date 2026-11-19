---
id: laws-veterans-line-pays-the-towns-veterans
title: "The federal veterans line pays no veteran in town, and a raise to it reaches nobody"
area: laws
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: laws-income-security-raise-pays-through-ssi-and-food-aid
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 15, 2026 (/mnt/project-files/laws/take-effect.md); approach ruled by the account lead Nov 15 00:42Z
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
claimed-at:
branch: claude/project-thread-8fxsy5
---

**What.** No veteran in town is paid a benefit, and when Congress raises the veterans line the whole raise goes to the outside account. The past's service pass already says which full residents served, so the town has veterans with no check. The bill's page and dev mode's bill card name nobody in town. Seen: the law page's "What this did" and dev mode's bill card for a Congress bill that raises veterans.

**Cause.** Found in code: no .ts file under src/core2 outside tests read the `veterans` line; the treasury's monthly close (src/core2/budgets-treasury.ts) paid the line's beneficiary share to the outside account, while `serviceOf` (src/core2/past-work.ts) marks who served. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train 9ed4bf9c: the line raised a tenth and 100 days run, every dollar to the outside account.

**Fix.** `payVeterans` (src/core2/law-reach/group-b-veterans.ts, new) runs at the treasury's monthly close (`runBenefitPrograms` in src/core2/law-reach/group-b.ts) and pays each full resident `serviceOf` marks as having served, and the counted residents by the ACS veteran share for their age, the average benefit times the share who draw one (both ESTIMATED rows with spread), times the line in force over its base (`federalBenefitLine`). It pays through `reconcileObligations` on the `veterans` line, so the close pays only the rest outside, and records a bill's change on its own record under `budget-line:veterans`. The player sees it on the law page and the bill card.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: counted veterans are paid by the same rule times their count. The chain is the acceptance. No dice: nobody is picked to draw; each veteran is paid the share.

**Done when.** A second session, not the builder, starts the bench in a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising veterans by a tenth; after the next close, the bill card names veterans in town whose benefit rose, counts the counted ones, and shows the extra dollars.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-veterans.ts (new), src/core2/law-reach/group-b.ts, src/core2/data/laws/reach-group-b-parameters.json, src/core2/law-reach/veterans-reach.test.ts (new)

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-8fxsy5 since 2026-11-15 23:43 UTC, more than twice its 3-hour time box. Continue on branch claude/project-thread-8fxsy5.
