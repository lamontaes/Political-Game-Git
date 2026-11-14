---
id: research-election-notice-days-per-place
title: "Each place's notice of election goes up the number of days its law says, not one flat 21"
area: elections
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-election-notice-printed
blocked-on:
lead: words
model: sonnet
effort: low
root: design-words-machine
source: Account lead, Nov 14 2026 (coordinator's note on the notice lead)
claimed-at:
checked: account-lead 2026-11-14
branch:
---

**What.** The notice of election the town's paper prints goes up a flat 21 days before each election day for every place and every kind of election. State and local law set that period, and it differs by place and by kind of election. A player in a place with a long statutory notice, or a short one, reads the notice at the wrong time. Replace the one number with each place's own period, read from place data. Feeds: words-election-notice-printed.

**Cause.** Found in code: src/core2/modules/voting.ts `scheduleContest` dates the notice with the parameter `electionNoticeLeadDays` (src/core2/data/parameters.json, ESTIMATED, one value for all 56 places), and nothing in data/research/elections holds a notice period.

**Fix.** Add the notice period to the elections research rows that already hold each place's filing rules (data/research/elections/filing-requirements.json is the neighbor), sourced from each place's law as its rows already are, then have `scheduleContest` read the place's row and fall back to the parameter only where a place has none (marked as an estimate). Delete nothing else.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: no state is named in logic, the period is a data row per place and the test draws places. Estimate, never UNKNOWN: a place with no row reads the estimated parameter and says so in its source tag.

**Done when.** A second session plays a place from the draw and sees its notice in the paper on the day its row gives; a test draws places from all 56 and shows each posts its notice the days its row says before an election day, and a place without a row posts it at the estimated parameter; the notice's date in each is read by record id from the calendar entry.

**Waits on.** words-election-notice-printed, which builds the notice itself.

**Files.** src/core2/modules/voting.ts, src/core2/data/parameters.json, data/research/elections/filing-requirements.json, src/core2/election-notice.test.ts

**Notes.** Filed Nov 14 by the Account lead on the coordinator's ask. No research was fetched in this thread; the source field for the estimate says so.
