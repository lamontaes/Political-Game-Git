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

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into core-played-game-saves-and-continues. This is a generic roadmap line ("a versioned save format; an old save loads and plays after an update") with no cause or fix, and the kept item asks for the same save and continue with concrete parts. The kept item now carries the clause that a save written under an older CORE_API_VERSION loads after an update (src/core2/saves.ts already records `coreApiVersion` and replays commands under a later version).
