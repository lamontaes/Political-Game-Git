---
id: play-scene-due-behind-open-menu
title: "A scene that comes due while a menu is open is drawn under the menu, and the held clock looks like a stuck game"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude/blockers-scene-behind-card
pr:
after:
blocked-on:
lead: screens
model: fable
effort: medium
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("I think I'm stuck... I pressed escape"), crew list issue 9747 item 3b
checked:
---

**What.** The rail stays live while a day runs, so a player who opens a menu after pressing Day has the day's scene drawn under that menu. Day is held by the scene, the scene's Continue is covered, and nothing on screen says why. The owner pressed Escape and thought the game was stuck.
Seen: Morgan's Point Resort, Texas (seed 77755ec2-084d-49e2-bc03-0abf10a781d6), People open over the morning scene on the second day, in docs/seen/scene-closes-open-card/before-main.png.

**Cause.** Found in code: src/bench/play.mjs, `showStory` drew the talk and `act` drew a held stop without closing the open sheet, the person card or the news reader; only the Escape handler closed them, one per press.

**Fix.**

1. One closer, `closeCards` in src/bench/play.mjs, closes the person card, the news reader, a term's card and the open menu.
2. `showStory`, a held stop or election morning in `act`, and election night in `refresh` call it before they draw.
3. A new browser check, src/bench/scene-closes-open-card.browser.mjs, presses Day, opens People before the day lands, and plays days until a scene comes due.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the change adds no words to any screen and only closes panels.

**Done when.** A second session, in the running game on main at 1440x900, starts a new life in a drawn place it writes down with its seed, presses Day and at once opens People, and plays days until a scene comes due: the menu closes, the scene shows with its Continue on top, and Escape then opens Options over the scene and a second Escape leaves the scene there.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/scene-closes-open-card.browser.mjs (new)

**Notes.** Filed and built by the Blockers lane, Nov 16, on branch claude/blockers-scene-behind-card.
