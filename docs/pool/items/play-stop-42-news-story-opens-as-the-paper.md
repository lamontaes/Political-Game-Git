---
id: play-stop-42-news-story-opens-as-the-paper
title: "A news story opens as the paper's front page, not a gray list of lines"
area: play
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #6222
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** Clicking the News toast in v0.34.0 opens a gray see-through overlay titled with the headline and holding the whole address as a bare list of lines, with a side column under it. The owner: "this is just a big gray screen with absolutely nothing on it. This isn't news." The ruling is that News opens as a front page with a layout per outlet (old broadsheet, modern daily, tabloid, town weekly), each with its own masthead and fonts. The paper layouts and masthead art already exist (paper-masthead styles in src/bench/play.css; art/ui-kit13/news/masthead-*.png), but the toast's reader (#news-reader in src/bench/play.html) does not use them. This item draws the story the toast opens in its outlet's front-page layout.

**Rules.** Serves LAW.md §6, News ("The owner loved the front page idea and wants many looks," MOCKS:37; each outlet gets its own layout, REG:141). This is a game, not a spreadsheet. Replace, never layer: the plain reader is replaced by the paper layout, not kept as a second way to read a story. The text of the inauguration story is words-news-inauguration-story-reads-as-news.

**Done when.** In a drawn place on the first evening, clicking the news toast opens the story in one of the four paper layouts chosen by its outlet, with the masthead and a headline, and no bare line list; src/bench/news.browser.mjs asserts a paper masthead inside the story reader and fails on main, shown by a screenshot beside docs/ui/mocks/screens-2026-10-14/shots/news.png.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Clicking the news toast opens a newspaper front page for that story, with the paper's name across the top.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html, src/bench/news.browser.mjs, art/ui-kit13/news

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "this is just a big gray screen with absolutely nothing on it. This isn't news." The reader was see-through at v0.34.0; the opaque panel (play-stop-17) merged after that build, so re-check on the next build. Related and open: play-stop-02-developer-text-on-play-screens-a (plain News words). Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Sent back 2026-10-27 from PR #6222 (branch play-first/play-stop-42-news-story-opens-as-the-paper): its new #news-reader adds a second .paper-masthead h2 so news.browser.mjs:115 fails (strict mode); finish on that branch, merge main into it first.
