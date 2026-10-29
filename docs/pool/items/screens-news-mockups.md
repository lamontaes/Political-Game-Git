---
id: screens-news-mockups
title: "News prints the newspaper mockups: engraved masthead with the paper's name, room photo on government stories"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/news-mockups
pr: #6487
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:10:13.001Z
---

**What.** The owner, Oct 28: 'pull the newspaper mockups... I don't understand why those aren't in the game.' The mockups on claude/people-rooms-art (art/newspaper-mockups) are not on the News front page or the evening reader.

**Rules.** No face on a photo may stand for an official, since it would not match the record (president-2 and governor-2 resemble real politicians and are excluded). One rule for all 56 places: no state's flag or seal. No hand-written player text.

**Done when.** News and the evening reader set the paper's name in an engraved masthead, a state or local government story leading the paper carries a room photo, every picture loads, shown by news.browser.mjs and before/after screenshots from a drawn place.

**Files.** art/newspaper-mockups, src/bench/handler.ts, src/bench/play.mjs, src/bench/play.css, src/bench/news.browser.mjs

**Notes.** TODO
