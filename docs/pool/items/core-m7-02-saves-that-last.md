---
id: core-m7-02-saves-that-last
title: "M7-02 Saves that last"
area: core
kind: feature
priority: 3
size: L
status: blocked
claimed-by:
pr:
blocked-on: not scheduled: a roadmap milestone at priority 3 until the weekly reschedule (AGENTS.md: saves and release work wait for early-access preparation); an L item is split by whoever claims it once scheduled
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-02"
claimed-at:
---

**What.** A versioned save format; a save can always continue, and updates don't break it. (Owner: OPUS-CORE.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** An old save loads and plays after an update.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Checked Oct 20 (claude, claude/political-game-pool-76ksvw): M7-02's own command (`scripts/core2-year/saves.mjs`) runs and all four checks pass, seed b41051e99299ea7b9ccb6d0853d89531: a save loads to the same world (3 commands replayed to 2025-02-17); a save from an older build (core2-api-v1) loads through the upgrade path, skipping a retired command; it keeps playing with every dollar balanced (to 2025-03-19); and its next save loads under this build. Note the dates: the script plays a world that opens in 2025, not on the current single start date, so it is not the world a new game opens today. Not checked: the desktop's own saves (portable save export and the browser store, `desktop/scripts/save-integrity-test.mjs`), and the save size budget. `passes` is the CTO's to set.
