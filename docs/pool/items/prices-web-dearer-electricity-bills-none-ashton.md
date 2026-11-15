---
id: prices-web-dearer-electricity-bills-none-ashton
title: "Where two electricity laws are in force, a dearer electricity price is charged once per law instead of once"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-8fxsy5
pr: #9590
after:
blocked-on:
lead: m0-m2
source: Laws thread, changed-file tests for the web price trace, Nov 15, 2026 (red on Train 32a99421 without that change)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** In Wilton, Maine (the third place the test drew; the test's title names the first draw, Ashton, Idaho), a clean-electricity standard and retail electric choice are both in force. When the web's electricity price rises by a tenth, the player's household is asked the whole rise twice a month, once under each law, and retail choice's own price cut is lost. Seen: the household's electricity lines in dev mode's household money, and the bill card of either law.

**Cause.** Found in code: `webUse` (src/core2/modules/place-prices.ts) swapped the web's price into every electricity "share" rule of the place once the web's clean-electricity link was running (`(carried ? 1 : 1 + rule.value) * factor - 1` for each rule), and `withWebRules` added the web's own electricity rule only where no statute rule existed. So the web's one price was charged once per statute. Measured: `src/core2/prices-web.test.ts` at Wilton, Maine (2385815), world seed 056520284c241460, dearer world: 290 asks under the standard and the same under retail choice, all charges. The old test missed it the other way: it read itemized receipts, which the journal keeps only for the player's household, whose payer there has no cash (so nothing posts), and its only base receipt was retail choice's refund.

**Fix.** The price of electricity at a place is one figure. `withWebRules` adds the web's own rule beside the statutes whenever the web's factor is not one, and `webUse` asks it the change in that figure (factor less one); each statute applies its own share to the figure (share times factor); the standard's share is none once its link runs, since its effect is inside the figure. With a factor of one each statute's share applies to the good's own cost, the same path. The other goods `webUse` reads (fuel under a carbon price, the deposit's returns, transit trips, broadband take-up, miles driven) scale a statute's own rule by a quantity and never charge the web's price themselves, so they had no twin charge. The test reads the bills the price engine asks of every household (pinned at Wilton) and is red on the old code.

**Time box.** 2 hours for one Opus session at medium effort to find the cause.

**Rules.** Sliding scales and causes: a higher price moves a bill by degrees and never switches billing off. Pinned tests: the case is replayed at its named seed, not redrawn.

**Done when.** A second session replays `prices-web.test.ts` "charged once" on the train and it passes. It then starts the bench in a drawn place where two electricity laws are in force (or passes retail electric choice there in dev mode), runs past a rise in the web's electricity price, and sees each household's electricity lines asked once for the rise, with retail choice's own cut still shown, naming the place, seed and payment ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/prices-web.test.ts
