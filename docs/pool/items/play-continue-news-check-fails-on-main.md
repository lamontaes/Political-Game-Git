---
id: play-continue-news-check-fails-on-main
title: "continue-news.browser.mjs fails on main: the opening record no longer keeps the place's unemployment line"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/continue-news.browser.mjs fails on clean main with 'kept in the opening record: <place> unemployment at <rate>' in every drawn place tried (Se'etaga, American Samoa; Harrington Park, New Jersey; Levelock, Alaska). The fresh reader and the continued reader both show the same rates, so the assertion that the opening record keeps the line no longer matches what the record holds. Found by Merger 2 on Oct 27 while gating PR 6222.

**Rules.** One rule, all 56 places: reproduce in a drawn place and name the place and seed. Never skip or narrow the check to get green.

**Done when.** continue-news.browser.mjs passes in a drawn place with the place and seed named, with the cause of the change found by file and line and the check or the opening record corrected to match, shown by the check failing before and passing after.

**Files.** src/bench/continue-news.browser.mjs

**Notes.** Merger 4, Oct 27: still failing on clean origin/main at the time of the #6284 merge, twice on fresh draws ("kept in the opening record: Waynesboro unemployment at 4.1" and "Warwick unemployment at 2.5"); it passed twice on #6234 earlier the same day, so something merged since broke it.
