---
id: release-main-red-m0-03-held-meeting
title: "Golden-path M0-03 never finishes when the drawn character sits on a small board: its clock loop answers a held meeting with Continue forever"
area: release
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-m0-03-held-meeting
pr:
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (merger sonnet-6dbb; CTO on #8928 at 21:15Z)
---

**What.** Golden-path M0-03 (`node --import tsx src/bench/m0-check.ts M0-03`) times out after about 450 s on clean main in Spanish Fort, Alabama (place 0171976, GOLDEN_PATH_SEED=4fdc6e71e19c9e85e75c5b59fddc23fd9f946621c3564639a3df6dab1d870001). It is not slow: its first loop gets the same stop more than 400 times, the county board's meeting of 2025-01-28 at 9:00 (`meeting:office:gus2025:160514:board:2025-01-28`). Guards: the check that a skip stops at the first thing that needs the player runs in every drawn place again.

**Cause.** Found in code: since #8807 a meeting holds a character who sits on a small board until the meeting is adjourned (`holdPlayerIfDue` in src/core2/modules/office-day.ts registers the stop with `hold: true`, released only by `adjourn`). The M0-03 loop in src/bench/m0-check.ts answers every stop with a plain resume and never answers the hold, so the clock returns to the same stop forever. M0-02 in the same file already answers holds with `leaveHoldsToCharacter` (src/bench/office.ts).

**Fix.** The M0-03 loop answers a held stop the way M0-02 does (`leaveHoldsToCharacter`: the agenda voted by the character's own choice and the meeting adjourned) and is bounded, failing by name if the clock never reaches its date. No assertion is changed.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps drawing its place and character and answers whatever holds the clock there. No assertion is loosened, and no timeout raised.

**Done when.** A second session runs `node --import tsx src/bench/m0-check.ts M0-03` on main in the drawn place it names, at GOLDEN_PATH_SEED=4fdc6e71e19c9e85e75c5b59fddc23fd9f946621c3564639a3df6dab1d870001 with GOLDEN_PATH_PLACE_KEY=0171976 and at a fresh seed, and it passes in well under its budget.

**Waits on.** Nothing.

**Files.** src/bench/m0-check.ts
