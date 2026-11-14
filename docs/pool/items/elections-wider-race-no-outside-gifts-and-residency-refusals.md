---
id: elections-wider-race-no-outside-gifts-and-residency-refusals
title: "A wider race in a drawn place often draws no outside gifts, and most drawn places refuse every filing for residency"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F3 while carrying #8749
after:
lead: wire-elections
model: sonnet
effort: medium
root: none
checked:
---

**What.** In campaign-outside-donors.test.ts, drawn places often end with a wider race that raised money in town but drew no outside gifts, and most of the other draws refuse every filing for residency. The player sees it on the campaign screen of a Senate, House or governor race: a funded statewide campaign that lists no money from outside the town, and a resident who cannot file for a seat the state elects.

**Cause.** Measured: on fresh seeds f3a and f3c (Nov 14, the train head with #8749's filer fix), Pancoastburg, Ohio (3959724, place seed 145b9a66d12ef0a66f61b7aa2fab8bf50890cb4a470397610c1dd79fae10f759, U.S. Senator, filed 2025-12-06) raised 439438400 minor units and bought 159 polls but had 0 outside gift rows, and Norton, Virginia (5157688, place seed d3dafba9f69e009a3135a34513eda08a06d1ecb2841ac1ad17ffae2cb5f9bd93, Governor, filed 2025-02-07) raised 434665600 and bought 141 polls with 0 outside gift rows. On f3a, five of six drawn places refused every filing for residency (Charlotte Amalie West VI, Henefer UT, Riverview AL, Belmore OH and others). Cotulla, Texas (4817216, seed 55e25c5754f41760a27bd4a36f84d3e00ad6e7e8bfdbe38fabe9b1ac5b0da972) passes: 180 outside gifts. Clean main fails the same test the same way ("no wider race with outside gifts in 6 places"). Which of askOutsideDonors (src/core2/modules/campaigns.ts) or the residency rule of fileCandidacy decides it is not yet traced.

**Fix.** Trace askOutsideDonors for Pancoastburg and Norton to the record that stops the gifts, and the residency refusal for the test's chosen adults (whether they live outside the state's district), then fix the engine or the test's filer choice.

**Time box.** 2 hours.

**Rules.** Ask why, by record id. One rule, all 56 places. No dice.

**Done when.** A second session runs the outside-donors check on three fresh seeds in three places (none Cotulla) and sees each wider race with outside gift rows, or names the record that explains none.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-outside-donors.test.ts
