---
id: play-government-state-seat-key
title: "The Government screen prints a state's seats under its key (US-KS) instead of the state's name"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/government-state-seat-key
pr: #4946
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:38:15.629Z
---

**What.** A state executive office's government name was the state's key (`US-KS`), so the Government screen printed the key. State executive offices, and a legislative chamber with no name of its own, now carry the state's name from the place identities.

**Rules.** Replace, never layer: fixed where the office is made.

**Done when.** In a played world in a drawn place, no state-level seat's government reads as a key (`src/core2/offices-local-names.test.ts`).

**Files.** src/core2/offices-state.ts

**Notes.** Stacked on play-government-screen-capitals (#4945).
