---
id: words-news-inauguration-story-reads-as-news
title: "The inauguration story is a news story: a true headline, a lede and a quote, with no sign-off"
area: words
kind: bug
priority: 2
size: M
status: done
claimed-by: words/inauguration-news
pr: #6368
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at: 2026-10-27T18:17:36.381Z
---

**What.** The News toast on Inauguration Day reads "Michael Tanner won the election." (the election was in November), and the story it opens is the whole address as a list of lines, including "I was in Pennsylvania." and a side column ending "Take care." A news story should read as a news story. The owner: "This isn't news." This item makes the story read as news: a headline true on January 20 (the swearing-in, naming the President by record), a lede with who, what and when, two or three sentences of context from the world's own numbers, at most one pulled quote from the address, and no sign-off or line that states only where the speaker was. The story is built from the same records the address uses.

**Rules.** Serves LAW.md §6, News (front-page stories; the game paints the story, MOCKS:37) and LAW.md §7, Words that ship (words come from the English engine; "Send finished work only," OD:367). No hand-written player text. Ask why: the headline and lede cite the inauguration record. This is a game, not a spreadsheet.

**Done when.** In a drawn place on the first evening, the news story's headline names the swearing-in with the President's record id, the body is a lede plus two or three sentences with at most one pulled quote from the address, no line is a sign-off or states only where someone was, and a test over the news packet (src/bench/story.ts) fails on a headline that claims an election win on inauguration day; shown by a screenshot of the story with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The first news story says the President was sworn in and reads like a short newspaper piece, not a copy of the speech.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/story.ts, src/director/opening-story.ts, src/english/english-opening-speech.ts, data/english/parts/headlines.json, data/english/parts/news.json, data/english/parts/opening-speech.json

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "This isn't news." How the story is drawn (the paper's front page, not a gray list) is play-stop-42-news-story-opens-as-the-paper. What the address itself says is play-first-09-opening-speech-per-world. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
