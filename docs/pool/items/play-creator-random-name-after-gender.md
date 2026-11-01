---
id: play-creator-random-name-after-gender
title: "The creator's random name works only after the player chooses a gender"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: play-first
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0: "Randomized name shouldn't work until you choose a gender." Today the creator's random-name control draws a name before a gender is chosen, so the name can belong to the other gender. A name is drawn from the place's name tables for the chosen gender, so the draw needs the gender first. The control stays disabled, with its label saying why, until a gender is picked.

**Rules.** This is a game, not a spreadsheet: the creator follows what a player expects, and the owner named this by hand. No hand-written player text: the disabled control's label comes from the English engine's banks. The lane owns src/bench (play-first LAW).

**Done when.** In the built bench, a New Game shows the random-name control disabled until a gender is chosen, then it draws a name for that gender; a browser check presses it before and after choosing and asserts both, with screenshots at 1440x900.

**Time box.** 2 hours.

**You will see.** The random-name button waits until you choose a gender, then gives a name that fits it.

**Screenshot.** The creator before and after choosing a gender.

**Files.** src/bench/creator.ts, src/bench/play.mjs, src/bench/creator.browser.mjs

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.
