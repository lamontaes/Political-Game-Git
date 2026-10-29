---
id: release-guards-one-english
title: "One English guard family: American English, place and presence, and developer text in player strings"
area: release
kind: cleanup
priority: 1
size: M
status: in-pr
claimed-by: claude/guards-one-english
pr: #6498
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:52:45.460Z
---

**What.** The English rules are held by four separate checks with three copies of the British word list: a changed-files-only test with its own list, a whole-tree spelling sweep, a content-file idiom test and a wording ratchet that also lists British words. The place-and-presence ban sits apart, and nothing checks player strings for ISO dates or raw record ids. The owner asked to completely guard the game, with nothing duplicated and easy to update.

**Rules.** Replace, never layer: the copies are deleted and every check reads the one engine in scripts/prose-eval. No hand-written player text in code: a player string never carries an ISO date or a raw record id, and the known offenders only shrink.

**Done when.** tests/guards/english/ holds vocabulary, spelling-dates-units, place-and-presence and player-text tests reading one engine and one allowlist (tests/guards/english/allowlist.ts) whose counts only shrink; the old test files and the British list in scripts/english-check/wording.ts are deleted; the test run passes and fails when a known count is raised or lowered.

**Files.** tests/guards/english/, scripts/prose-eval/british-idiom.mjs, scripts/english-check/wording.ts

**Notes.** TODO
