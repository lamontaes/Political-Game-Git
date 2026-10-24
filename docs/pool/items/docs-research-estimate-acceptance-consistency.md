---
id: docs-research-estimate-acceptance-consistency
title: "Make research acceptance consistent with estimates retaining their stopgaps"
area: docs
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The researcher skill tells an ESTIMATED parameter to keep its estimated-parameter stopgap open until the figure is SOURCED. The same skill later tells every stopgap row to be resolved, and research umbrella items copy that unconditional resolution into Done when. PRs #5848, #5856, #5860 and #5864 consequently report useful estimates while explicitly failing that acceptance; align the instruction and item scopes so complete research can be reviewed without completing unfinished mechanics.

**Rules.** Estimate, never UNKNOWN: preserve accurate ESTIMATED tags, citations, spreads and their open registered stopgaps. Replace, never layer: write one consistent acceptance rule in both skill mirrors and affected pool items. Wire to the world: retain the required positive reader evidence and independent builder work for mechanics the research does not finish.

**Done when.** The researcher skill and its byte-identical mirror give one consistent rule for accepting sourced rows, estimated rows and mechanic-only work. Affected research items have written bounded Done-when evidence rows that can be completed while unresolved estimated-parameter or mechanic stopgaps remain tracked. No unsupported tag or resolution is introduced, and test:skill-ops plus changed-document checks pass.

**Files.** .agents/skills/researcher/SKILL.md, .claude/skills/researcher/SKILL.md, docs/pool/items/research-*.md

**Notes.** Merger 0 found the contradiction while reviewing the four named PRs on 2026-10-23 EDT. On cto/docs-fresh-2026-10-23, researcher/SKILL.md:64-65 says to leave an estimated-parameter stopgap open, while :74-75 and the paste prompt require resolution. This item does not complete any engine or waive generated-world proof.
