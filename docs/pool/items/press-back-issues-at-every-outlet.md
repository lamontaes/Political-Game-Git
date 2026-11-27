---
id: press-back-issues-at-every-outlet
title: "Only one outlet of a place carries back issues from before day one; the rest open nearly empty and the News screen drops them"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Owner's grading page of Nov 24, 3:30 p.m. Eastern, item 5 (docs/coordination/grading/2026-11-24-page-1-verbatim.md): nothing is popping up before January 20th; these should already be populated and should pop up instantly."
checked:
claimed-at:
---

**What.** On day one a place's papers and stations open with almost nothing dated before January 20: a television station's tab held three stories from December 27 to January 3, and several outlets none, though the world ran a year before day one. The news archive was written for one outlet only, and the News screen then hid every story older than the news window. The player reads a news screen that looks as if the place had no past. Seen: News on day one, any outlet tab, in a new life.

**Cause.** Found in code: the function writeArchiveStory (line 2916) in src/core2/modules/press.ts printed every archive story at the outlet townOutlet returns, the one outlet of record, so the place's other outlets had only the 31-day warm-up's live stories (the live desk, pressWeek, runs only then); and the function nightsNews in src/bench/play.mjs dropped every row whose fresh flag was false, and heardItems in src/bench/calendar.ts kept only the newest 30 heard stories across all outlets. Measured: a built world with the warm-up on (Cache, Utah, seed n1, main 7dbcb1a3) had 12 outlets, 53 archive stories at the town paper and none at the other 11.

**Fix.** Write each archive record at every outlet that carries it with the desk's own rules (archiveItem, outletCarries, the week's room from the live desk's parameters, tieRule), as writeArchiveStories, replacing writeArchiveStory; file each archived story under its outlet in archive-words.ts; keep each outlet's newest 30 heard stories in heardItems and the News screen's back issues in nightsNews; word the back issues while the world loads.

**Time box.** 3 hours.

**Rules.** No hand-written player text in code: every headline is the English engine's words for a record the press desk wrote, and no line is typed or reworded.

**Done when.** A second session starts a new life in a drawn place on main (named with its seed), opens News in the screenshot on day one and finds on each outlet's tab stories dated before January 20 and before the warm-up began (December 20), and the first open of News takes no longer than a tab switch; a one-year run in a world built with buildBenchWorld shows each outlet's archive stories by record id in the news module's stories table.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/core2/past-news.ts, src/bench/archive-words.ts, src/bench/calendar.ts, src/bench/play.mjs, src/bench/handler.ts, src/bench/loading.ts
