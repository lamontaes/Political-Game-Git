---
id: gov-fiscal-note-every-step
title: "A phased-in raise's fiscal note costs every step, each from its own date"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (review of gov-m3-01-phase-in-by-dated-steps)
lead: governing
---

**What.** costOf (src/core2/modules/legislature.ts about 1459) reads only the first minimum-wage section of a bill, so a raise phased in by dated steps shows the cost of its first step alone and understates what the employers on record will pay once the later steps take effect. The fiscal note at drafting is the register's rule for every bill (DECISION-REGISTER, Sept 26).

**Rules.** One engine: the note is the sum of employerCosts per step, each step costed against the step before it, never a second counting loop. Estimate, never UNKNOWN: a step whose cost cannot be counted still shows an estimate with its source.

**Done when.** In a drawn place built with buildBenchWorld and the seed it prints, a minimum-wage bill drafted through seatAct in two dated steps has a fiscal note whose yearly pay is each step's raise over the step before for the open commitments under it, named by commitment id and step date, and the bill paper shows the same figure.

**Files.** src/core2/modules/legislature.ts, src/bench/phase-in.test.ts

**Notes.** TODO
