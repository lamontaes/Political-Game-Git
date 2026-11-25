---
id: screens-executive-page-fills-panel
title: "A town with only a mayor gets an Executive page panel that fits it, with no empty half and no empty Coming up"
area: play
kind: bug
priority: 2
size: S
status: done
standard: 2
claimed-by:
pr: #10409
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-25T00:44:40.050Z
seen-by: Replay
seen-at: 2026-11-25T01:09:28.427Z
---

**What.** The CTO, Nov 24 (comment 7131781243), caught that the Town of Alderson's Executive page has an empty right half with only the mayor on it. A town with no other officers to list has no right column, so the one column ran the whole width and its content sat in the left part.
Seen: Politics, Local, Executive in a town with only a mayor, at 1440 by 900. Seen: the same page in a panel that fits the mayor, after. Guards: executive-fits.browser.mjs

**Cause.** Measured: `node src/bench/executive-fits.browser.mjs` against `npm run bench` on main fails on a drawn lone-mayor place (the first version failed at Tatgua, Northern Mariana Islands). executiveView in src/bench/play.mjs puts the coming-up section under the chief and the other officers on the right; with no other officers the screen draws single in a sheet as wide as the window, and an empty calendar still prints a filler line.

**Fix.** In executiveView, leave the coming-up section out when nothing is scheduled; for a government page with only its main column, give the sheet the fits class so the panel is as wide as its content (the CTO's send-back of the first version, Nov 24); add executive-fits.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK says no dead space, so the panel fits its content and nothing is empty beside the mayor, and the CTO's Nov 24 rule leaves a section with nothing in it out. No hand-written player text: no label is added; a section is left out.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Local, Executive in a town with only a mayor and sees a panel only as wide as the mayor and what is coming up, with no Coming up when nothing is scheduled; executive-fits.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/executive-fits.browser.mjs (new)

**Notes.** Seen in the game (2026-11-25, Replay): Fananganan, Northern Mariana Islands, seed 4b926fd9-7716-47ce-8080-abbb2f2bd076, main abff6c6c08: Mayor-only town executive panel 683 pixels wide with only the mayor, no Coming up
