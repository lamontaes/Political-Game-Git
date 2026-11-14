---
id: tests-typecheck-covers-scripts-words
title: "Typecheck skips scripts/words, so a removed export broke words:composed unseen"
area: gov
lead: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, words:composed crash on the Train
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** `npm run words:composed -- --check` crashed on the Train because scripts/words/composed.ts imported `OPENING_EVENING_MINUTE`, which src/bench/opening.ts no longer exports (the address-airing carry replaced it with `openingArrivalMinute(core, playerId)`), and typecheck did not say so. Seen: the crash on the Train head and the import line in scripts/words/composed.ts.

**Cause.** Measured: with `grep -n "scripts/words" tsconfig.app.json tsconfig.node.json`, nothing matches, so no typecheck project includes scripts/words and `node --import tsx scripts/dev-lab/typecheck.ts` never reads those files; tsx strips types and only fails when the script runs.

**Fix.** Add `scripts/words/**/*.ts` to the include list of tsconfig.node.json, fix whatever errors the first typecheck then names in those scripts, and keep the include so a removed export fails typecheck for every PR.

**Time box.** 2 hours for one sonnet session.

**Rules.** No test is skipped or loosened; a script is fixed, not excluded.

**Done when.** In a drawn place run, `npm run typecheck` fails when a scratch import of a name src/bench/opening.ts does not export is added to scripts/words/composed.ts, and passes with it removed; a second session sees the typecheck pass on the train head.

**Waits on.** Nothing.

**Files.** tsconfig.node.json, scripts/words/composed.ts

**Notes.** The crash itself is fixed in the PR that files this. Filed by hand.
