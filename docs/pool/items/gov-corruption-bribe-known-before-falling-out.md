---
id: gov-corruption-bribe-known-before-falling-out
title: "M3-09 red on main: a taken bribe is known to a third person before the two parties fall out"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/bribe-known-before-falling-out
pr: #6717
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T23:03:58.481Z
---

**What.** src/core2/corruption.test.ts case 'is known only to the two people, until one falls out with the other and tells someone' fails on clean main (d133f66564, Oct 28 22:10 UTC) on two random runs: 'expected [ ... ] to not include bribe:2021-01-01:person_085adb07b2ba6...' (and on the crime and justice branch with bribe:2021-01-01:person_788200dcd2d0f...). Before any falling-out, crimesKnownTo returns the taken bribe for an adult who is neither the offerer nor the official, among the first 50 others the test checks. It turns the golden-path M3-09 (accepted) red on every PR whose run reaches it (PR 6702 at 55648ae041, Dagsboro, Delaware). Found by the laws session.

**Rules.** Ask why: name by record who learned of the bribe and through which engine (crimesKnownTo's source: a leak, a record, a news story or a conversation) before changing the test or the engine. No dice. A crime surfaces only through records, a leak or someone who turns (M3-09).

**Done when.** src/core2/corruption.test.ts passes on three fresh runs on main, and the PR body names, by person id and record id, how the third person had learned of the bribe and the fix at file and line.

**Files.** src/core2/corruption.test.ts,src/core2/modules/corruption.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6717 merged (the done flip failed while branch protection refused the flip job's push).
