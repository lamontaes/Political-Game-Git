---
id: core-long-run-drive-formation-traces
title: "Every drive keeps a full trace of every reinforcement forever (Montpelier, Vermont: 154 MB of live heap after two years)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: memory/drive-traces
pr: #8029
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T08:20:38.049Z
---

**What.** Each held drive pushes a full FormationTrace (the event, every response considered, trait terms) every time a later event reinforces it (src/core2/modules/drives.ts, drive.formations.push). Play reads only formations[0] (counted drives' role and source facts, drives.ts countedDrives); every later trace is read only by tooling (src/core2/tooling/drives-proof.ts) and tests. Montpelier, Vermont (5046000, world seed mont1, fast-forward), year 2: 83,352 traces on 6,367 held drives; clearing them freed 154 MB of a 2,201 MB live heap, the largest single piece of history the world held.

**Rules.** Keep it simple (Oct 11): bookkeeping is a debug switch, so the extra traces are kept only with bookkeeping on. A cut changes no outcome: dev mode's records proof differs only in the drives runtime part.

**Done when.** In play a drive keeps only the trace of the response that formed it; with bookkeeping on it keeps all; a test shows both and the same drive strength either way; speed:year --seed mont1 --place 5046000 --years 2 records proof against main differs only in core2-drives-runtime.

**Files.** src/core2/modules/drives.ts, src/core2/drives.test.ts

**Notes.** TODO
