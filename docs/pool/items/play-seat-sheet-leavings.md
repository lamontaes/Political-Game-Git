---
id: play-seat-sheet-leavings
title: "The seat sheet lists seats the law made you leave and names each bill section"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by:
pr: #4780
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The seat sheet on the Politics screen shows the bodies a person sits on and their bills, but not the seats the law made them leave when they took another office, nor the name of each section of a bill. Read the offices engine's incompatibility record and list each leaving as the seat left, the seat taken, the date and the law that required it. Name each bill section by the bill title's subjects, so a budget line reads by its own name.

**Rules.** An effect is a read, not a record: the sheet shows records the offices engine and the bill title wrote and spends no game time. No hand-written player text: every label is a control name and every sentence comes from the English engine. Replace, never layer: the old section label that printed a raw line id is deleted.

**Done when.** A bench test in src/bench/seat-leavings.test.ts builds the played world in a drawn place (buildBenchWorld, seed named in the PR body), has the President accept a Senate seat, and finds the incompatibility record id with the law's citation in the seat view.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/seat-leavings.test.ts

**Notes.** Split out of PR #4608 (the Government change) because the seat sheet is Play-owned; it needs the offices engine's incompatibility record from that PR.

Sent back 2026-10-16 from PR #4780 (branch claude/play-seat-sheet-leavings): Merging current main into claude/play-seat-sheet-leavings conflicts in src/bench/legislature.ts, src/core2/modules/officials.ts, src/core2/modules/voting.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4780 (branch claude/play-seat-sheet-leavings): eslint unused lowerFirst (see the comment on the PR); finish on that branch, merge main into it first.
