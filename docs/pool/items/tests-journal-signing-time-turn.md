---
id: tests-journal-signing-time-turn
title: "journal-signing reads the mayor's act after the journal's time turn"
area: words
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: 8277
blocked-on:
lead: words
source: CTO, Nov 10 5:48 p.m. (step 3); red on clean main in Beecher, Illinois, seed 6cfdf841317fd6e64d805ea8e76ba50dc930894d
---

**What.** `src/director/journal-signing.test.ts` fails on clean main because the journal now opens a line with the time since the one before (#8118, #8129): "Nine months on, I signed Ordinance 2025-1, the Free Fares for Riders Ordinance." The test's patterns expect the line to start with "I signed" or "I vetoed", and the sponsor's check that their line is not their own act also read only the line's start. The journal's line is right; the test reads the act after a leading time turn.

**Rules.** The test keeps every claim it made (the mayor tells their own act, a veto the council overrode says so, the sponsor's line never says "I"); only the leading time turn is set aside.

**Done when.** journal-signing passes on the Beecher seed and fails there without the change.

**Time box.** 1 hour for one session.

**Files.** src/director/journal-signing.test.ts
