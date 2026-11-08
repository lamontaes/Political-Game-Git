---
id: elections-economic-voting-term-read
title: "Voters weigh how the economy went under the incumbent: the term read's jobs, pay and prices areas enter the incumbent's record"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Voters' incumbent record (voting.ts recordAppeal) weighs votes and promises kept or broken, but nothing in an incumbent's record reads how the town's jobs, pay and prices went during the term, although the national economy now cycles (Money PR #7599) and src/core2/term-read.ts already reads each area from the outcome web. A voter who knows the officeholder, and a counted group by the same rule times its count, should weigh the term read's jobs, pay and prices slides for their own place, scaled by how much they follow it, so a recession under an incumbent costs votes and a boom helps. Money (session) found this while tracing which engines read the cycle: only the director, public-action and laws read the term read.

**Rules.** No dice: the slide decides, never a roll. Sliding scales, no threshold: use the tanh slide as is. One model two tiers: counted voters read it by the same rule times count. An effect is a read: the voter's recorded reasons name the term-read record ids. Wire to the world: any office with a place, not a named one.

**Done when.** In a played year of the bench world in a place drawn from all 56 (name place and seed in the PR body), two worlds differing only in the national downturn (twin seeds or dev mode's twin tool) give the incumbent different vote shares, and a voter's recorded reasons in that election name the term-read area and its outcome-web record ids; a test beside voting.traits.test.ts shows the incumbent's appeal falls as the jobs slide falls and rises as it rises, and the re-election totals script shows the change of totals against main.

**Files.** src/core2/modules/voting.ts, src/core2/term-read.ts, src/core2/data/term-read/areas.json

**Notes.** TODO
