---
id: core-speed-year-four-years
title: "The speed check times one year, an off year, so an election year three times slower never shows"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/long-run
pr: #6894
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T03:30:09.563Z
---

**What.** npm run speed:year times one year from the opening, 2025, which holds no federal or most state elections. One Ringgold, Louisiana save (seed long-1) runs 2025 in 52 s and 2028, a presidential year, in 155 s, over the 120-second bar, because of election work (campaigns, the press, causes, voting). The CTO ruled on Oct 30 at 03:18 that the default becomes four years so every check holds an election year, that the bar applies to each year, and that receipts print each year. A long save also needs each year's memory and records kept, to show whether it grows (Oct 30 01:55 bar, part 2).

**Rules.** Speed: a country's year runs under 120 seconds each year, and no change makes a year more than 20 percent slower. One rule, all 56 places: the check names its place and seed.

**Done when.** npm run speed:year with no --years runs four years; each year's line and receipt row carry its seconds, heap and process memory after a collection and the records kept, and the receipt is saved as each year ends; scripts/speed-years/compare.test.ts passes; a run in a drawn place shows the new line, in the PR body.

**Files.** scripts/speed-years/run.ts, scripts/speed-years/compare.ts, scripts/speed-years/README.md

**Notes.** TODO
