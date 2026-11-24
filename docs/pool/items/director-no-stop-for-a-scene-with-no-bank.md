---
id: director-no-stop-for-a-scene-with-no-bank
title: "The director schedules no stop for a scene that has no bank to play"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: director-a-waiting-scene-is-never-played
blocked-on:
lead: words
model: opus
effort: medium
root: rc2-done-from-records
source: "F5, Nov 14, 2026, from the stopped carry of #8282; filed on the #9046 carry branch"
checked:
---

**What.** The play clock stops the player for a moment the director rated high (`registerInterrupts`), and the stop is registered whether or not the scene that moment names has a bank of lines to play. A stop for a scene with no bank puts the player's clock on hold at a place where nothing is said. Seen: a stop on the player's clock, in a played world, with no scene played behind it.

**Cause.** Found in code: `registerInterrupts` in `src/director/ledger.ts` registers the module stop with `registerModuleStopV1` and sets `entry.stop` for every interrupting moment of an explicitly controlled person, and never asks whether the moment's scene type has bank pieces to cast. A scene type with no bank ships on its fallback and a gap line (`scene-pictures` and `scene-standard` rules), but the stop has already been taken.

**Fix.** Before `registerModuleStopV1`, read the moment's scene type against the English engine's banks (the same lookup the scene is played from) and register the stop only where a bank piece can play; a moment with no bank keeps its record and is told in the journal, with no stop. Debate and interview sittings are run first, because their stops are the ones #8282 found without a bank; the Words lead judges which scene types have no bank and whether the answer is a bank or the missing stop.

**Time box.** 2 hours for one session.

**Rules.** No hand-written player text; the check reads the banks, never a list of scene names in code. Words lead reviews (`Review: words`).

**Done when.** A second session plays a year on main in a drawn place, named with its seed, with stops on, and every stop of the player's clock in that year is followed by a scene played from a bank, listed by record id; a moment whose scene has no bank registers no stop and appears as a journal line.

**Waits on.** The Words lead's judgment of which scene types have no bank.

**Files.** src/director/ledger.ts, src/english, data/english/parts
