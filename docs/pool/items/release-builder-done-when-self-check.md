---
id: release-builder-done-when-self-check
title: "Make builders and fixers check each acceptance line before opening a PR"
area: release
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Builders repeatedly submit changes without the played-world, named-row or test evidence their own items require. PR 5761 adds a self-check to the building and fixing workflows, an evidence table and negative-control check to the PR template, and the same evidence expectation to merger review. Keep the shared guide and mirrored skills consistent so the existing acceptance is checked before a PR reaches the merge queue.

**Rules.** Replace, never layer: replace the old one-line proof placeholder with the acceptance table and use the existing worker loop. Keep the mirrored instructions byte-identical and validate them with the focused skill-operations check; do not add a separate workflow or weaken any test.

**Done when.** A builder checks each done-when line's evidence before the PR
A test that passes both ways is caught by the builder
The PR carries the evidence where the merger reads it
Fixers and mergers use the same list
Shared docs agree

**Files.** .agents/skills/session-start/SKILL.md, .agents/skills/pr-fixer/SKILL.md, .agents/skills/merger/SKILL.md, .claude/skills/session-start/SKILL.md, .claude/skills/pr-fixer/SKILL.md, .claude/skills/merger/SKILL.md, .github/PULL_REQUEST_TEMPLATE.md, AGENTS.md, docs/pool/README.md

**Notes.** Tracking the existing CTO-authored PR 5761, whose body already contains the five acceptance rows above. Added during merger review because no pool item matched its PR, branch or title. The PR was opened by another session, not this merger.
