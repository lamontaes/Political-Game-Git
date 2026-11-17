---
id: pins-grudge-fade-and-hours
title: "Pins: a grudge fades by its holder's traits, a confrontation takes a closeness level, and no tie write carries literal hours"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: pins
pr:
after:
blocked-on:
root: none
lead: pins
model: opus
effort: high
source: "CTO, #9747 comment 6939171395 (05:10Z): the grudge audit's three rule breaks, given to Pins; plan 6939259881"
---

**What.** Every grudge faded at one fixed 180-day half-life, whoever held it. A confrontation's 0.1 closeness level was written as 0.1 hours, so it cost the tie almost nothing. Eight tie writes carried literal hours in code. Seen: the CTO's grudge audit against main f20f931d.

**Cause.** Found in code: the drive formation in src/core2/modules/drives.ts read `driveGrudgeHalfLifeDays` for every holder, the `confront` act wrote `-grudgeRelationshipChange` as hours, and `api.relationship` calls in campaigns.ts, interest-groups.ts, legislature.ts, press.ts and staff.ts passed 0.1, 0.05 and 0.5 hours.

**Fix.** `driveHalfLifeDays` moves a grudge's base half-life by its holder's own lean toward holding it over carrying on (the responses' act kinds); `confrontationStrain` writes the hours its level stands for where the tie is; the eight writes read the canvasser's pace and named meeting lengths. The player sees each drive's half-life in dev mode on a person's card.

**Time box.** 3 hours, Opus, high.

**Rules.** Sliding scales and causes: a grudge's fade moves smoothly with its holder's traits, never one number for everyone.

**Done when.** A second session plays a drawn place it names with its seed in dev mode, lays off workers from the Calendar's dev controls, opens a laid-off person's card and sees a grudge whose half-life differs from another holder's.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/data/parameters.json, src/core2/modules/campaigns.ts, src/core2/modules/interest-groups.ts, src/core2/modules/legislature.ts, src/core2/modules/press.ts, src/core2/modules/staff.ts, src/bench/dev-mode.ts, src/core2/grudge-from-life.test.ts, scripts/core2-year/pins-grudge-proof.ts.
