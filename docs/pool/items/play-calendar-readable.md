---
id: play-calendar-readable
title: "The calendar is an opaque, readable panel (#4300)"
area: play
kind: feature
priority: 2
status: done
claimed-by:
pr: #4300
blocked-on:
milestone:
source: "astra order 1; PR #4300 branch play/calendar-readable"
---

**What.** Merge main into the PR, finish the screen to the owner's mockup in docs/ui/mocks/screens-2026-10-14/, retake its full-window screenshot (1672x941).

**Rules.** Mockup caveats: ignore odd borders; no immersion-breaking labels on a person card; Issues shows the law in words with history on click; each newspaper its own layout; your office absent from Politics until you hold one; Day never opens a choice list. No hand-written player text; replace, never layer.

**Done when.** The screen shows the world's real records in words, no raw ids, no "undefined"; screenshot attached. The owner plays it: opens the menu and sees the mockup's look.

**Files.** src/bench/*, src/bench/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
