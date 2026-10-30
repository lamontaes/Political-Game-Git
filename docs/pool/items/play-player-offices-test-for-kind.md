---
id: play-player-offices-test-for-kind
title: "The player-offices test checks through playerMayFileFor, and redraws a place that files nothing outside"
area: play
lead: play-first
kind: cleanup
priority: 3
size: S
status: in-pr
claimed-by: play-first/player-offices-test-for-kind
pr: #0
blocked-on:
milestone: play-first
source: Governing lead, Oct 30 (#6854 merged; its onlyWhereNo rows made the test's prefix-only allowed() check less)
claimed-at: 2026-10-30T04:15:00.000Z
---

**What.** `src/bench/player-offices.test.ts` called the county board allowed everywhere because `allowed()` matched prefixes only. It now uses `playerMayFileFor` (the one reader) for what the player may and may not file for, keeps the listed-prefix check as a sanity bound, and redraws a place whose world files nothing outside the player's offices in two years (Auasi, American Samoa, seed 022a2b36230ebb45 failed on main this way). The "six offices" comment at `government.ts` names the data instead of a count.

**Rules.** One engine per mechanic: the test reads the one filing reader instead of a copy of its rule; Replace, never layer: the prefix-only helper is replaced.

**Done when.** The test passes on a random draw and on seed 022a2b36230ebb45, naming each redrawn place.

**Time box.** 1 hour, Sonnet.

**You will see.** Nothing; the test checks the rule the game uses.

**Screenshot.** None; no screen changes.

**Files.** src/bench/player-offices.test.ts, src/bench/government.ts

**Notes.** From the governing lead's message after #6854 merged.
