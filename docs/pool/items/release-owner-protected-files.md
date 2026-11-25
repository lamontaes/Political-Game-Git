---
id: release-owner-protected-files
title: "The code owners file covers the instructions, the workflows, the guards and the baselines"
area: release
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/long-game-owner-files
pr: #9875
after:
blocked-on:
source: the CTO's must-hold checks for Long game, item 5, on issue 9747 (Nov 17, 2026, 05:22Z)
lead: speed
standard: 2
model: opus
effort: medium
root: none
claimed-at: 2026-11-17T06:30:00.000Z
---

**What.** A change to AGENTS.md, CLAUDE.md, a skill, a workflow, a guard or a baseline asks no one to review it, so a session can change the rules or checks that judge it with no reviewer named.
Seen: the CTO's 05:22Z comment on issue 9747.

**Cause.** Found in code: `codeowners` in `scripts/guards/codeowners.ts` writes `.github/CODEOWNERS` only from the engine families in `tests/guards/families.json`, which cover source files under `src/`; nothing names the instruction files, the workflows, the guards or the baselines.

**Fix.** A `protected` list in `tests/guards/families.json`, written by `codeowners` as the last block of `.github/CODEOWNERS` so it wins over any family line: AGENTS.md, CLAUDE.md, `.agents/**`, `.claude/**`, `.github/workflows/**`, `.github/CODEOWNERS`, `tests/guards/**`, `scripts/guards/**` and the baseline and ceiling files. The review becomes required only when main's branch rule requires code-owner review, a repository setting. The player sees nothing.

**Time box.** 1 hour.

**Rules.** None of the standing rules apply; this is the crew's process.

**Done when.** A second session opens a scratch pull request that changes one line of AGENTS.md and sees GitHub request the owner's review on it, naming `.github/CODEOWNERS`. No place is drawn: the check reads files, not a played world.

**Waits on.** Nothing.

**Files.** scripts/guards/codeowners.ts, tests/guards/families.json, tests/guards/families.test.ts, .github/CODEOWNERS

**Notes.** Every session pushes as the owner's account, and GitHub does not let an author approve their own pull request. A required code-owner review would hold every such pull request until the owner, or an admin bypass, merges it. That is the owner's setting to choose.
