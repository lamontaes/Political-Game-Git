---
id: release-guards-doc
title: "The guards page lists every guard, the merger and local-gate skills point at it, and two seeds differ joins the guards"
area: release
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/guards-doc
pr: #6520
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T04:01:33.370Z
---

**What.** The guards are now one list run on every pull request, but the page that explains them lists only the first twelve, the skills do not point at it, and the two-seed realistic-not-real test is not in the list. A doc that falls behind its guards points sessions at the wrong place. The owner asked for the guards to be timeless and easy to update.

**Rules.** Replace, never layer: the page is the one description of the guards, and a test fails when a guard has no row or a row has no guard, so the page can never drift. No dates in a guard's name, message or the page: a rule's date lives in OWNER-DECISIONS.

**Done when.** docs/design/guards.md has a row for every guard in scripts/guards/index.ts and scripts/guards/guards.test.ts fails when one is missing; the merger skill (both mirrors) and the local-gate standing skill name npm run guards and the page; test:skill-ops runs; npm run guards passes all sixteen guards on the branch merged with main.

**Files.** docs/design/guards.md, scripts/guards/index.ts, .agents/skills/merger/SKILL.md, .agents/rules/standing-skills/local-gate/SKILL.md

**Notes.** TODO
