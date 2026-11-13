---
id: play-news-desk-counts-as-unread
title: "News opens on an empty home paper while every story sits on the last tab, which is named News (North Hyde Park, Vermont)"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after: play-news-opens-on-the-outlet-with-unread-stories
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Playtester P3, Nov 13 05:06Z on #8928 (North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8); Fable A, 05:19Z
---

**What.** In North Hyde Park, Vermont, News opens on "North Hyde Park Register ... Nothing from North Hyde Park Register yet." while every story the player can read (the Vermont House vote, the minimum wage, the federal food aid law, fifteen briefs) is on the last tab, which is named "News" inside News. The player sees an empty page and a tab whose name says nothing. Seen: the News sheet's first page, January 20, 2025.

**Cause.** Found in code: `openingTab` in src/bench/ui/news-open.mjs skipped the desk of stories no outlet printed (`NOT_OUTLETS` held "news"), so with nothing unread at any outlet it fell back to the home paper; the desk's tab took the sheet's own title (`controls.news.title`) as its name in src/bench/play.mjs.

**Fix.** The desk counts like an outlet when it holds a story the player has not read; only the Nation's page is skipped. The desk's tab, and the reader's masthead for a story no outlet printed, are named "Around town" (`controls.news.desk`).

**Time box.** 1 hour

**Rules.** Replace, never layer: the desk's old name is replaced where it was said, not kept beside the new one. One rule, all 56 places: the rule reads only the tabs and what the screen has shown.

**Done when.** A second session, in a drawn place on main whose stories are all on the desk (North Hyde Park, Vermont, place 5050725, creator seed a6b481a5-c6c9-432b-8cca-c0463c518da8), opens News: it opens on "Around town" with its stories, and no tab inside News is named "News"; `src/bench/news-open.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/bench/ui/news-open.mjs, src/bench/play.mjs, src/bench/data/controls.json, src/bench/news-open.test.ts
