---
id: creator-selected-button-lit-fill
title: "The creator's picked button is a thin outline, not the approved lit brass fill"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pt-carryover-n16-13
pr: #10308
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N16-13)
merged-at: 2026-11-24T05:06:43.022Z
---

**What.** The owner, Nov 16: "I'm not sure if this border is what I approved" (the creator). In a played creator the picked gender button (Female) is a dark button with a thin light outline, while the Everyday tab beside it is a lit brass fill. MENU-LOOK says a picked button is a lit brass fill.
Seen: Nov 23, a drawn place, creator at 1440x900.

**Cause.** Found in code: the rule `.action[aria-pressed="true"]` (a CSS rule, about line 1260 in src/bench/play.css) set only `border-color: var(--gold)`, under a comment that says "A picked button is a lit brass fill". The fill was never written for plain buttons; only `#cr-rows .look-tabs .tab.on` had it.

**Fix.** Give a pressed `.action` the same lit brass fill the creator's tabs use. No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the fix applies to every pressed `.action` button in the one shared control look, not only the creator, and adds no one-off renderer or player text.

**Done when.** In a played creator the picked gender button is a lit brass fill like the Everyday tab, in a drawn place at 1440x900, shown in a before and after picture. A second session starts a new game, picks Female in the creator in the running game, and sees the Female button lit brass like the Everyday tab.

**Waits on.** Nothing.

**Files.** src/bench/play.css

**Notes.**
