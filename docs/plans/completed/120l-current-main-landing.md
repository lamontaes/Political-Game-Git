# 120L current-main landing

Authority: user-supplied 120L packet, mechanical landing only; 120A substantive
acceptance remains binding. Existing PR #120 stays open and unmerged.

- Workspace: `/private/tmp/pg-120l`, isolated clone with filesystem-cloned tracked
  files and filesystem-cloned dependencies; prior workspaces are read-only.
- Branch: `codex/92i-municipal-governance-implementation`.
- Starting live head: `25ef3fc319fb3c16b599f56818ef4ff9f429124e`.
- Accepted semantic head: `0224b8115276b899e81b40da60d5baed7a512c7a`.
- Main to merge: `b61abf26118e50be351c09db5b3d0823333fc9ec`.

## Plan

1. Normal merge of freshly fetched main; preserve both sides of append-only
   documentation conflicts. Stop on code/data/source semantic conflicts.
2. Prove preservation of the 14 existing PR-owned files, including the accepted
   municipal production gate; regenerate deterministic shared artifacts only
   where the combined tree requires it.
3. Run municipal tests, source validation/replay, full validation, art inventory
   and QA, and whitespace checks without changing tests, skips, or timeouts.
4. Re-fetch and verify both remote heads, commit and push to the existing PR,
   then verify exact-head CI and leave the PR unmerged.

## Acceptance

Mechanical reconciliation and local validation passed. Existing 120A substantive
acceptance remains intact; exact published-head CI is reported separately.
No new player-facing visual acceptance is claimed.

## Result and preservation proof

The normal merge of the stated main completed with zero conflicts. No manual
resolution or shared artifact regeneration was necessary. All 14 paths in
`git diff --name-only origin/main...25ef3fc319fb3c16b599f56818ef4ff9f429124e`
remain byte-identical to that starting head. Against accepted semantic head
`0224b8115276b899e81b40da60d5baed7a512c7a`, twelve entire files are identical;
the two shared acceptance/audit documents contain earlier main additions, while
their municipal sections remain exact. Those two files did not change in 120L.
This covers all five implementation files, the fixture, municipal tests, source
system documentation, three historical plans, manifest, and two shared documents.
The complete manifest, including the municipal production gate, is unchanged.

Architecture compatibility is confirmed by this blob proof and the merge diff:
the 19 imported paths are main's already accepted prose work; 120L adds only
this landing record. Source/simulation boundaries, UNKNOWN semantics, source
algebra, production gates and runtime ownership remain unchanged.

## Validation actually run

- Municipal suite: 33/33 passed.
- Source validation: 13 compiled domains, zero errors; existing gates preserved.
- Source replay: all tracked source artifacts regenerate byte-identically.
- Full `npm run validate`: passed format, lint, typecheck, 155 test files and
  2,766 tests, source validation/replay, production build, deterministic demo,
  and art validation. No tests, timeouts, skips or configuration were changed.
- Initial sandboxed full validation stopped on five localhost dev-server tests
  with `EPERM` on port binding (2,761 tests passed). The same full command passed
  outside that restriction, including all five tests.
- `npm run inventory:art`: 322 items, already current.
- `npm run qa:art`: contact sheet and report generated with no tracked delta.
- `git diff --check` and staged whitespace checks passed.
- Exact-head GitHub validation and browser CI are required after publication;
  the final response records their actual state and the published SHA.

## LEARN

For a mechanical landing, compare every PR-owned path with the live starting
head, then separately compare accepted domain blobs and sections with the
substantively audited head. Shared-document updates already present at the
starting head must not be misreported as new landing changes. The compact
proof above preserves that distinction without adding a new process rule.

Disk pressure prevented an ordinary full checkout. An isolated shared-object
clone with APFS-cloned tracked files preserved all prior workspaces; only this
new disposable checkout was repaired during setup. No other agent's files,
branch refs, stashes or worktree state were changed.
