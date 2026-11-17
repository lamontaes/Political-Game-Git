---
id: release-instruction-files-fast-job
title: "A fast check runs the skill tests, American English and the pointer guard on every pull request that changes instructions or Markdown"
area: release
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/long-game-instruction-checks
pr: #9869
after:
blocked-on:
source: the CTO's must-hold checks for Long game, items 1 and 3, on issue 9747 (Nov 17, 2026, 05:22Z)
lead: speed
standard: 2
model: opus
effort: medium
root: none
claimed-at: 2026-11-17T05:50:00.000Z
---

**What.** A skills, rules or docs pull request merges without waiting for the thirty-minute guards job, and the unit job runs only changed test files, so nothing fast runs the skill tests, the American English guard or the pointer guard on it. On Nov 16 a British spelling in a skill reached main that way and turned every pull request red.
Seen: the CTO's 05:22Z comment on issue 9747.

**Cause.** Found in code: `.github/workflows/validate.yml` runs `npm run guards` in a thirty-minute job, and `npm run test:skill-ops` in no job; `tests/guards/current-pointers.test.ts` has no entry in `scripts/guards/index.ts`, so no job runs it.

**Fix.** Add `.github/workflows/instruction-checks.yml`: on every pull request, when the change touches `.agents/`, `.claude/`, `AGENTS.md`, `CLAUDE.md` or a Markdown file, or moves a path, it runs `npm run test:skill-ops`, `tests/guards/english/spelling-dates-units.test.ts` and `tests/guards/current-pointers.test.ts` in about a minute, in observe mode until the CTO sets `OBSERVE` to `"false"`. The player sees nothing; the CTO sees it on a pull request's checks list.

**Time box.** 1 hour.

**Rules.** American English everywhere: the job runs the spelling guard before a skills pull request merges.

**Done when.** A second session opens a scratch pull request that adds the word "colour" to a skill and reads the `instruction checks` job's summary naming the American English guard as failed, with the job passing while `OBSERVE` is "true".

**Waits on.** Nothing.

**Files.** .github/workflows/instruction-checks.yml, docs/design/guards.md

**Notes.** The pointer guard fails 2 of 7 on main at 5e809f49ff (#9760 holds its fix), so this job reports it as a warning until that lands.
