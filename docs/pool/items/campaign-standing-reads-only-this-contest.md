---
id: campaign-standing-reads-only-this-contest
title: "A candidate's standing in a race sums causes from every race they ever ran"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (found in phase A runs)
lead: governing
---

**What.** contestStanding in campaign-day.ts sums every cause row of each candidate on the ballot, from every race they ever ran, not only this contest's, so a candidate who ran before starts a new race with the old one's reach counted. The speed lead found it while folding closed races' cause rows on Oct 30. Standing should be read from this contest's own causes.

**Rules.** An effect is a read, not a record: the standing a screen and the campaign read must come from this contest's records, so a past race reaches the new one only through what people remember of the candidate, never through a sum of old rows.

**Done when.** A core2 test in a drawn place with its seed printed runs a candidate through two races and shows the second race's standing counts only causes dated within the second contest's campaign, by cause id.

**Files.** src/core2/campaign-day.ts

**Notes.** TODO
