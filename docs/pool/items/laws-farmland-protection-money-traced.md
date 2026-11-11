---
id: laws-farmland-protection-money-traced
title: "Farmland protection's money is the cost it changes for the builder it stops, against the control world"
area: laws
lead: laws
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: laws lead, Oct 26
claimed-at:
checked: fable 2026-11-10
---

**What.** In the rights-env family's runs on the own-payment checker, protect-farmland-from-development grades wired, but its money is only postings that name the law: $1,000.00 in Prescott, Michigan and $2,000.00 in Uehling, Nebraska, the same in the control world. The builder's applied row carries no amount. So the money the matrix credits is not the law's own: nothing differs between the world with the law and the world without it. The housing engine reads the protection when a builder chooses a site, and the cost it changes is the law's money.

**Cause.** Found in code: the protect-farmland-from-development key is read in src/core2/modules/housing.ts (line 2215) and src/core2/housing-construction.ts (line 38); the builder's applied row there carries no amount, so the checker finds only law-named postings that are equal in the control world.

**Fix.** Have the builder's applied row record the site cost the protection changed (the cost of the site the builder could not use), so the checker finds a different payment from the control world's.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the housing engine reads the protection when a builder chooses a site, and the cost it changes is the law's money. Sliding scales and causes: no fixed share; the cost comes from the site the builder could not use.

**Done when.** A second session, not the builder, plays a year (`buildBenchWorld`, every module installed) in a drawn place where a builder plans homes on farmland (place and seed named). The builder's applied row records the cost the protection changed, and scripts/law-wiring/check.ts finds that builder's payment different from the control world's, named by journal id with both amounts. Nothing on screen reads it yet.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/housing-construction.ts, scripts/law-wiring/check.ts

**Notes.** Laws lead, Oct 26, from the rights-env helper's regrade. Part of `laws-nine-links-rights-env`. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it would change which dollars the matrix credits to one farmland law's builder cost; the law already reaches the builder and no screen shows that cost.
