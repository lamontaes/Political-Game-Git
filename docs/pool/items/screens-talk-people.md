---
id: screens-talk-people
title: "In a talk the speaker is on the card and the quiet people sit small at its top"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: screens lane (Nov 16)
pr:
blocked-on:
source: owner, Nov 16, crew line item 4f and his Desk answer on the scene speaker
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** In a talk every person stood in one band across the whole talk card, and the speaker was only a little larger than the rest. The owner asked for a shorter strip and a smaller quiet person. His words were "There's one person, shorten the strip" and "She should be smaller since she isn't talking", said on Nov 16.
Seen: the President's address in a new life, where one person got a band 676 wide on a card 680 wide.

**Cause.** Found in code: `src/bench/play.css` line 447, the `#talk-strip` rule, set `left: 0; right: 0`, so the band was always as wide as the card; and `drawTalkStrip` in `src/bench/play.mjs` put the speaker in the same row as everyone else.

**Fix.** Change `drawTalkStrip` in `src/bench/play.mjs` to put the speaker's bust on the talk card and everyone else in a band only as wide as they are, small and tight, per the owner's Desk answer of Nov 16. A speaker heard on television sits in a television's frame. The player sees it in every talk and address.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the full-width band and the larger-speaker rule are deleted in the same change. One rule, all 56 places: the talk card reads the same rule in every place.

**Done when.** A second session starts a new life in a drawn place, Yuba, Wisconsin (seed edcea1f0-5b8a-4ed2-88f4-06804f9edc00) or another, and at the Oval Office address sees the President's bust on the talk card and the two officials small and tight at the card's top; at the last beat one speaker has no band across the card.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html, src/bench/talk-people.browser.mjs, src/bench/opening-montage.browser.mjs

**Notes.** Crew line #9747, item 4f. People behind desks is not built here; it waits on the CTO's proof.
