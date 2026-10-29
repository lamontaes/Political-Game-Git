---
id: news-low-level-arrests-rate
title: "Nobody hears of the town's minor-offense arrests, so the police line's newest effect reaches no one's views"
area: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on: justice-low-level-offenses
source: added with npm run pool -- add
---

**What.** Once `justice-low-level-offenses` lands, the case flow counts minor quality-of-life arrests each month (`src/core2/public-safety.ts`, `lowLevelStream`), and the outcome web keeps their rate as `justice.low-level-arrests`. No news topic reports that rate, so no person learns of it and the effect web's "knowing" point fails for the `police-to-low-level-arrests` link (measured by the low-level helper on a scratch run of the effect matrix, Oct 25). A person can attribute more or fewer minor arrests to the police line only after hearing of them.

**Rules.** Ask why: a person ties a change to a law only after news they received, and the stance cites that source. No hand-written player text: the words come from the English engine, its bank pieces unshippable until graded.

**Done when.** A row in `src/core2/data/news/outcome-news.json` reports the month's minor-offense arrest rate when it moves, the news engine runs it through the existing outcome-news path, and in a played year (`buildBenchWorld`, a drawn place, seed named) with a raised police line a resident's heard record names the story by record id.

**Files.** src/core2/data/news/outcome-news.json

**Notes.** Filed by the laws lead, Oct 25, from the low-level offenses helper's report.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the graded-hold clause; keep the news topic.
