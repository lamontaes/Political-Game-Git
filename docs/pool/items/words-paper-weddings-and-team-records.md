---
id: words-paper-weddings-and-team-records
title: "A wedding and a school team are records the paper can tell"
area: people
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws
model: opus
effort: medium
root: none
source: added on branch claude/project-thread-aqtryq (brief M, Nov 14)
checked: m3 2026-11-14
---

**What.** The owner's side stories name a local player going D1 and, in the same breath, ordinary town news. No marriage record reaches the paper's wire and no school team exists. Seen: News, a wedding notice for a resident the player knows.

**Cause.** Found in code: src/core2/modules/press.ts `milestones` (no marriage kind among the wire items); no team record in `decideSchoolHonors`, src/core2/school-honors.ts.

**Fix.** The family records emit a public marriage event; the paper's builder tells it. A team record belongs with the D1 item.

**Time box.** 3 hours.

**Rules.** No dice. A story says only what a reporter could know from a record the world holds; every line is the Words lead's.

**Done when.** In a drawn place, a second session reads a wedding notice whose couple matches the family records.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts
