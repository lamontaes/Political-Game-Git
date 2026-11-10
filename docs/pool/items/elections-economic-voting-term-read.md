---
id: elections-economic-voting-term-read
title: "Voters weigh how the economy went under the incumbent: the term read's jobs, pay and prices areas enter the incumbent's record"
area: elections
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Voters' incumbent record (`recordAppeal` in voting.ts) weighs votes and promises kept or broken, but nothing in an incumbent's record reads how the town's jobs, pay and prices went during the term, although the national economy now cycles (Money PR #7599) and `src/core2/term-read.ts` already reads each area from the outcome web. A voter who knows the officeholder, and a counted group by the same rule times its count, should weigh the term read's jobs, pay and prices slides for their own place, scaled by how much they follow it, so a recession under an incumbent costs votes and a boom helps. The electorate already reads town jobs and the national economy through `townConditions`, so this must not become a second economic reading. Seen: your re-election: voters weigh how jobs, pay and prices went during your term, so a recession hurts you on election night.

**Cause.** Design: docs/design/electorate-one-model.md (candidate standing already includes the national economy, the midterm penalty and the town's jobs through `townConditions` in `src/core2/electorate-inputs.ts`). `recordAppeal` (`src/core2/modules/record.ts`, called from `src/core2/modules/voting.ts`) reads votes and promises but not `src/core2/term-read.ts`. Owner rule: one engine per mechanic.

**Fix.** Decide first whether the term read replaces the town-jobs term in `townConditions` or adds the incumbent's record of jobs, pay and prices to `recordAppeal`. Then build one of them, with counted voters by the same rule, and the voter's reasons naming term-read record ids.

**Time box.** 8 hours for one Opus session.

**Rules.** No dice: the slide decides, never a roll. Sliding scales and causes: use the tanh slide as is, with no threshold. One model, two tiers: counted voters read it by the same rule times count. An effect is a read, not a record: the voter's recorded reasons name the term-read record ids. Wire to the world: any office with a place, not a named one.

**Done when.** A second session plays a year of the bench world in a place drawn from all 56 (name and seed written down) in two worlds that differ only in the national downturn (twin seeds or dev mode's twin tool) and finds the incumbent with different vote shares, and a voter's recorded reasons in that election name the term-read area and its outcome-web record ids. A test beside `voting.traits.test.ts` shows the incumbent's appeal falls as the jobs slide falls and rises as it rises, and the re-election totals script shows the change of totals against main.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/record.ts, src/core2/term-read.ts, src/core2/electorate-inputs.ts, src/core2/data/term-read/areas.json

**Notes.** TODO
