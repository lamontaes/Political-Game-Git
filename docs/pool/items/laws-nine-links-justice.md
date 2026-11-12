---
id: laws-nine-links-justice
title: "Every justice law passes all nine wiring links in a played year"
area: laws
lead: laws
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
after:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Three laws of the justice family are still short of the nine wiring links: the police budget line (its low-level-arrests link), the corrections budget line (its money is untraced) and restore-voting-after-sentence (its turnout link, carried by stopgap SG-GOV-REACH-A-convictions). The other nine landed in PR #6012 as laws-nine-links-justice-nine. A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place.

**Cause.** Design: the nine-link standard in docs/archive/2026-10-23/work-orders/lead-laws-2026-10-24.md. The three remaining laws are carried by news-low-level-arrests-rate (open), laws-checker-follows-line-transfers (done) and stopgap SG-GOV-REACH-A-convictions.

**Fix.** Finish the three: land news-low-level-arrests-rate so people hear of minor arrests, regrade budget-line:corrections now that laws-checker-follows-line-transfers is done, and give restored voters a turnout reader to close SG-GOV-REACH-A-convictions. Then grade budget-line:police, budget-line:corrections and restore-voting-after-sentence in two drawn places.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** A second session, not the builder, replays this on main in the running game: in two drawn places on seeds nobody chose, dev mode and the law check follow each law still open in this item to a named person or household and a dollar, by `lawApplied` record id and journal entry. The builder's proof: In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Waits on.** news-low-level-arrests-rate (open). laws-checker-follows-line-transfers and laws-checker-enacts-where-no-power are done.

**Files.** src/core2/modules/crime.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/archive/2026-10-23/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: merged, #5642. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-justice`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. Merged does not mean nine links: on Oct 20 civilian oversight, the juvenile court age and the handgun purchase age only wrote a record nobody read. Bail money is `justice-bail-moves-the-cash` (in review).

Laws lead, Oct 25 10:20: PR #6012 opened at 681395e90d. 10 of 12 wired over a year in both audit towns (jail line's money untraced). Police line's low-level-arrests link waits on justice-low-level-offenses; restore voting waits on laws-checker-enacts-where-no-power. Merge after #5582.

Laws lead, Oct 25 22:00: PR #6012 now lands the nine laws that are wired as `laws-nine-links-justice-nine`. This item stays open for three: the police line (its low-level arrests link, #6056), the corrections line (money untraced, `laws-checker-follows-line-transfers`) and restore-voting-after-sentence (its turnout link, `SG-GOV-REACH-A-convictions`).

Sent back 2026-10-25 from PR #6012 (branch claude/laws-nine-links-justice): only 10 of 12 laws meet the family table, and corrections money remains untraced while police/fire have gross treatment posts without control deltas; provide every required link or a completed bounded slice and causal law-linked money evidence, keeping the family open; finish on that branch, merge main into it first. The prior government-family ordering hold is cleared.
