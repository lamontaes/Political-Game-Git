---
id: people-counted-causes-for-candidacy
title: "Counted adults carry no cause and no work hours when they weigh running, so almost none is ever drawn to a local seat"
area: people
kind: wiring
priority: 2
size: M
status: blocked
claimed-by: claude/counted-candidacy-causes
pr:
blocked-on: people-drives-counted-tier-causes
source: added with npm run pool -- add
claimed-at: 2026-10-21T05:12:45.503Z
after:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
lead: lives
---

**What.** The candidacy chooser gives a named adult a cause term (up to 2, from a recorded cause drive) and a time term (their work hours). A counted adult's record holds no drives, so their cause is always zero, and the unplaced workers among them have no work commitment, so their time term is zero too. In 18 played towns no counted adult was drawn to run at the calibrated settings; every challenger came from the 80 to 100 named adults. A counted adult should weigh running by the same terms, times their count.

**Cause.** Found in code: src/core2/modules/candidacy.ts reads a person's cause kinds (causeKinds, line 136) and workHoursDaily (lines 151, 232 and 443) from a full person's record; a counted adult has no drive row and unplaced workers have no job hours, so both terms are zero. The item records 18 played towns where no counted adult was drawn (found working elections-challengers-term-keeps-races-uncontested), with counted adults' top pull about 3.5 to 4.1 against a stay-out bar of 4.

**Fix.** Give a counted adult the cause term from the counted tier's drive record and a work-hours term from recorded earnings, so counted adults weigh running by the same terms, times their count.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted adult weighs running by the same rule as a named one, times their count. No dice: the terms come from records, never a roll. Ask why: a counted adult drawn to run is filled in with the reasons that drew them.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) and sees at least one counted adult drawn to a local seat with a nonzero cause or time term in their recorded reasons, named by decision record id; the pooled uncontested share over 100 local seats is reported beside 70 percent as a check on totals; src/core2/candidacy.test.ts and src/core2/who-runs.test.ts pass.

**Waits on.** people-drives-counted-tier-causes (the counted tier must record causes).

**Files.** src/core2/modules/candidacy.ts, src/core2/electorate.ts, src/core2/modules/views.ts

**Notes.** Found working elections-challengers-term-keeps-races-uncontested (PR on claude/challengers-term-clean): with standing and the record gap now read for counted adults, their top pull in played towns sits about 3.5 to 4.1 against a stay-out bar of 4.
