---
id: campaign-endorser-who-files-withdraws
title: "Someone who endorsed a candidate and then runs against them in the same race withdraws the endorsement"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: governing
source: governing lead, Nov 1 (review of campaign-candidates-never-help-a-rival)
---

**What.** campaign-candidates-never-help-a-rival takes a new filer off their rivals' volunteers and staff on the day they file, and stops them giving, hosting or endorsing from then on. But a person-to-person yes given before they filed still stands, because askForEndorsement returns any held yes (src/core2/modules/campaigns.ts near 4454), and a group whose speaker later files keeps the endorsement it gave. So a candidate can be shown endorsing the opponent they are running against.

**Rules.** Ask why: the withdrawal is a record that names the filing that caused it, read wherever an endorsement is read (the standing, the Campaigns screen, Words' lines). Replace, never layer: the held yes is ended, not hidden beside a second flag.

**Done when.** In a drawn place with its seed printed, a person who endorsed candidate A and then files in A's race no longer counts as endorsing A from the filing day, by the endorsement row and the filing id; a group whose speaker files in the race withdraws its endorsement of a rival the same way; campaign-rival-help.test.ts shows both, each failing without the change.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-rival-help.test.ts

**Notes.** Found by the review of campaign-candidates-never-help-a-rival, Nov 1. Build after that PR merges.
