---
id: tooling-stopgaps-register-per-family
title: "The stopgap register is one folder of per-family files with one reader, so parallel PRs stop colliding on one 7,600-line file"
area: core
lead: fixer
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: "owner, Oct 28 20:20 UTC ruling ('The stopgap register is being split into per-family files to end those collisions'); asked for twice by the old-engine session and never filed (CTO, Oct 29)"
---

**What.** Every registered stopgap lives in one file, `src/core2/data/stopgaps.json` (627 entries, about 7,600 lines), so any two PRs that each register or resolve a stopgap conflict on it, and the family-batch PRs of Oct 28 spent hours merging main into each other over it. The owner's Oct 28 ruling records the split as under way, but nobody built it. Split the register into one file per family under `src/core2/data/stopgaps/` (by the entry's id prefix or its `file` folder: laws, elections, people, office, world, play and so on), keep the entry shape exactly as it is, and make `src/core2/stopgaps.ts` the one reader that loads the folder; every other reader (the tripwires, the outcome-web tests, the research table check) goes through it instead of importing the JSON.

**Time box.** 3 hours, Sonnet.

**Rules.** Every cut corner is a registered stopgap in the existing register, never a new tracking system (owner, Oct 28): this keeps the one register and only changes how it is stored. Replace, never layer: the single file is deleted in the same PR, with no copy left beside the folder. One engine per mechanic: one reader for the register, so no test or script parses the files on its own.

**Done when.** `src/core2/data/stopgaps.json` is gone and `src/core2/data/stopgaps/*.json` holds the same 627 entries (a test counts them and compares ids with the file on the base commit); `npm run typecheck`, the tripwires test, the outcome-web tests and `npm run guards` pass; a new test proves that adding an entry to one family file needs no change to any other file. The PR body names the files and the entry count per family.

**Files.** src/core2/data/stopgaps.json, src/core2/stopgaps.ts, src/core2/tooling/tripwires.ts, src/core2/outcome-web-unwired.test.ts, scripts/research/census-stopgap-tables-check.ts

**Notes.** Filed by the CTO, Oct 29, from the old-engine session's final block and the Oct 28 ruling. The director keeps its own register (`src/director/stopgaps.ts`); leave it. Read: OWNER-DECISIONS (Oct 28 20:20, Oct 29), DECISION-REGISTER; searched: stopgap register, per-family, stopgaps.json.
