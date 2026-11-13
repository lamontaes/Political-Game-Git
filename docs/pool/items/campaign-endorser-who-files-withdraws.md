---
id: campaign-endorser-who-files-withdraws
title: "Someone who endorsed a candidate and then runs against them in the same race withdraws the endorsement"
area: elections
kind: bug
priority: 3
size: S
status: merged
claimed-by: claude/pool-campaign-endorser-who-files-withdraws
pr: #8406
after:
blocked-on:
lead: governing
source: governing lead, Nov 1 (review of campaign-candidates-never-help-a-rival)
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:50:44.722Z
merged-at: 2026-11-12T20:21:10.519Z
---

**What.** campaign-candidates-never-help-a-rival takes a new filer off their rivals' volunteers and staff on the day they file, and stops them giving, hosting or endorsing from then on. But a person-to-person yes given before they filed still stands, because askForEndorsement returns any held yes (src/core2/modules/campaigns.ts line 5081), and a group whose speaker later files keeps the endorsement it gave. So a candidate can be shown endorsing the opponent they are running against. Seen: the Campaigns screen no longer shows a candidate endorsing the opponent they are running against.

**Cause.** Found in code: src/core2/modules/campaigns.ts `askForEndorsement` (line 5081) returns any held yes (`held?.answer === "yes"`, line 5092), and a group whose speaker later files keeps the endorsement it gave, so a candidate can be shown endorsing the opponent they are running against.

**Fix.** On the filing day end the person's held yes (and a group's endorsement when its speaker files) for that race, as a record naming the filing. Every endorsement reader skips it. The held yes is ended, with no second flag beside it.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Ask why: the withdrawal is a record that names the filing that caused it, read wherever an endorsement is read (the standing, the Campaigns screen, Words' lines). Replace, never layer: the held yes is ended, not hidden beside a second flag.

**Done when.** A second session, in a drawn place with its seed printed, has a person who endorsed candidate A file in A's race and sees them no longer count as endorsing A from the filing day, by the endorsement row and the filing id. A group whose speaker files in the race withdraws its endorsement of a rival the same way. src/core2/campaign-rival-help.test.ts shows both, each failing without the change.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-rival-help.test.ts

**Notes.** Found by the review of campaign-candidates-never-help-a-rival, Nov 1. Build after that PR merges.
