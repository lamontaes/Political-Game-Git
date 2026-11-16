---
id: legislature-no-sitting-on-swearing-in-day
title: "A body's calendar holds a sitting on the day its new members are sworn in"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: legislature-members-have-no-tie-to-each-other
blocked-on:
lead: people
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15, from the officials-ties test at told1 (Failolo, American Samoa)
---

**What.** New members sworn in at the start of a term have met none of their colleagues until the body's first floor week. At Failolo, American Samoa (territory:AS:failolo, seed 3a141c73deabbaa4ed64d91c4f3882be8f9746955f0c121830835dd18cb23cc9), four House members sworn 2025-01-03 know no colleague on 2025-01-20, because the first floor week is in February. A real chamber meets to swear them in, elect its officers and adopt its rules. Seen: in dev mode, a freshman legislator on day one knows the colleagues they were sworn in with.

**Cause.** Found in code: `sittingsBetween` in src/core2/modules/world-legislating.ts starts a session's sittings at its first floor week (convening plus `sessionCommitteeDays`), and the organizing day (swearing-in, officers, rules) is not on any calendar.

**Fix.** Put the organizing day on the session calendar the engine already reads (the convening date of each session that opens a term), as one sitting day, read by `sittingsBetween` and by whatever else reads the day; no flat tie.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** One calendar; no flat number; day one in motion.

**Done when.** At the named place and seed, the four members sworn 2025-01-03 read a tie to colleagues on 2025-01-20, and src/core2/officials-ties.test.ts names no "no-sitting-yet" official there; a second session sees it in dev mode on main.

**Waits on.** The sitting-ties PR.

**Files.** src/core2/modules/world-legislating.ts, src/core2/officials-ties.test.ts
