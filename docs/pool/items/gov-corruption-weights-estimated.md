---
id: gov-corruption-weights-estimated
title: "The bribe weights say what raises and lowers each chance, as estimated rows with spreads"
area: gov
kind: research
priority: 3
size: S
status: merged
standard: 2
claimed-by: S3
pr: 9413
after:
blocked-on:
lead: gov
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead, from the owner's ruling of Nov 14, 19:25Z, Nov 15, 2026
checked: s3 2026-11-15
---

**What.** Thirteen rows in src/core2/data/corruption/parameters.json (how much money trouble, the bribe's size, ties, reputation, a soured tie and distance weigh in offering, taking, pressing, telling and reporting a bribe) were tagged TUNABLE under the stopgap SG-P15-corruption-weights. Six of them have evidence in the repository: the take weights were fitted and checked on twenty-eight drawn towns in src/core2/corruption-calibration.test.ts against Transparency International's 2019 rate and the latent model of Pletzer et al. 2019; the offer pull was fitted on 16,228 asks in eleven played years; the bribe share has the OECD figure in data/research/core/corruption-bands-2014.json. Seven have only a published relationship and nothing in the repository to check their size against. Seen: every bribe the game decides, for example at Cinco Bayou FL in src/director/bribe-offer-player-seat.test.ts.

**Cause.** Found in code: each row names `stopgapId: "SG-P15-corruption-weights"` in src/core2/data/corruption/parameters.json. The owner ruled (Nov 14, 19:25Z) that sources only establish relationships and effects, not exact figures.

**Fix.** The six rows with evidence become ESTIMATED: `estimatedFrom` names the evidence and says what raises and lowers the chance; `spread` keeps the measured range. The seven without (corruptionReputationWeight, corruptionLeanLeverageWeight, corruptionTellWeight, corruptionQuietPull, corruptionReportWeight, bribeVoteWeight, bribeBreachHoursPerDayOfCost) stay TUNABLE, and the stopgap row is narrowed to name only them. No value changes.

**Time box.** 1 hour, Sonnet medium.

**Rules.** No dice; no new stopgap; a row is ESTIMATED only with evidence behind it; plain American English.

**Done when.** The six rows are ESTIMATED with their evidence, the seven others keep the stopgap id and the stopgap row names only them, and the corruption tests give the same results as before at the places they name (rates and odds between thirds in src/core2/corruption-calibration.test.ts; a taken bribe at Cinco Bayou FL in src/director/bribe-offer-player-seat.test.ts). A second session plays one offered bribe in a drawn place and sees the same offer and take as before.

**Waits on.** Nothing.

**Files.** src/core2/data/corruption/parameters.json, src/core2/data/stopgaps/p15.json, src/core2/modules/corruption.ts

**Notes.** Built on claude/gov-corruption-weights-estimated.
