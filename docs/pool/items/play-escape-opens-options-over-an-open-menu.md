---
id: play-escape-opens-options-over-an-open-menu
title: "Escape with a menu open puts Options over it and leaves the clock covered; the owner ruled it closes what is open"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/play-escape-closes-what-is-open
pr: #8818
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: lead's play walk as a seated official on Nov 11, 2026 (Deep River, Washington, seed 253225ee-ffc1-449c-b180-ec52013de651), then the code and the rulings
checked:
claimed-at: 2026-11-11T13:21:40.283Z
merged-at: 2026-11-11T14:39:31.085Z
---

**What.** A player with Politics, Money, Travel or any other menu open presses Escape to close it. The menu does not close: Options replaces it, and the clock and the Day button stay covered until the player finds the close button. On the walk above, Escape on the Politics menu left Options on screen and the next press of Day could not land. The owner ruled the key on Sept 20, 2026: "Escape dismisses the top applicable transient context and restores focus; when none is open, it opens the session menu." (docs/coordination/prior-rulings/screens.md, ruling 18). Seen: any menu in play at 1440x900, where one press of Escape closes it and shows the room and the clock again, and a second press opens Options.

**Cause.** Found in code: the key handler in src/bench/play.mjs (line 388) closes the open sheet only when it is Options or when the front screen is showing: `if (openTab === "options" || (openTab && !$("front").hidden)) closeSheet(); else if ($("front").hidden) openSheet("options");`. In play the front screen is hidden, so any other open menu falls to the second branch and Options opens over it. The comment above it ("Escape opens only options and quit") reads the ruling's second half and drops its first.

**Fix.**

1. In src/bench/play.mjs the handler closes the top thing that is open, in this order: a person's card, the news reader, a term's card, the open menu. Only when none is open, and the game is in play, does it open Options. One list in one handler; no screen adds its own key listener for this.
2. Focus goes back to the control that opened what was closed (the rail button for a menu), as the ruling says.
3. A talk or a scene is not a transient context: Escape during one opens Options, as today, and never skips a line or a choice.
4. The browser checks that press Escape with a menu open and then expect Options (src/bench/birthday.browser.mjs line 92, src/bench/budgets.browser.mjs line 72 and any other the search `"Escape"` over src/bench finds) are changed to what a player now does: one press closes the menu. The walk library's `closeMenu` in scripts/play-walks/lib.mjs goes back to pressing Escape once this is on main.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Look before you ask (owner, Oct 14): the key was ruled on Sept 20 and the ruling is built as written, with no new question. Replace, never layer (owner, Oct 14): the old branch of the handler and its comment are removed in the same change, not kept beside the new order. No hand-written player text in code: the change adds no words to any screen.

**Done when.** A second session, in the running game on main at 1440x900, starts a new life in a drawn place it writes down with its seed, opens each menu on the rail in turn and presses Escape once: each menu closes, the clock shows, and Day can be pressed. A second press opens Options and a third closes it. With a person's card open over a menu, the first press closes the card and the second the menu. During a talk, Escape opens Options and the talk is still there when Options closes. A browser check in src/bench plays the same presses and passes, and the checks named in the Fix pass.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/birthday.browser.mjs, src/bench/budgets.browser.mjs, src/bench/escape-closes-what-is-open.browser.mjs (new)

**Notes.** Written by the lead (Fable B), Nov 11, 10:52 UTC. Found when a walk script pressed Escape to close Politics and the next day could not be pressed. Before and after pictures at 1440x900 go under docs/seen/ in the pull request, with how fast the menu closes.
