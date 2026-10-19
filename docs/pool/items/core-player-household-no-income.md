---
id: core-player-household-no-income
title: "A long-term job seeker in a small town gets no offer for a year (Colebrook, New Hampshire): checked, the match is working as built"
area: core
kind: bug
priority: 3
size: M
status: done
claimed-by: claude/core-player-household-no-income
pr: #4454
blocked-on:
source: found by a Claude session verifying core-player-money-spending in a played year
claimed-at: 2026-10-15T21:22:13.694Z
---

**What.** In Colebrook, New Hampshire (place 3313700, seed cfa61ad11b9653ed75640a7ae2762a424b830ac48efd67c06f0e19580d907725, from January 20, 2025) the player's household (the player, 18, a 12-year-old, and the head, 41) has no earner. Its consequences run: the head is registered as a job seeker from the opening (reason `opening-unemployed`), the $1,820 of cash is gone after the first month's bills, rent goes unpaid from March 1, 2025 (arrears of $564.49 a month on the lease), the lease ends on April 27, 2025 and the household moves. The head received no job offer in twelve months.

**Checked, and why.** The weekly match (`runWeek` in `src/core2/modules/jobs.ts`) has employers offer their best-placed applicant. In that town the probe saw 21 positions opened in six months (none still open at any month end) against 73 to 78 named seekers and 51 to 102 counted ones, so each position drew dozens of applicants and the head was not the best placed. That is the match working as built, not a defect: no change needed.

**Rules.** No dice; ask why: the cause of a pattern is named by code and counts, here the applicants per position.

**Done when.** Closed with that finding. Reopen only if the owner wants a long-term seeker to hear why they lost each time (a "not chosen" record), which would be a new feature.

**Files.** none changed.

**Notes.** First thought a household with no earner did nothing; the first deeper probe found the arrears, the lease ending and the move; the second found the position and seeker counts above. The household with an earner is covered by player-money-year.test.ts. Probe notes: jobs seekers and positions tables each 30 days for six months.
