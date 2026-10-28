---
id: golden-red-main-yeslevels
title: "Red main: the game does not start; group-a-bargaining imports yesLevels from a file that no longer exports it"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: golden/red-main-yeslevels
pr: #6507
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-28T03:15:18.117Z
---

**What.** Main fails to load: SyntaxError, the requested module group-a-records does not provide an export named yesLevels. The public-bargaining merge kept its import from group-a-records after the one-reader change moved yesLevels into the laws module. The bench, the desktop build and every test that loads the law reach fail at import, so nobody can play.

**Rules.** Look before you ask: the one-reader ruling (owner, Oct 27, one engine per mechanic) put yesLevels in the laws module, so the fix imports it from there and adds no second copy.

**Done when.** On the branch, the test of loading src/bench/handler.ts through node with tsx succeeds where main fails with the SyntaxError, the bench starts and serves /play, and typecheck passes; a drawn place loads in the bench.

**Time box.** 1 hour.

**You will see.** The game starts again: New game opens the creator and a town loads.

**Screenshot.** None needed: the bench starting is the evidence.

**Files.** src/core2/law-reach/group-a-bargaining.ts

**Notes.** TODO
