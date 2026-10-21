---
name: merge-audit
description: >
  Audits pull requests already merged into Our Civic Duty's main: fans the
  diffs out to read-only reviewers with a fixed checklist, verifies the bad
  findings, files the fixes and folds the lessons into the merger skill. Use
  after a merger runs unattended, after any merger or skill change, or when
  the owner asks whether merges are any good.
---

# Merge audit

1. **List the window:** every PR merged since a time T, with base branch, head branch and size (`gh api graphql` search `is:pr is:merged merged:>=T`). Leave out the CTO's own docs PRs.
2. **Fan out:** three or four Sonnet reviewers, 7 or 8 PRs each. They read only: `gh api repos/lamontaes/Political-Game-Git/pulls/N` and `.../pulls/N/files` (each file has a `patch`). Give each reviewer the checklist below verbatim. Ask for a table of PR, verdict (good, concerns, bad), reason and red flags with `file:line`, then the exact fix for every concerns or bad verdict.
3. **Checklist:**
   - Does the diff do what the title, body and release note claim? Check one count, date or list against the data.
   - Is it wired into play, or does nothing call it?
   - Tests narrowed, skipped, returning early, `>= 0`, looping over a set that can be empty, or pinned to one convenient seed.
   - Timeouts raised without a measured reason.
   - Done-when proof missing (the pool item names it).
   - Hand-written player text (`origin: authored` with `shippable: true`).
   - `src/core2` importing `src/simulation`.
   - Owner or date notes in code or data.
   - Pool sections pasted twice.
   - Places hard-coded in logic.
   - Stopgap rows deleted.
   - Dice in the core.
   - Research values without a quoted source, or with misleading tags.
   - A guard allowlist, ceiling or skip list changed to clear a red guard.
   - Deleted entries something still points at.
   - Player controls removed without saying where they went.
4. **Verify one claim per bad PR yourself** before acting. Reviewers can be wrong.
5. **File:**
   - Fixes owned by a running lead session go to that session.
   - Everything else goes into one pool item, `release-merge-audit-<date>-fixes`: area release, kind bug, priority 1, numbered fixes, Rules naming a standing rule, and Done-when naming the tests.
   - A defect on main that blocks others (a red test) is priority 1 on its own.
6. **Fix the cause:** add each new class of slip to "What went wrong before" in `merger`, in both `.agents/skills/merger/` and `.claude/skills/merger/`.
7. **Report:** counts of good, concerns and bad; the bad ones in plain words; and where each fix went.
