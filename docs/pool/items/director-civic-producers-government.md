---
id: director-civic-producers-government
title: "Bill signing, veto, hearings, floor votes, recalls, scandals, appointments and a law reaching a person fire as scenes"
area: director
kind: wiring
priority: 1
size: M
status: claimed
claimed-by: claude/director-civic-producers-government
pr: #4600
blocked-on:
after: director-civic-roles
source: "director-civic-producers, found building it"
claimed-at: 2026-10-17T02:57:00.896Z
---

**What.** Bill signing, veto, hearings, floor votes, recalls, scandals, appointments and a law reaching a person fire as scenes. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/director-civic-producers-government, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/director-civic-producers-government.md and the files that pull request #4600 changes on claude/director-civic-producers-government

**Notes.** Needs director-civic-roles for the chair, members and press. Some of these records are decisions, not events, so the legislature may need to emit an event first, which belongs to the government area. Split out of director-civic-producers.

Sent back 2026-10-16 from PR #4600 (branch claude/director-civic-producers-government): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4600 (branch claude/director-civic-producers-government): Merging current main into claude/director-civic-producers-government conflicts in docs/pool/items/director-civic-producers-government-rest.md, src/director/civic-roles.ts, src/director/data/director.json. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4600 (branch claude/director-civic-producers-government): merging main conflicts in src/director/civic-roles.ts, src/director/data/director.json (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
