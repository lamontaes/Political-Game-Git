---
id: world-treasury-cut-moves-little
title: "A treasury pays what it holds, so a budget cut or an added line changes its payments by about 1% of its size"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The taxes family's money pass (laws lead's helper, Oct 25) ran West Virginia's balanced-budget rule in a played year (seed f58455b90eaa1e4f). The rule cut 13 of the state's budget lines, and the treasury paid less on every one, but by about 1% of each cut. For example, the administration line moved by -$1,124,781.11. The treasury then paid $419,547,203.83 with the act against $419,560,561.07 without (`journal:2025-02-01:1826`, measured). The helper's reading is that the treasury pays what it holds, not what its lines say (inferred, not traced).

**Rules.** An effect is a read: a budget line's amount is what the treasury reads when it pays. Ask why: name the cause by file and line.

**Done when.** A note here names, by file and line in `src/core2/budgets-treasury.ts`, why a cut line moves about 1% of its size; and either that is shown to be the right rule (a treasury short of cash pays a share), or the treasury pays each line what it holds for it, with a test that fails without the fix. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/budgets-treasury.ts

**Notes.** Filed by the laws lead, Oct 25.
