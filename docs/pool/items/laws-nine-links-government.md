---
id: laws-nine-links-government
title: "Every government and elections law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #5582
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 
---

**What.** This is one bounded family of the umbrella `laws-wiring-every-law`, which no single family PR could finish. Every law in the government and elections family must pass all nine links of the law-wiring standard: it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The laws, as the Oct 20 matrix assigns them (the lead corrects the list on its first rebuild): all-mail-voting, automatic-voter-registration, independent-redistricting, require-photo-id-to-vote, same-day-voter-registration, ban-lobbying-after-office, public-pay-floor, budget-line:administration, broaden-local-authority and legislative-term-limits.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/modules/voting.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: open, #5582 (branch claude/law-wiring-government), sent back twice on Oct 23: election-cost debt after repeal (item `gov-election-cost-debt-survives-repeal`) and family acceptance unmet. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-government`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. The public pay floor had no starting row in any of the 56 places on Oct 20; give it one or a declared reason.

Sent back 2026-10-24 from PR #5582 (branch claude/law-wiring-government): Annual family evidence still missing on corrective c64f3feaf9: committed runs use 35/300-day windows and after10, while current checker now uses after31; rerun full annual two-town evidence and refresh matrix/table; finish on that branch, merge main into it first.
