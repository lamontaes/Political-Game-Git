---
id: elections-accept-debate-from-menu
title: "A waiting debate invitation is accepted from the Elections or Campaign screen"
area: screens
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: medium
root: none
source: owner, Nov 17 (the cut of the unwritten scene kinds, #10011); Story's note on #9995
---

**What.** The debate invitation scene was the only way a player said yes to a debate. The cut of Nov 17 (#10011) deletes that scene with the other unwritten kinds, so a player can no longer accept a debate anywhere, and the debate goes on without them on the eve of the election.
Seen: #10011's debate-sitting test, which accepted through the deleted scene.

**Cause.** Design: the owner's ruling of Nov 17, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 17: delete everything the engine has not written) deletes the `debate-invite` kind; the yes it carried has no menu control yet.

**Fix.** The meetings engine exports `acceptDebate(api, debateId, candidateId, fromId)` (src/core2/modules/meetings.ts, #10011), which writes the `debate-accepted` record the director stages the sitting from. Add a bench route that calls it and an Accept control beside the waiting invitation on the race's Elections card or the Campaign tab (the decline path already exists), with the sitting's date on the Calendar. No new engine.

**Time box.** 3 hours, one Sonnet session at medium.

**Rules.** One engine per mechanic (the meetings engine's acceptance, called, not copied); screens follow the mocks (screen-to-mock); no hand-written player text in code.

**Done when.** A second session, in a drawn place on main, files, receives a debate invitation, presses Accept on the screen and sees the `debate-accepted` record in dev mode's trace and the sitting staged on its day; `src/director/debate-sitting.test.ts` accepts through the same route.

**Waits on.** #10011.

**Files.** src/bench/handler.ts, src/bench/play.mjs, src/core2/modules/meetings.ts

**Notes.**
