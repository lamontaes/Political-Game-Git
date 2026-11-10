---
id: play-news-reader-lead-without-text-crashes
title: "Clicking the first night's paper throws in readerBody and the reader never opens"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/pool-play-news-reader-lead-without-text-crashes
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
checked: fable 2026-11-10
claimed-at: 2026-11-10T22:57:29.099Z
branch: claude/pool-play-news-reader-lead-without-text-crashes
---

**What.** On a fresh life, after the President's address, the paper on the table opens nothing when clicked. The page throws TypeError: Cannot read properties of undefined (reading 'map') in `readerBody`, called by `openNewsReader`. The lead story the opening keeps has neither printed paragraphs nor a broadcast, so the reader maps an undefined list. It was found by continue-news.browser.mjs on a fresh bench once the browser checks played the address, and the same empty lead story shows on a played life in Kearny, New Jersey (world seed m1-news-2, start 2025-01-20, started with POST /api/newlife on the bench), where the old news check found 'the lead story has under two sentences'. A newspaper whose lead story prints no text is what the owner's Oct 27 newspaper ruling rules out.

**Cause.** Found in code: `readerBody` in src/bench/ui/newspaper.mjs (line 69) falls to `lead.broadcast.map` and `address.map` when `lead.paragraphs` is missing, and the opening's kept lead story can have neither; `openNewsReader` in src/bench/play.mjs (line 299) calls it. Seen on a fresh life after the address (src/bench/continue-news.browser.mjs) and in Kearny, New Jersey, seed m1-news-2.

**Fix.** Make the reader read whatever text the kept story holds, and make the opening always keep a lead story with text (or a worded reason it has none) so the paper opens on click. One reader, no second reader beside it.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: the first night's paper is a screen the owner opens in his first minute, and a click that does nothing reads as a broken game. Replace, never layer: the reader reads whatever text the kept story holds, with no second reader beside it. Estimate, never UNKNOWN: a lead story with nothing printed is a gap in the stories the paper is given, not an acceptable empty page.

**Done when.** A second session, on a fresh bench in three places drawn from all 56 (named with their seeds) and in Kearny, New Jersey with seed m1-news-2 and start date 2025-01-20, clicks the paper on the first night and sees the reader open with the lead story's text of at least two sentences, or a worded reason it has none; src/bench/continue-news.browser.mjs prints its pass line, and a screenshot at 1440x900 shows the open reader.

**Waits on.** Nothing.

**Files.** src/bench/ui/newspaper.mjs, src/bench/play.mjs, src/bench/continue-news.browser.mjs, src/bench/news-clicks.browser.mjs, src/bench/printed-news.browser.mjs

**Notes.** TODO

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 22:49 UTC) on branch claude/pool-play-news-reader-lead-without-text-crashes.
