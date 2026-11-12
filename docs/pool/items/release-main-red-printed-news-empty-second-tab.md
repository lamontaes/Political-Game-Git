---
id: release-main-red-printed-news-empty-second-tab
title: "The printed-news check asserts the front page's lead story after opening the second tab, which can be an empty home outlet (Lake Minchumina, Alaska)"
area: release
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-printed-news-front-first
pr:
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (merger codex-1251 on #8928, NEWS_SEED=b6d227a6f3bb7531)
---

**What.** `src/bench/printed-news.browser.mjs` fails "the lead story has no text" on clean main d15046be at NEWS_SEED=b6d227a6f3bb7531 (Lake Minchumina, Alaska): the first outlet, KRBC-TV, shows eight headlines with text, and the second tab, KWDV-TV, a home outlet that has printed nothing yet, has no lead story. A merge desk running the check sees a red that is not its pull request's. Guards: the check that News lists the printed stories a player heard, worded, keeps running in every drawn place.

**Cause.** Found in code: in src/bench/printed-news.browser.mjs the check reads the front page, clicks the second outlet's tab, and only then asserts the lead story's text, the absence of `.paper-records` and the record labels against whatever page is open. News now gives a home outlet that has printed nothing its own tab, so the open page can be an empty one.

**Fix.** Check only, no assertion dropped: the front page's three checks are read before the second tab is opened and asserted as before, and the second page keeps the record-label check. The words for an empty outlet's page are W3's (Fable A, Nov 12) and need no change here.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps drawing its place and reads the screens a player reaches. No assertion is loosened.

**Done when.** A second session runs the check against a fresh bench on main in the drawn place it names, at NEWS_SEED=b6d227a6f3bb7531 and at NEWS_SEED=n3, and each prints PASS.

**Waits on.** Nothing.

**Files.** src/bench/printed-news.browser.mjs
