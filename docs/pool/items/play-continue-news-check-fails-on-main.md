---
id: play-continue-news-check-fails-on-main
title: "continue-news.browser.mjs fails on main: the opening record no longer keeps the place's unemployment line"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** src/bench/continue-news.browser.mjs fails on clean main with 'kept in the opening record: <place> unemployment at <rate>' in every drawn place tried (Se'etaga, American Samoa; Harrington Park, New Jersey; Levelock, Alaska). The fresh reader and the continued reader both show the same rates, so the assertion that the opening record keeps the line no longer matches what the record holds. Found by Merger 2 on Oct 27 while gating a pull request; Merger 4 saw it still failing on clean main twice on fresh draws (Waynesboro unemployment at 4.1 and Warwick unemployment at 2.5), though it had passed on an earlier run the same day, so something merged since broke it. Guards: News on a continued game, which shows the town's unemployment line.

**Cause.** Needs cause. Looked at src/bench/continue-news.browser.mjs (lines 85 to 115): it asserts every sentence the continued reader shows is in the kept opening record (the lead story's paragraphs, or its broadcast and the address, plus later headlines), so the reader shows rate sentences the record does not hold in that form. Not found: which side changed after the passing run earlier that day. It may be the same cause as play-news-reader-lead-without-text-crashes (a kept lead story with neither paragraphs nor broadcast).

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session, to find the cause and rewrite this item with `Found in code:` and a real Fix.

**Rules.** One rule, all 56 places: reproduce in a drawn place and name the place and seed. Never skip or narrow the check to get green.

**Done when.** A second session runs node src/bench/continue-news.browser.mjs in a drawn place (place and seed named) and sees it pass, with the cause of the change found by file and line and the check or the opening record corrected to match, shown by the check failing before and passing after.

**Waits on.** Nothing.

**Files.** src/bench/continue-news.browser.mjs, src/bench/ui/newspaper.mjs

**Notes.** Merger 4, Oct 27: still failing on clean origin/main at the time of the #6284 merge, twice on fresh draws ("kept in the opening record: Waynesboro unemployment at 4.1" and "Warwick unemployment at 2.5"); it passed twice on #6234 earlier the same day, so something merged since broke it.
