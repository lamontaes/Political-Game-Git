---
id: laws-medicare-raise-pays-more-of-members-care
title: "A federal Medicare raise pays no more of any Medicare member's care in town"
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
source: Account lead thread "Get every state and federal law working", Nov 15, 2026; approach ruled by the account lead Nov 15 00:42Z ("a raise lifts the share of medical bills it pays")
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
claimed-at:
branch: claude/project-thread-8fxsy5
---

**What.** When Congress raises the Medicare line, the whole raise is paid to recipients elsewhere. No Medicare member in town pays a smaller share of their medical bills, and no seller is paid more. The bill's page and dev mode's bill card name nobody in town. Seen: the law page's "What this did" and dev mode's bill card for a Congress bill that raises Medicare.

**Cause.** Found in code: the medical bills (`billMembers` in src/core2/medical-bills.ts) charge a Medicare member the fixed share `medicalPatientShareMedicare` of their care's cost, and nothing reads the federal Medicare line in force. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, the line raised a tenth and 40 days run: the bill's reach holds only `budget-line-paid` to one organization.

**Fix.** Medicare's own part of a member's care is scaled by the line in force over its base (`federalBenefitLine`, the rule income security reads), so the member's share falls by those dollars; the federal treasury pays them to the seller the household pays (`payMedicareLinePart` in src/core2/law-reach/group-b-money.ts, counted against the Medicare line so the close pays only the rest outside), and each member is recorded on the bill's own record under `budget-line:medicare`, counted members by their household's weight. A budget-line bill makes no law row, so dev mode's bill outcome (`billOutcome` in src/bench/dev-mode.ts) now carries the bill's budget lines and their reach under the bill's number, and the dev bill card (src/bench/ui/dev-bill-card.mjs) shows them. The player sees it on the law page and the bill card.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** One model, two tiers: counted members are billed and counted by the same rule times their weight. The chain is the acceptance. No dice.

**Done when.** A second session, not the builder, starts the bench in a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising Medicare by a tenth; after the next month's bills, the bill card names Medicare members in town whose share fell, counts the counted ones, and shows the dollars Medicare paid.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, src/core2/law-reach/group-b-money.ts, src/core2/modules/laws.ts, src/core2/law-reach/medicare-line-reach.test.ts (new), src/bench/dev-mode.ts, src/bench/ui/dev-bill-card.mjs, src/bench/dev-bill-budget-reach.test.ts (new)

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-8fxsy5 since 2026-11-15 23:43 UTC, more than twice its 3-hour time box. Continue on branch claude/project-thread-8fxsy5.
