---
id: world-federal-case-stream
title: "A federal case stream so federal sentencing (mandatory minimums) has something to shorten"
area: world
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** us-federal-positions:justice-rights.reduce-mandatory-minimums reaches nobody (law-wiring reach 0, Butte AK, seed 3d8e41c7a09b25f6). justice.ts models the state's sentence range for ordinary cases (counted cases, sentences and custody) and the corruption route; federal mandatory minimums bind federal drug and firearm offenses, and there are no federal courts or federal prison population in the engine. Add federal cases (arrests and charges by offense from federal data) to the same justice engine, with federal sentencing ranges and a mandatory minimum floor the question can lower, sized from the U.S. Sentencing Commission.

**Rules.** No dice. One engine: justice.ts, with the level as data, not a federal copy. Sized from the Sentencing Commission with citation and spread.

**Done when.** A played world shows federal cases with sentences and custody; with the question enacted through a real bill, sentences for the affected offenses shorten and the federal prison population falls over the lag; the checker grades reach and money; the stopgap loses this question.

**Files.** src/core2/modules/justice.ts, src/core2/modules/laws.ts, data/research/justice (a new Sentencing Commission file)

**Notes.** Found by the Dev Tester, Nov 8 night.
