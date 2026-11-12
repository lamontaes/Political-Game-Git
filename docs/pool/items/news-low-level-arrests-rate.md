---
id: news-low-level-arrests-rate
title: "Nobody hears of the town's minor-offense arrests, so the police line's newest effect reaches no one's views"
area: laws
kind: wiring
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-news-low-level-arrests-rate
pr: #8438
blocked-on: justice-low-level-offenses
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: low
root: rc3-thin-life-record
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:21:02.110Z
branch: claude/pool-news-low-level-arrests-rate
merged-at: 2026-11-12T23:19:00.244Z
---

**What.** Once `justice-low-level-offenses` lands, the case flow counts minor quality-of-life arrests each month (`src/core2/public-safety.ts`, `lowLevelStreams`), and the outcome web keeps their rate as `justice.low-level-arrests`. No news topic reports that rate, so no person learns of it and the effect web's "knowing" point fails for the `police-to-low-level-arrests` link (measured by the low-level helper on a scratch run of the effect matrix, Oct 25). A person can attribute more or fewer minor arrests to the police line only after hearing of them.

**Cause.** Found in code: `lowLevelStreams` in src/core2/public-safety.ts (line 790) counts minor quality-of-life arrests and the outcome web keeps their rate as `LOW_LEVEL_MEASURE` ("justice.low-level-arrests", line 130); no row in src/core2/data/news/outcome-news.json reports the rate.

**Fix.** Add the outcome-news row reporting the month's minor-offense arrest rate when it moves; the words come from the English engine's banks.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: a person ties a change to a law only after news they received, and the stance cites that source. No hand-written player text: the words come from the English engine, its bank pieces unshippable until graded.

**Done when.** A second session, not the builder, plays a year (buildBenchWorld, a drawn place, seed named) with a raised police line and sees a resident's heard record name the minor-offense arrests story by record id.

**Waits on.** Nothing. justice-low-level-offenses is done.

**Files.** src/core2/data/news/outcome-news.json

**Notes.** Filed by the laws lead, Oct 25, from the low-level offenses helper's report.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the graded-hold clause; keep the news topic.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:21 UTC) on branch claude/pool-news-low-level-arrests-rate.
