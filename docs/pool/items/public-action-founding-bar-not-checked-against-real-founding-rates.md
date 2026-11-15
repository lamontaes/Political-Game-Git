---
id: public-action-founding-bar-not-checked-against-real-founding-rates
title: "The bar a crowd must clear to found a standing group (2.5) has not been checked against how often real crowds found groups at real sizes, and fewer found a group once crowds got small"
area: core
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words-engine
model: opus
effort: medium
root: none
source: Account lead, join decision (Nov 15), founding counted at three places before and after crowds stopped being the whole town
claimed-at:
---

**What.** A crowd that turns out over a grievance founds a standing group when its people's case clears `movementBar` (2.5, TUNABLE, spread 1.5 to 3.5, in `src/core2/data/public-action/actions.json`). The bar is a number chosen by feel, and no one has checked what share of real protests found a group, by crowd size. After a protest stopped being the whole town and became the people whose own view and week send them, fewer groups were founded at the same three places over the same staged bad term. Seen: a protest that does not found a group in a played year, where a person who read of it might have expected one.

**Cause.** Measured: Port O'Connor, Texas (seed `pa-seed-9320`, label `pa-a`) 1 group founded then 0; Lincoln, Vermont (label `pa-b`) 2 then 1; Cottleville, Missouri (seed `pa-rally-pin:0`) 2 then 1, a staged bad term to December 2025. The decision in `organizerOf` (`src/core2/modules/public-action.ts`) is `1 x level + 0.5 x log(1 + crowd) + 1 x closeness (at most 1) + temperament` against the bar, so smaller crowds reach it less often. The bar is ESTIMATED in spirit but carries no source and no check against real founding.

**Fix.** Check the bar against sourced figures for how often protests and rallies of each size lead to a standing group (a sourced rate by crowd size from the repo's research files, never fetched by the builder), keep the rate as a check on the total and never as the pick of one crowd, and set the bar, its weights and their spreads from it. Do not retune a number to make a test pass.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** No dice: real rates check totals and never pick one crowd's outcome. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE with its spread. Research calibrates; it never decides an outcome.

**Done when.** At Port O'Connor, Texas, Lincoln, Vermont and Cottleville, Missouri, with the bar read from its sourced check, the share of staged protests of each crowd size that found a group sits inside the sourced range, each founding named by its movement record id; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** The join decision for public action (#9418).

**Files.** src/core2/data/public-action/actions.json, src/core2/modules/public-action.ts
