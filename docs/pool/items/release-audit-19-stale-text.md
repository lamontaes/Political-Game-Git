---
id: release-audit-19-stale-text
title: "Fix the stale text the audit found (#5254, #5322, #5032, #5040, #5334, #5101)"
area: docs
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/pool-release-audit-19-stale-text
pr: #8575
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:39:50.360Z
standard: 2
model: sonnet
effort: low
root: none
lead: cto
after:
checked: fable 2026-11-10
---

**What.** The Oct 20 merge audit found stale text that is partly fixed: SG-CORE-territory-places is resolved and src/core2/territory-deposits.test.ts exists. What is left is the deleted file src/core2/tooling/build-place-lookup-data.ts, which a comment in .prettierignore, docs/design/old-core-retirement-map.md and docs/archive/2026-10-23/coordination/core.md still name, and the stopgap SG-WORLD-credit-island-deposits, whose island wording must be reread against the territory test. Skip the audit's pull-request-link and blocked-status edits where the item files already read right.

**Cause.** Found in code: `build-place-lookup-data.ts` is still named in .prettierignore (line 154) and in docs/design/old-core-retirement-map.md although the file is gone; the stopgap row SG-WORLD-credit-island-deposits in src/core2/data/stopgaps/world.json still carries its island text; src/core2/territory-deposits.test.ts exists and says American Samoa has no FDIC branch.

**Fix.** Remove the references to the deleted build-place-lookup-data.ts from .prettierignore and the live docs (leave history in docs/reports and pool Notes). Reread SG-WORLD-credit-island-deposits against src/core2/territory-deposits.test.ts and correct its text, or keep it with a reason.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: corrected text replaces the stale text in the same change, and no history is rewritten. Look before you ask: read the pool items before changing any status line.

**Done when.** A second session searches the repository outside docs/reports and pool Notes and finds no file that names build-place-lookup-data.ts, reads SG-WORLD-credit-island-deposits and finds its text matches what src/core2/territory-deposits.test.ts checks, and sees that test fail when an island place carries no county code, in a drawn place and seed named in the PR. The stopgap tripwire and the pool check pass.

**Waits on.** Nothing.

**Files.** .prettierignore, docs/design/old-core-retirement-map.md, docs/archive/2026-10-23/coordination/core.md, src/core2/data/stopgaps/world.json, src/core2/territory-deposits.test.ts

**Notes.** Item 19 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes. Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.
