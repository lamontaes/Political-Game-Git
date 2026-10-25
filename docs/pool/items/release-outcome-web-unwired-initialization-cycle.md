---
id: release-outcome-web-unwired-initialization-cycle
title: "The unwired generator reads paidLeave before initialization"
area: release
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/law-reach-money-handlers-lazy
pr: #6054
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T17:33:39.821Z
---

**What.** The ordinary outcome-web unwired generator fails before writing its output on clean main 0c2f781daf. In the cloud on Node 24.19.0, node --import tsx scripts/outcome-web/write-unwired.ts reports Cannot access paidLeave before initialization at src/core2/law-reach/group-a.ts:48. The same error occurs on the main-integrated crime-family PR #5892, so it is a baseline failure.

**Rules.** Fix the real initialization dependency at the failing entry point without bypassing the matrix or weakening its checks. Preserve every existing canonical stopgap ID and separate this baseline defect from the unrelated crime-family change.

**Done when.** On Node 24 the ordinary write-unwired.ts command completes from clean main, its output agrees with the effect matrix, every existing canonical stopgap ID remains, and a meaningful entry-point regression catches the original initialization failure.

**Files.** scripts/outcome-web/write-unwired.ts,scripts/outcome-web/effect-matrix.ts,src/core2/law-reach/group-a.ts

**Notes.** Found by Merger 0 on Oct 25 reviewing #5892; reproduced separately on clean main and the PR. The initial pool add was safely refused because generated coverage was uncommitted; retried after committing that regeneration.
