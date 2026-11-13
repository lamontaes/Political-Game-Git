---
id: play-news-opens-on-the-outlet-with-unread-stories
title: "News opens on an empty home paper while an outlet the player follows has stories they have not read (Arial, South Carolina)"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after: words-press-study-committee-stories-unworded
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Merger codex-1251 on #8928, Nov 12 23:24Z (printed-news red by draw, NEWS_SEED=484cc751bef6ccc5); Fable A, Nov 13 02:50Z (the rule)
---

**What.** In Arial, South Carolina (NEWS_SEED=484cc751bef6ccc5) and Lakeville, Connecticut (w3-open-fresh-1), News opens on the home paper, which has printed nothing, while a station or network the player follows has stories they heard and have not read. The player sees an empty page and has to find the news tab by tab; `src/bench/printed-news.browser.mjs` fails "News lists no story" on main in both. Seen: the News sheet's first page, on a new life's June 1, 2025.

**Cause.** Found in code: `news` in src/bench/play.mjs opened on `newsTab` (the last tab chosen) or else the first tab, which is the home paper by rank, whether it had anything or not. Nothing on the screen knew what the player had read. And the open sheet redraws on the day's refresh, so a rule that marks a page read when shown would move the page under the player.

**Fix.** Fable A's rule (Nov 13 02:50Z): News opens on the last tab the player chose if it has something new; otherwise on the followed outlet with the newest story the player has not read; otherwise the home paper. A story is read once its outlet's page has been shown (the screen's own memory of what it showed, no record written). The tab on screen stays while News is open and redraws; it clears when News closes or another sheet opens. The rule is `openingTab` in src/bench/ui/news-open.mjs.

**Time box.** 2 hours

**Rules.** Replace, never layer: the old rule (open on the last tab chosen, else the first) is replaced by `openingTab`, not kept beside it. One rule, all 56 places: the rule reads only the tabs and what the screen has shown, never a place. Read-only screens create no facts: what has been read is the screen's memory, not a record.

**Done when.** A second session, in the running game on main, opens News in Arial, South Carolina (NEWS_SEED=484cc751bef6ccc5) and in a drawn place at a fresh seed: when the home paper is empty, News opens on an outlet with a story the player has not read, and `printed-news.browser.mjs` passes at both; Lake Minchumina, Alaska (b6d227a6f3bb7531) still opens on KRBC-TV.

**Waits on.** #8982 (the empty-page lines; this branch is stacked on it).

**Files.** src/bench/play.mjs, src/bench/ui/news-open.mjs, src/bench/news-open.test.ts
