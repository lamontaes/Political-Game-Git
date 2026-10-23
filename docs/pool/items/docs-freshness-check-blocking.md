---
id: docs-freshness-check-blocking
title: "Make the docs freshness check block release:check once it runs clean"
area: docs
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
after: docs-stale-2026-10-23-leftovers
blocked-on:
source: "owner, Oct 23: stop the stale docs; .agents/skills/doc-freshness/SKILL.md"
---

**What.** `npm run release:check` runs `node scripts/docs/freshness.mjs --report` first, so every release check prints the stale-doc table without failing. Once `node scripts/docs/freshness.mjs` exits 0 on main (the leftovers item done and no new flags), drop `--report` from the `release:check` script in `package.json` so a doc that names a deleted path, states a replaced rule or has no fresh header blocks the check. Until that first clean run the check stays a report, because 65 docs were still flagged on Oct 23. Update the "The check" section of `.agents/skills/doc-freshness/SKILL.md` and its `.claude/skills/` mirror to say the check now blocks.

**Rules.** Replace, never layer: the report-only call is replaced by the blocking call in the same change, not kept beside it. Look before you ask: the scope and banned phrases come from `scripts/docs/freshness.json` and the rulings in `docs/coordination/OWNER-DECISIONS.md`, not from new guesses.

**Done when.** `node scripts/docs/freshness.mjs` exits 0 on main and its run is pasted in the PR body; `package.json` runs it without `--report` inside `release:check`; a test run with one doc's header removed makes `npm run release:check -- --mode pr` fail, shown in the PR body; the skill and its mirror say the check blocks and `npm run test:skill-ops` passes.

**Files.** package.json, scripts/docs/freshness.mjs, scripts/docs/freshness.json, .agents/skills/doc-freshness/SKILL.md, .claude/skills/doc-freshness/SKILL.md

**Notes.** Added Oct 23 by the documentation audit (the PR that added the check and the doc-freshness skill).
