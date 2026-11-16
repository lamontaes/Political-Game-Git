---
id: laws-budget-amendment-causes-grants-and-disasters
title: "A grant accepted or a disaster is a cause a body can amend its budget for"
area: laws
lead: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 16 (found building laws-local-budget-amendments-need-a-recorded-cause)"
checked:
---

**What.** A body that accepts a grant or sits through a disaster amends its adopted budget for it, as it does for receipts over plan. Seen: the council's line bills after a disaster name the disaster as their cause.

**Cause.** Found in code: `amendmentRoom` in src/core2/modules/budgets.ts reads only treasury receipts and aid inside the treasury months; a disaster record (townDisasters in src/core2/modules/disasters.ts) and a project grant (payProjectGrant in src/core2/modules/legislature.ts) are kept but no body reads them as a cause to amend a line.

**Fix.** Add the disaster and the accepted grant to amendmentRoom's causes: the damage and aid a disaster record carries raise the room for the lines it touches, and a grant paid through payProjectGrant carries its own line; no new record, no new engine.

**Time box.** 4 hours for one Opus session.

**Rules.** Standing rule wire-to-the-world: a disaster or grant changes a line through the one amendment path, shown by record id. Standing rule no-dice: the cause is a record in the world, never a chance.

**Done when.** At a drawn place with a disaster in its year a line bill names the disaster as its cause, and a second session sees it in the running game.

**Waits on.** laws-local-budget-amendments-need-a-recorded-cause (merged).

**Files.** src/core2/modules/budgets.ts, src/core2/modules/disasters.ts

**Notes.** Filed Nov 16 on the branch of PR 9652.
