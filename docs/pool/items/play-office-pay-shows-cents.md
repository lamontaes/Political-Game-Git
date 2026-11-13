---
id: play-office-pay-shows-cents
title: 'Your office shows an officeholder''s yearly pay with cents: "Pay $76,219.00 a year" (French Island, Wisconsin)'
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: haiku
effort: low
root: none
checked: fable
source: Playtester P2, Nov 13 (French Island, Wisconsin, seed 49f52639-1873-49db-9500-bac35d6dc22b; Hewitt, New Jersey, seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0)
---

**What.** Politics → Your office → My seat reads "Pay $76,219.00 a year" for a La Crosse County commissioner (French Island, Wisconsin, seed 49f52639-1873-49db-9500-bac35d6dc22b) and "Pay $125,979.00 a year" for a Passaic County commissioner (Hewitt, New Jersey, seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0). Every other yearly sum on the Politics sheet is rounded. Seen: a yearly pay reads in whole dollars, with no cents.

**Cause.** Found in code: `src/bench/play.mjs` line 2644 writes the seat's pay as `moneyWords(job.annualMinor)`, the unrounded form that always prints cents. The bill paper's pay estimates at lines 2979 and 3007 (`moneyWords(item.estimateAfter.annualPayMinor)` and `moneyWords(redraft.estimateAfter.annualPayMinor)`) do the same. Hourly and daily pay (lines 3706 and 3742) rightly keep their cents.

**Fix.** The three yearly figures use `roundedMoney` (already defined at `play.mjs` line 75), as the budget figures on the same sheet do. Hourly and daily pay are unchanged.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: every officeholder's yearly pay reads the same rounded way, in any place. player-screen-text: no unrounded numbers on a screen.

**Done when.** A second session sees, on the bench on main, a drawn Advanced start as any officeholder showing Politics → Your office → Pay in whole dollars ("$76,200 a year"), screenshot with the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs
