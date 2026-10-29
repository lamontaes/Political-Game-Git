---
id: release-guards-reading-line
title: "Validate fails a PR body that asks the owner something without the reading line"
area: release
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/guards-reading-line
pr: #6502
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:00:04.395Z
---

**What.** The owner ruled that nobody asks him anything without first reading his rulings, and a question without the reading line is sent back. Today only a merger reading the body by hand catches a missing line, so questions already answered keep reaching him. This adds a guard that reads the pull request body and fails when its OWNER DECISIONS NEEDED section asks something without the reading line.

**Rules.** Look before you ask: a question for the owner ends with the reading line naming OWNER-DECISIONS, the register, the prior rulings and LAW, so the guard fails a section that is not none without it. One engine per mechanic: the check is one entry in the guard list run by the guards job.

**Done when.** scripts/guards/reading-line.mjs runs in the guards job on every pull request, reading the body live; its test passes a body with no section or one that says none and fails a question without the reading line; three current PR bodies were checked with the script and passed.

**Files.** scripts/guards/reading-line.mjs, scripts/guards/reading-line.test.ts, .github/workflows/validate.yml

**Notes.** TODO
