---
id: web-full-people-tax-pull-in-moves
title: "A full person weighs the state income tax when deciding to leave, as a counted household does"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "stand-in triage of the web register, Nov 10 (docs/stopgaps/triage-2026-11-10/web.md)"
claimed-at:
after:
standard: 2
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
---

**What.** Counted households weigh the income-tax difference between their state and another when they move; a full person does not. One model, two tiers: the same rule must apply to both (SG-WEB-moves-full-tax-pull).

**Cause.** Found in code: src/core2/modules/moves.ts, the call `api.stopgap(TAX_STOPGAP)` at line 1171 (marker constant at line 83). The pull is built before a full person's destination is chosen, so there is nowhere for a state-to-state tax difference to enter. src/core2/modules/counted-moves.ts `pullBetween` reads the town state's income-tax law and the other states' 2026 table into an income pull by wage.

**Fix.** Give a full person's leaving a destination-aware income term: once the destination is chosen (county flow, relative or state), compare net-of-tax income by the person's own wage with the same function `pullBetween` uses (share it, do not copy it), and let the difference add to or subtract from the pull. Do not add the outcome web's income-tax links on top (they are about zero and would count the tax twice). Cheap: it runs only for a person already deciding to leave, not for everyone each day.

**Time box.** 6 hours.

**Rules.** One model, two tiers. No dice: the tax law in force and the person's pay decide. Sliding scale: no threshold. One rule, all 56 places: tax tables are data.

**Done when.** A second session plays a one-year world in a drawn place and seed it chose (named) with two states' tax tables differing, and sees a full person with a high wage leave toward the lower-tax state more often than a low-wage neighbor, each departure carrying its tax reason and the record id it read, and the year-time bar still holds.

**Waits on.** Nothing.

**Files.** src/core2/modules/moves.ts, src/core2/modules/counted-moves.ts, src/core2/data/stopgaps/web.json
