---
id: words-part-tags-drift
title: "478 bank parts carry tags their move rules no longer give, and nothing checks it, so the reach table groups some pieces wrongly"
area: words
kind: bug
priority: 3
size: M
lead: words
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main, node --import tsx scripts/english-corpus/tag-moves.ts --check reports 478 part tags that differ from the rules in scripts/english-corpus/moves.json, many of them moves with no rule at all (scene-talk state-tell-duty and the other filing-clerk moves among them). The reach table (src/english/grade-reach.ts) groups pieces by their tag's move, so a grade reaches the wrong family for those parts. The only check was the coverage-table test, which had not loaded on main for days and was deleted with the coverage report.

**Rules.** Bank edits are never hand-merged: the tags are written by tag-moves.ts from the rules. A grade's reach changes only through the rules, named in the PR body.

**Done when.** tag-moves.ts --check exits 0 on main, a test or guard runs it so drift fails CI, and the PR body names how many grade-reach groups changed with grade-reach.json regenerated.

**Files.** scripts/english-corpus/moves.json, scripts/english-corpus/tag-moves.ts, data/english/parts, data/english/grade-reach.json

**Notes.** TODO
