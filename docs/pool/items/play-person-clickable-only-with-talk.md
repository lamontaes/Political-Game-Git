---
id: play-person-clickable-only-with-talk
title: "A person in the room is clickable only when there is something to talk about"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: play-first/play-person-clickable-only-with-talk
pr: #7077
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: play-first
milestone: play-first
claimed-at: 2026-11-01T22:26:34.325Z
---

**What.** Owner, Nov 1 playtest of v0.73.0: "If there's no dialogue, you shouldn't be able to click on the person." After the talk following the address ended, clicking the housemate again replayed the same opening exchange. The owner's Oct 29 ruling made clicking a person start the talk, with no Talk button. The director already knows whether a talk has anything new to say for a person on a day; the room should read that and leave the figure unclickable when it has nothing.

**Rules.** An effect is a read, not a record: the room reads the director's answer for that person on that day, never its own list. Scene standard: a talk exists only when it can write something back. The lane owns src/bench and asks Words for the director's read (Review: words).

**Done when.** In a played world in a drawn place (named with seed), a person with nothing new to talk about shows no hover or click state and a click does nothing; a person with a talk does; a browser check asserts both on the opening night after the first talk ends.

**Time box.** 3 hours.

**You will see.** A person with nothing new to say can't be clicked; a person with something to say can.

**Screenshot.** The room after the first talk ends, hovering both people.

**Files.** src/bench/play.mjs, src/director/scene-talk.ts, src/bench/people.browser.mjs

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.
