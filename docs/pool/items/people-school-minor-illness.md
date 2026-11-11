---
id: people-school-minor-illness
title: "Children miss school for minor illness, not only serious onsets"
area: people
kind: feature
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: opus
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** Played towns show children attending 99 percent of school days or more (Monroe, Oregon 99.8 percent, Guam 99.3 percent) against NCES average daily non-attendance of 6.5 to 10 percent, because a child's reason to stay home reads the care need, which is zero except for a serious onset or a held chronic condition. The health module has no passing illness (colds, flu, injury) that raises a person's care need for days. Add short episodes from the person's age, season and household (a sick sibling), read by school and work absence alike, calibrated to the sourced NHIS illness absence, not NCES's total. A household-circumstance term (merged from people-school-attendance-circumstances) follows as a second step.

**Cause.** Found in code: src/core2/modules/school.ts schoolDay (the stay-home choice, STAY_HOME) reads the child's need, and careNeedOf in src/core2/modules/health.ts (line 1200) is zero except for a serious onset or held chronic condition, so no passing illness keeps a child home; Monroe, Oregon 99.8 percent attended.

**Fix.** Add short illness episodes from age, season and a sick household member in health.ts, read by school and work absence, calibrated to NHIS (mean 3.24 days missed a year, about 15 percent missing 6 or more) and not to NCES's 6.5 to 10 percent; then add a household-circumstance term. File the remaining gap to NCES as its own item.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: an episode starts from recorded causes (age, season, a sick household member, immunity from earlier episodes), never a monthly chance on one person; real incidence checks totals. One model, two tiers: counted children carry the same episodes times their count. Research before building: the NHIS figure (Berendes et al., MMWR 2020;68(53):1201-1205) is quoted from the page.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) in at least three drawn places and sees school-age children stay home for passing illness episodes, by episode and school attendance record ids, with the year's illness absence reported beside the NHIS figure (mean 3.24 days) in a test beside src/core2/school.test.ts.

**Waits on.** Nothing. Whether to build it is not a question for the owner: a mechanic real life has that the simulation needs is built from research as a background simulation (owner, Oct 24, "Simulate it, don't ask", AGENTS.md). It adds no step to the player's life; an absence shows only as a record.

**Files.** src/core2/modules/health.ts, src/core2/modules/school.ts, src/core2/data/parameters.json, src/core2/school.test.ts

**Notes.** TODO

Oct 21 (claude, not built): the done-when asks illness to carry all of NCES's non-attendance, which the sourced illness data does not support. NHIS 2010-2016: "Sixty-nine percent of children missed ≥1 day of school in the previous year" and "approximately 15% missed ≥6 days (mean = 3.24 days per child)" (Berendes, Andujar, Barrios and Hill, MMWR 2020;68(53):1201-1205, https://pmc.ncbi.nlm.nih.gov/articles/PMC6973341). The NHIS item behind it asks about days missed for illness or injury. That is about 1.8 percent of a 180-day year. Episodes calibrated to it would take attendance from 99 percent or more to about 97, not to 90 to 93.5. The rest of NCES's 6.5 to 10 percent is other causes: family, transport, disengagement and chronic absence. Building illness to the 90 to 93.5 band would make children sick four or five times as often as they are. Proposed done-when: passing episodes give school-age full people a year's illness absence within the NHIS spread (mean 3.24 days, about 15 percent at 6 or more), shown by episode and attendance record ids, with the remaining gap to NCES filed as its own item (other causes of absence). Stack on PR #5811 (claude/school-attendance), which makes the stay-home choice read careNeedOf. Claim released.

Note Oct 21 (claude): AGENTS.md says a mechanic exists only when the golden path needs it, The Political Process has it, or the owner asked for it by name, and that research calibrates the simulation without adding steps to the player's life. Children missing 6 to 10 percent of school days is a calibration of a number, not something the golden path reads, so before anyone builds a passing-illness mechanic for it, the owner's call is whether attendance at 99 percent is acceptable until a screen or an engine reads absence. If it is, close this item and leave `schoolAbsenceIllnessWeight` as it stands (PR #5811). OWNER QUESTION: build minor illness for school and work absence, or accept the current attendance?

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have kept children home for colds to match the NCES attendance rate; no player sees a child's attendance rate.
