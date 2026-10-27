---
id: release-press-counted-town-query
title: "Release builds retain the counted-resident import needed by town stance"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6165
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Release run 40340740222 fails while building its exact candidate from main merge 73a69bbb899dab6e208ae114365200fdac6db541. Concurrent press changes left townStand calling countedResidents after main changed the import to countedResidentsOf. Restore the full-record query import for town stance while preserving the projected query used for audience counts, so the client builds and both population tiers keep contributing.

**Rules.** Red main comes first: repair the actual compile failure without skipping or loosening build checks. One model, two tiers: retain full and weighted counted adults and the exact individual lean after fill-in. Replace, never layer: reuse both existing queries without adding another population reader.

**Done when.** Reproduce press.ts TS2552 on clean main in the local typecheck. On the repaired tree, the build including typecheck and all scoped changed-file checks pass, with only explicitly reproduced main pool failures excepted. The existing press-town-stand test passes in a fresh drawn generated town with its seed named, verifying weighted counted influence and exact filled-person lean. Preserve the scoped audience query, publish a complete Done-when evidence table, and leave the ready repair PR for another merger.

**Files.** src/core2/modules/press.ts, src/core2/press-town-stand.test.ts, docs/release/changes/release-press-counted-town-query.md

**Notes.** Bounded repair for release-main-red. Merger 2 reproduced the clean-main missing-name error locally: exit2,606.86s,4037264KiB peak child RSS. The shared tracker remains separately claimed; this bounded item alone is the completion target.

Merger 2: Ready in PR #6165, own checked head93bf50847d1b55247f34d6f5588e7f82e72ddc61/tree7cd634e2deaab2293856974a71da10b3bf443d53. Full build and scoped checks PASS; fresh Asan-Maina Guam root31902f16cdb962a5 test PASS. Another merger must merge; never the author.

Sent back 2026-10-26 from PR #6165 (branch fix/main-red-2026-10-26-press-counted): Merger3 expected-head publication was rejected because Merger0 advanced the source to3c766036def7ec9a9dfa8077b2f8abf4bf682de2 during review; dropped without retry or merge. Own build and scoped gate passed on the identical tree6fcfae49919cd1dfca56336e1be3e2afdcb72737; the active Merger0 review must finish its own pinned merge.; finish on that branch, merge main into it first.

Merger 0: Completed 2026-10-26 by #6165 merge49bfe2f8b713eab81baf24b0a0f793eb86d8b3ce, checked/pinned3c766036def7ec9a9dfa8077b2f8abf4bf682de2. Own full build, scoped checks and Camden ME weighted-stance/fill-in test pass; all36 pool diagnostics identical to independently checked clean main. Exact TS2552 reproduced on clean main before fix. Requested done CLI succeeded and main done verified.
