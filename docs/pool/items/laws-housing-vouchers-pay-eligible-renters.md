---
id: laws-housing-vouchers-pay-eligible-renters
title: "A federal law giving vouchers to every eligible family pays no renter in town"
area: laws
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 15, 2026 (/mnt/project-files/laws/take-effect.md); approach ruled by the account lead Nov 15 00:42Z ("vouchers on the rent the housing engine charges")
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
claimed-at:
branch: claude/project-thread-8fxsy5
---

**What.** When Congress enacts housing vouchers for every eligible family, the law is in force and no renting household in town is paid anything. The bill's page and dev mode's bill card name nobody. Seen: the law page's "What this did" and dev mode's bill card for the federal question.

**Cause.** Found in code: no .ts file under src/core2 outside tests reads the question `us-federal-positions:housing.vouchers-for-every-eligible-family`; the housing engine's rent help (`payRentAssistance`, src/core2/housing-assistance.ts) pays only from a housing budget line above its base. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, the question enacted and 40 days run: the law holds no reach row.

**Fix.** `payRentAssistance` (src/core2/housing-assistance.ts) now ends with `payHousingVouchers`: while the question is law, the federal Treasury pays each renting household in town whose monthly income is at most half the town's median pay the rent above 30 percent of its income (42 U.S.C. 1437f(o)), through the same payers as rent help (`transferCash` for a full household's oldest adult, `countedPayment` for a counted one). A household a housing line already helps is not paid twice. The money counts against the federal income security line (`noteLinePaid`), which carries housing assistance. Each payment is written on the law's record as `housing-voucher-paid`, so the player sees it on the law page and the bill card.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: counted households are paid by the same rule times their count. The chain is the acceptance. No dice: every eligible household is paid; nobody is picked.

**Done when.** A second session, not the builder, starts the bench in a drawn place, writes down the place and seed, and in dev mode enacts vouchers for every eligible family in Congress; after the next monthly housing review, the bill card names renting households in town that were paid, counts the counted ones, and shows the dollars.

**Waits on.** Nothing.

**Files.** src/core2/housing-assistance.ts, src/core2/modules/housing.ts, src/core2/data/laws/reach-group-a-parameters.json, src/core2/law-reach/housing-vouchers-reach.test.ts (new)

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-8fxsy5 since 2026-11-15 23:43 UTC, more than twice its 3-hour time box. Continue on branch claude/project-thread-8fxsy5.
