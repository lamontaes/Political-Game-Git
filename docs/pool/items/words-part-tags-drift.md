---
id: words-part-tags-drift
title: "478 bank parts carry tags their move rules no longer give, and nothing checks it, so the reach table groups some pieces wrongly"
area: words
kind: bug
priority: 3
size: M
lead: words
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: low
root: design-words-machine
checked: fable 2026-11-10
---

**What.** On main, node --import tsx scripts/english-corpus/tag-moves.ts --check reports 478 part tags that differ from the rules in scripts/english-corpus/moves.json, many of them moves with no rule at all (scene-talk state-tell-duty and the other filing-clerk moves among them). The reach table (src/english/grade-reach.ts) groups pieces by their tag's move, so a grade reaches the wrong family for those parts. The only check was the coverage-table test, which had not loaded on main for days and was deleted with the coverage report.

**Cause.** Measured: `node --import tsx scripts/english-corpus/tag-moves.ts --check` on main reports 478 part tags that differ from the rules in scripts/english-corpus/moves.json (the item's own count; not re-run in the redo), many of them moves with no rule at all; nothing in package.json or the tests runs the check, so anything that groups pieces by their move tag groups some wrongly. The reach table this item was written to protect was deleted with the odds (the words machine, pull request 8117).

**Fix.** Regenerate the tags with tag-moves.ts, add moves rules for the untagged moves, and run the check in a guard so drift fails.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Bank edits are never hand-merged: the tags are written by tag-moves.ts from the rules. A grade's reach changes only through the rules, named in the PR body.

**Done when.** A second session, not the builder, runs `node --import tsx scripts/english-corpus/tag-moves.ts --check` on main and sees it exit 0 (the check reads the banks, so no place is involved), sees the guard fail when one tag is changed by hand, and finds the PR body naming how many grade-reach groups changed with data/english/grade-reach.json regenerated.

**Waits on.** Nothing. The words machine's grade-reach work (words-machine-rules-from-the-owners-notes) should read the same tags.

**Files.** scripts/english-corpus/moves.json, scripts/english-corpus/tag-moves.ts, tests/guards/english

**Notes.** TODO

**Notes (pool redo, Nov 10, for the CTO).** The reach table is gone from main (pull request 8117 deleted `src/english/grade-reach.ts` and `data/english/grade-reach.json`). Before this is built, someone must name what still reads a part's move tag; if nothing does, this is a drop, replaced by `docs/design/words-machine.md`.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): its own pool-redo note asked whether anything still reads a part's move tag. On the train, the grade-reach table and its reader are both deleted, nothing under src, tests or package.json imports `scripts/english-corpus/tag-moves.ts` or `moves.json` (checked by search), and the only `tag` the director reads is a situation type's own `tag.key`, not a part's move tag. The tags are development tooling with no reader, so a part's drifted tag changes nothing the player sees.
