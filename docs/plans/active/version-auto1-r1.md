# VERSION-AUTO1-R1 repair plan

Status: active

## Authority and ownership

- Authority: `PATCHNOTES-VERSION1 — Steam-Style Patch Notes and Canonical Build Version UI — 2026-09-08`, Drive ID `1M2f2xxs4aqbLukJJ8ekMNWq0jItazS6t9v76KjaGv88`.
- Existing implementation: draft PR #136, remote branch `claude/version-auto1-release-tooling`, rejected head `f32c398ff62c0a0751417e51598d0105bd3f3d0f`.
- Repair workspace: isolated worktree `/private/tmp/pg-version-auto1-r1`, local branch `codex/version-auto1-r1`, publishing only to the existing PR branch.
- Reuse: keep the existing release planner, declaration parser, notes renderer, ledger, build-identity seam, candidate 0.3.0 reservation, replay/duplicate/revert/history behavior, and ordinary fast-forward race handling.
- Exclusions: no gameplay, UI, art, repository settings, secrets, activation, live release, merge, self-approval, or monitoring.

## Repair sequence

1. Synchronize current `main` into the existing PR implementation without discarding either side.
2. Enforce transition-aware declarations using a repository rollout marker and explicit base/head comparison, with a history-proven legacy branch exemption.
3. Validate all three canonical package/lock version locations and reject missing or malformed root metadata.
4. Replace sequential local mutation with a recoverable journaled transaction and adversarial failure injection after every write/delete.
5. Split the release workflow into a read-only builder that creates and validates one clean candidate commit and a minimal write-enabled publisher that executes no repository code and pushes only that unchanged verified commit.
6. Add focused regressions for all five audit findings while preserving the existing release suite.
7. Run focused tests, full `npm run validate`, required art commands, and exact-head CI; publish to the same draft PR only after re-fetching and verifying its remote head.
8. Complete a small LEARN pass, archive this plan, and report exact state and remaining activation requirements.
