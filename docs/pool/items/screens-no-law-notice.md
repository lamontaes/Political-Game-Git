---
id: screens-no-law-notice
title: "The player card never says 'A law took effect' unless the law reaches the player and says how"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/no-law-notice
pr: #6400
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T20:42:37.436Z
---

**What.** The owner, Oct 27 4 PM sitting: "Why am I getting a notification that a law took effect?" The player card shows a bare 'A law took effect' line whenever any law in force changes. It names no law and no effect on the player. A law that reaches the player is already told by the law-takes-effect scene and its story.

**Rules.** An effect is a read, not a record: a notice that names no law and no effect on the player reads nothing the player can use, so it is removed; this is a game, not a spreadsheet, and the scene that cites the story carries it instead.

**Done when.** In a drawn place (name the place and seed), src/bench/law-notice.browser.mjs plays two weeks on a restarted bench, answering each stop, and asserts the card's line never reads 'law took effect'; the controls carry no such label.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/bench/law-notice.browser.mjs

**Notes.** From the CTO's relay of the owner's 4 PM ruling, Oct 27. lead: play-first.
