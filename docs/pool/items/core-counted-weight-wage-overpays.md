---
id: core-counted-weight-wage-overpays
title: "x"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: added with npm run pool -- add
claimed-at:
lead: speed
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** Nothing is known about this item: it was released from an idle draft with the title "x" and no text. By its name it concerns a wage that is overpaid when counted households are read with their weight. Until someone can say which wage, in which place, by how much, it cannot be built.

**Cause.** Needs cause. Looked at: the item itself, which holds no information (title "x", every section TODO, released from idle draft #5180). Nothing names what is overpaid or where in the code.

**Fix.** None until the cause is found.

**Time box.** 1 hour for a Sonnet session: ask the CTO whether anyone remembers the case; if not, propose dropping it.

**Rules.** No dice. One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count, so a wage paid to a counted group is the person's wage times the count and no more.

**Done when.** Once the cause is found, a second session sees in a drawn place that a counted group's wage bill equals the wage times its count, by journal record id, and not more.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.
