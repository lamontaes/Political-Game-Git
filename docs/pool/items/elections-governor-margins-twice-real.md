---
id: elections-governor-margins-twice-real
title: "The world's 2026 governor races are won by margins about twice the real ones"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On election night of November 3, 2026 in Cecilia, Louisiana (custom world seed lane4-gov-1), the 36 governor races were won by 12 to 65 points: Maryland Democratic by 64, Massachusetts by 65, California by 60, Hawaii by 60, Alabama Republican by 38. The real 2022 margins were about half that (Maryland about 32, Massachusetts about 29, California about 18). Picture: docs/play-first/shots/play-governor-races-on-screen/governors-1440.png on lane-4/governor-rows. The figures come from raceVotes in src/core2/modules/voting.ts, read by governorRacesTonight in src/bench/results.ts.

**Rules.** research-habit: real results check the totals and never pick one race. No dice. One rule, all 56 places.

**Done when.** Across two drawn seeds, the median absolute 2026 governor margin falls within the real 2018 and 2022 governor medians' spread (sourced in the PR), with the races named by record id.

**Files.** src/core2/modules/voting.ts, src/core2/electorate.ts

**Notes.** lead: Lane 1. Found by Lane 4 on Nov 4 while building play-governor-races-on-screen.
