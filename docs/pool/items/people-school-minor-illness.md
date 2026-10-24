---
id: people-school-minor-illness
title: "Children miss school for minor illness, not only serious onsets"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Played towns show children attending 99 percent of school days or more (Monroe, Oregon 99.8 percent, Guam 99.3 percent) against NCES average daily non-attendance of 6.5 to 10 percent, because the child's reason to stay home reads careNeedOf, which is zero except for a serious onset or a held chronic condition. The health module has no passing illness (colds, flu, injury) that raises a person's care need for days. Add short episodes to the health module from the person's age, season and household (a sick sibling) so a child's care need rises for a few days, read by school and work absence alike.

**Rules.** No dice: an episode starts from recorded causes (age, season, a sick household member, immunity from earlier episodes), never a monthly chance on one person; real incidence checks totals. One model, two tiers: counted children carry the same episodes times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56, seed named), the school-age share of days attended falls between 90 and 93.5 percent pooled over at least three drawn places, shown by school attendance records and the episodes that kept children home by record id, in a test beside src/core2/school.test.ts.

**Files.** src/core2/modules/health.ts,src/core2/modules/school.ts,src/core2/data/parameters.json

**Notes.** TODO

Oct 21 (claude, not built): the done-when asks illness to carry all of NCES's non-attendance, which the sourced illness data does not support. NHIS 2010-2016: "Sixty-nine percent of children missed ≥1 day of school in the previous year" and "approximately 15% missed ≥6 days (mean = 3.24 days per child)" (Berendes, Andujar, Barrios and Hill, MMWR 2020;68(53):1201-1205, https://pmc.ncbi.nlm.nih.gov/articles/PMC6973341). The NHIS item behind it asks about days missed for illness or injury. That is about 1.8 percent of a 180-day year. Episodes calibrated to it would take attendance from 99 percent or more to about 97, not to 90 to 93.5. The rest of NCES's 6.5 to 10 percent is other causes: family, transport, disengagement and chronic absence. Building illness to the 90 to 93.5 band would make children sick four or five times as often as they are. Proposed done-when: passing episodes give school-age full people a year's illness absence within the NHIS spread (mean 3.24 days, about 15 percent at 6 or more), shown by episode and attendance record ids, with the remaining gap to NCES filed as its own item (other causes of absence). Stack on PR #5811 (claude/school-attendance), which makes the stay-home choice read careNeedOf. Claim released.

Note Oct 21 (claude): AGENTS.md says a mechanic exists only when the golden path needs it, The Political Process has it, or the owner asked for it by name, and that research calibrates the simulation without adding steps to the player's life. Children missing 6 to 10 percent of school days is a calibration of a number, not something the golden path reads, so before anyone builds a passing-illness mechanic for it, the owner's call is whether attendance at 99 percent is acceptable until a screen or an engine reads absence. If it is, close this item and leave `schoolAbsenceIllnessWeight` as it stands (PR #5811). OWNER QUESTION: build minor illness for school and work absence, or accept the current attendance?
