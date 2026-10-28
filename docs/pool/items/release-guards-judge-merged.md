---
id: release-guards-judge-merged
title: "The guards job judges each pull request merged into main, not its old head"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/guards-judge-merged
pr: #6513
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:33:17.657Z
---

**What.** The guards job checks out the pull request's head, like the other jobs. A branch cut before the guards existed has no guards script, so every older open pull request fails the guards check with Missing script guards until main is merged into it. The red says nothing about the rules and hides real failures among about 180 open pull requests.

**Rules.** One engine per mechanic: the guards are one list on main, and every pull request is judged by that list, so the job reads the merge of the pull request into main. Replace, never layer: the job's checkout changes; no second job or skip is added.

**Done when.** In .github/workflows/validate.yml the guards job checks out github.sha, the merge commit, while the other jobs keep the head; tests/release/validate-workflow.test.ts asserts both, and the test run passes; a pull request from a branch older than the guards shows a real guards verdict.

**Files.** .github/workflows/validate.yml, tests/release/validate-workflow.test.ts

**Notes.** TODO
