---
id: world-treasury-cut-moves-little
title: "A treasury pays what it holds, so a budget cut or an added line changes its payments by about 1% of its size"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/treasury-cut
pr: #6330
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T13:50:59.399Z
---

**What.** The taxes family's money pass (laws lead's helper, Oct 25) ran West Virginia's balanced-budget rule in a played year (seed f58455b90eaa1e4f). The rule cut 13 of the state's budget lines, and the treasury paid less on every one, but by about 1% of each cut. For example, the administration line moved by -$1,124,781.11. The treasury then paid $419,547,203.83 with the act against $419,560,561.07 without (`journal:2025-02-01:1826`, measured). The helper's reading is that the treasury pays what it holds, not what its lines say (inferred, not traced).

**Rules.** An effect is a read: a budget line's amount is what the treasury reads when it pays. Ask why: name the cause by file and line.

**Done when.** A note here names, by file and line in `src/core2/budgets-treasury.ts`, why a cut line moves about 1% of its size; and either that is shown to be the right rule (a treasury short of cash pays a share), or the treasury pays each line what it holds for it, with a test that fails without the fix. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/budgets-treasury.ts

**Notes.** Filed by the laws lead, Oct 25.

Worker note (Claude, Oct 27): the rule is right; it is a cash limit. `closeTreasuries` (src/core2/budgets-treasury.ts) pays each line `Math.floor(due * scale)` with `scale = min(1, have / need)` (the line `const scale = need > 0 ? Math.min(1, Math.max(0, have) / need) : 1`) and `partial: true` transfers, and carries the unpaid part as `shortMinor` arrears. West Virginia (Accoville, 5400196, seed f58455b90eaa1e4f, first close 2025-02-01): dues 169.6 billion against what the treasury held (about 165.0 billion paid), 4.6 billion carried short. Cutting the administration line in half (-4.29 billion a month due) left the month's total paid at 164.96 billion against 164.96 billion (-0.001%), because the treasury still held the same cash; the cut line paid 8.34 billion falling to 4.28 billion, the other lines rose to take the room, and the arrears fell from 4.62 billion to 0.34 billion. So a cut in a cash-short treasury shows as smaller arrears, not smaller total spending; the 1% the helper saw is the part of the cut not re-absorbed. Test: src/core2/treasury-cut-cash-limited.test.ts.
