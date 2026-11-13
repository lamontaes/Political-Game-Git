---
id: campaign-standing-reads-only-this-contest
title: "A candidate's standing in a race sums causes from every race they ever ran"
area: elections
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-campaign-standing-reads-only-this-contest
pr: #8397
after:
blocked-on:
source: governing lead, Oct 30 (found in phase A runs)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:32:02.783Z
merged-at: 2026-11-12T18:32:35.742Z
---

**What.** `contestStanding` in src/core2/campaign-day.ts sums every cause row of each candidate on the ballot, from every race they ever ran, not only this contest's, so a candidate who ran before starts a new race with the old one's reach counted. The speed lead found it while folding closed races' cause rows on Oct 30. Standing should be read from this contest's own causes. Seen: a candidate who ran before no longer starts a new race with the old race's reach, which moves who wins on election night.

**Cause.** Found in code: src/core2/campaign-day.ts `contestStanding` (line 559) sums every cause row of each candidate on the ballot, from every race they ever ran, not only this contest's.

**Fix.** Read standing from this contest's own cause rows, those dated within this campaign. A past race reaches the new one only through what people remember of the candidate.

**Time box.** 2 hours for a Sonnet session.

**Rules.** An effect is a read, not a record: the standing a screen and the campaign read must come from this contest's records, so a past race reaches the new one only through what people remember of the candidate, never through a sum of old rows.

**Done when.** A second session runs a core2 test in a drawn place with its seed printed that takes a candidate through two races, and sees the second race's standing count only causes dated within the second contest's campaign, named by cause id. The test fails when `contestStanding` sums the old race again.

**Waits on.** Nothing.

**Files.** src/core2/campaign-day.ts

**Notes.** TODO
