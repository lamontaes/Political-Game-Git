---
id: dev-mode-ask-chair-to-hear-bill
title: "Dev mode can have a committee chair hear a bill, so a forced pass is not stopped unheard"
area: play
kind: feature
priority: 3
size: M
status: done
claimed-by:
pr: #7486
blocked-on:
after: laws-held-bill-keeps-chair-reasons
source: added with npm run pool -- add
---

**What.** In legislature.ts committeeStage the chair decides whether the bill is heard from their own position and temperament, and a held bill fails with no vote. In a dev-mode test of every body in one world, about a quarter of state chambers and both Congress chambers held a dev bill unheard, so Pass at a chosen margin could not finish. A game path is needed, such as the sponsor asking the chair for a hearing as a member would, that a dev control can drive.

**Rules.** No dice: the chair's position and traits decide, so the path is a request the chair weighs, never a forced hearing.

**Done when.** In a drawn place, a dev control has the sponsor ask the chair to hear the bill, the committee record shows heard true or the chair's recorded reasons for holding it, and a test names the place and seed.

**Files.** src/core2/modules/legislature.ts, src/bench/dev-mode.ts

**Notes.** TODO
