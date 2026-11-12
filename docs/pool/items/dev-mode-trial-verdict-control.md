---
id: dev-mode-trial-verdict-control
title: "Dev mode can bring a defendant's case to the justice engine's own verdict and sentence, with no dev-only write"
area: gov
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** Dev mode drives bills, bribes and runs, but offers no control for a trial: the justice engine already decides a verdict and a sentence when a case reaches the state's time to disposition (src/core2/modules/justice.ts, header step 4), yet a tester can only wait for one. The dev scene list answers 'No game code to attach to' for a court scene. Add a control that brings one chosen case to disposition through the engine's own call and shows the verdict, the sentence and the reasons by record id; it writes nothing the engine does not write. Seen: a tester picks an open case on the Calendar's dev panel and reads its verdict, sentence and reasons. Feeds: gov-justice-counted-dispositions

**Cause.** Found in code: src/bench/dev-mode.ts (the scene recipes near line 1359 and the Calendar panels) has no recipe or control that calls the justice engine's disposition for a chosen case; src/core2/modules/justice.ts runs trials only on the state's time to disposition. docs/ROADMAP.md says courts proper come after early access, so this is the dev control for the engine that exists, not a court engine.

**Fix.** Add one dev control that, for a case chosen from the case list, advances the world with dev mode's Run to that case's disposition day (the engine's own clock, as 'Run until it takes effect' does for a law) and reads back the verdict, the sentence and the chair of reasons from the justice records. Add no write path: the engine's call decides. Show it on the Calendar's dev panel with the existing controls' look.

**Time box.** 3 hours

**Rules.** No dice: the verdict and sentence come from the engine's reads of the defendant's traits, the evidence and the law in force, never from the control. Wire to the world: the control proves a verdict in a generated world, not a hand-built one, and applies to every case the engine holds.

**Done when.** A second session, not the builder, plays buildBenchWorld in a drawn place with a seed nobody chose (both named), turns dev mode on, picks an open case on the Calendar's dev panel, runs it to disposition, and sees the verdict, the sentence and the reasons by record id, each opening in Trace. A test in src/bench shows the control calls the justice engine and writes no row of its own, in a drawn place with its seed.

**Waits on.** Nothing. The justice engine exists; courts proper (judges, appeals) are not part of this item.

**Files.** src/bench/dev-mode.ts,src/bench/dev-api.ts,src/core2/modules/justice.ts

**Notes.** Filed under dev-mode-bodies-without-game-code. Appointments and confirmations already have office-appointments and gov-appointment-record-names-appointee.
