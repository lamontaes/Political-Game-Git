---
id: people-counted-causes-for-candidacy
title: "Counted adults carry no cause and no work hours when they weigh running, so almost none is ever drawn to a local seat"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The candidacy chooser gives a named adult a cause term (up to 2, from a recorded cause drive) and a time term (their work hours). A counted adult's record holds no drives, so their cause is always zero, and the unplaced workers among them (most counted workers) have no work commitment, so their time term is zero too. In 18 played towns no counted adult was drawn to run at the calibrated settings; every challenger came from the 80 to 100 named adults. One model, two tiers wants the counted adult to weigh running by the same terms: a cause read from what the counted record can hold (the views engine's issue salience for their cell, or a drive the counted tier records), and work hours for unplaced workers from their recorded earnings.

**Rules.** One model, two tiers: a counted adult weighs running by the same rule as a named one, times their count. No dice: the terms come from records, never a roll. Ask why: a counted adult drawn to run is filled in with the reasons that drew them.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) at least one counted adult is drawn to a local seat with a nonzero cause or time term in their recorded reasons, named by decision record id, the pooled uncontested share over 100 local seats stays within 8 points of 70 percent, and candidacy.test.ts and who-runs.test.ts pass.

**Files.** src/core2/modules/candidacy.ts, src/core2/electorate.ts, src/core2/modules/views.ts

**Notes.** Found working elections-challengers-term-keeps-races-uncontested (PR on claude/challengers-term-clean): with standing and the record gap now read for counted adults, their top pull in played towns sits about 3.5 to 4.1 against a stay-out bar of 4.
