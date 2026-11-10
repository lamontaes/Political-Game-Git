---
id: laws-nine-links-health-schools
title: "Every health, assistance and schools law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #6026
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Four laws of the health, assistance and schools family are still short of the nine wiring links, as the Oct 26 Notes narrow it: the budget lines healthAndHospitals, schools and higherEducation, which pay nothing under their own law id, and public-funds-for-private-schooling, which reached nobody in Prescott, Michigan. The rest of the family landed through the bounded item laws-nine-links-health-schools-eight (now dropped). A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. The first job is to regrade the family on main and say which of the four still fail and why.

**Cause.** Needs cause. Looked at the item, its Notes and docs/reports/law-wiring-matrix.json; the matrix was not regraded on main in this pass. The Notes blame the three budget lines on a treasury change in PR #5669, but #5669 is the rights-and-environment family PR, so that reason is stale and why each of the four still fails is not known.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. The session regrades the matrix on main for the four laws and rewrites this item with Found in code or Measured and a real Fix.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** A second session, not the builder, replays this on main in the running game: in two drawn places on seeds nobody chose, dev mode and the law check follow each law still open in this item to a named person or household and a dollar, by `lawApplied` record id and journal entry. The builder's proof: In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b.ts, src/core2/modules/health.ts, src/core2/modules/school.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5652 and #5732. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-health-schools`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: rebuild the matrix on main and finish what the rows still show missing, partial or stopgapped. Open pieces already filed: `laws-medicaid-counted-coverage-unpaid-ainaloa`, `laws-medicaid-medical-debt-link-silent-ridgebury`.

Laws lead, Oct 25 11:40: in PR #6026 (head fee1a54619, #5582 merged in); merge after #5582.

Sent back 2026-10-25 ~23:20 UTC from PR #6026 (branch claude/laws-nine-links-health-schools, head db8866631637, main NOT merged: conflicts in code src/core2/world-poverty.ts and src/core2/law-reach/group-b-money.ts plus data gaps/coverage/unwired/stopgaps and reports): resolve on the branch preserving both sides' reach/gap rows, rerun the family gate, and it goes back in the queue; finish on that branch, merge main into it first.

Laws lead, Oct 26: PR #6026 moves to the bounded `laws-nine-links-health-schools-eight` (main merged in, conflicts resolved on the branch keeping both sides' rows). This item stays open for budget-line:healthAndHospitals, budget-line:schools and budget-line:higherEducation, which pay nothing under their own law id until the treasury change in PR #5669 lands, and for public-funds-for-private-schooling, which reached nobody in Prescott, Michigan.
