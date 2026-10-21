---
id: release-declarations-5147-5264
title: "PRs #5147 and #5264 merged with no release declaration; the gate refuses their range"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/release-decl-5147
pr: #5354
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:52:52.434Z
---

**What.** Pull requests #5147 (early access checklist) and #5264 (the household contact pool item) merged to main with no declaration in docs/release/changes/, so the release gate refuses to publish the range they are in. Add both declarations in one PR, each with impact none, as #5126 did for #5123. Before the PR, check the latest finished Release run on main, because the recent runs on main are canceled by later pushes and none has finished.

**Rules.** Red main comes first (AGENTS.md, How every session works): a session that finds the release run on main red fixes it at the root on its own PR. Wire to the world: the declaration is what lets the release gate publish the change to the build.

**Done when.** After this merges, the Release run on main for the merge commit finishes with conclusion success, and its run id is named in the PR body; npm test -- tests/release passes locally before the PR is opened.

**Files.** docs/release/changes/early-access-checklist-no-work-notes.md, docs/release/changes/pool-household-contact-measured.md

**Notes.** Found Oct 19 by the acting CTO. The last three Release runs on main were canceled by newer pushes; check the newest finished one first.
