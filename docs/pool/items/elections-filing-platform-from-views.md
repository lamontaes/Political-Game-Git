---
id: elections-filing-platform-from-views
title: "A filing made at the counter carries the filer's own stances from their views"
area: core
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: elections
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** A person who files for office at the counter has an empty platform; the Campaigns row has no stances to show for them. Stand-in SG-SCREENS-filing-platform-from-views.

**Cause.** Found in code: src/bench/play.mjs:1499 (the counter hands in no platform since the stance form was removed) and src/core2/modules/elections.ts:1236 (`platform: [...input.platform]`, taken as handed in). Nothing derives it from the filer's own policy views, the records the party fit reads.

**Fix.** In fileCandidacy (src/core2/modules/elections.ts), when no platform is handed in, build it from the filer's own view records on each of the contest's positions (the same view read the party fit uses), one entry per position in the form PLATFORM_QUESTIONS uses. Read the views once at filing, not daily. Delete the 'platform is SG-SCREENS-filing-platform-from-views' comment at play.mjs:1499 and clear the register row.

**Time box.** 4 hours for a Sonnet session.

**Rules.** No dice. A view is a read: the Campaigns row must show the stance from the filing record. Wire to the world: any filer, any office, a drawn place of the 56.

**Done when.** A second session, in a drawn place and seed nobody chose, files a candidacy at the counter in the running game and sees the Campaigns row list stances that match that person's own views card, named by filing record id; a person with no view on a position shows no stance for it, never a made-up one.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/bench/play.mjs, src/bench/filing.ts
