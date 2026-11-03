---
id: core-drive-reinforced-from-unlearned-event
title: "A drive is reinforced from an event its person never learned, and the bench world crashes with validation on (Londonderry, Vermont)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With bookkeeping on (tests and the bench), the bench world for Londonderry, Vermont (5040150), drawn from run seed 8debd6359985db99f65c53d2477a3c135f906e316e584b9f3f88ad8dcbe579e0 with drawPlace(seed, 'filing-intro'), advanced a week at a time from January 20, 2025, throws 'Drive requires a learned source event and a finite strength.' on 2025-10-01 on main da7ec81210. The stack is state.ts updateDrive from drives.ts writeDrive, reinforce (line 390), respond (line 1018) and onEvent (line 1942): the drives engine reinforces a drive for a person from an event that person has no experienced knowledge of, or an event id that is not recorded. Play does not check, so a drive can form from something the person never lived through. Found by Lane 1 while checking the one-council-race branch, whose filing-intro test now advances weeks.

**Rules.** Ask why: a drive forms only from an event the person lived through, by record. Never weaken the check: the drives engine writes the experienced knowledge first or does not reinforce. One rule, all 56 places: proven on the Londonderry seed and fresh draws.

**Done when.** The Londonderry, Vermont world from run seed 8debd6359985db99f65c53d2477a3c135f906e316e584b9f3f88ad8dcbe579e0 advances 104 weeks with bookkeeping on without a throw; the PR names the event kind and person that crashed and the line that skipped their knowledge; a test reproduces the reinforce path and fails when the fix is undone.

**Files.** src/core2/modules/drives.ts

**Notes.** TODO
