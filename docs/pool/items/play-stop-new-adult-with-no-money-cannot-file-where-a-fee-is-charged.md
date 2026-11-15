---
id: play-stop-new-adult-with-no-money-cannot-file-where-a-fee-is-charged
title: "A new adult who lives with family and holds no money can never file for council where the law charges a fee"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9531
after:
blocked-on:
lead: m0-m2
model: opus
effort: medium
root: none
source: "Fable B, Nov 15 (found from the cause of tests-real-race-played-bennington-cannot-file)"
---

**What.** The golden path stops at its third step in 11 of the 56 places for a player who starts as a young adult at home. At Bennington, Kansas the council race opens for filing on time, the fee is $20, and the player holds $0.00, so the clerk can never take the filing. The golden-path check there reaches no step at all in six years. The player's parent holds $5,285 the whole time. Seen: the filing counter, where the fee check is never met, and the golden-path check's "steps reached none".

**Cause.** Found in code: `checkEligibility` (src/core2/modules/elections.ts) meets the `filing-fee` check only from `person.liquidMinor`, the candidate's own cash, and `payGovernmentFee` (src/core2/budgets-treasury.ts) pays only from the candidate's own account. A new adult who lives with family has no cash of their own: the household's money sits with its earner, and nothing passes any of it to them. The check and the payment came in with #9153 (pool item `elections-filing-fee-paid`). Measured: Bennington, Kansas (2006075), world seed d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507, train at 9a5a4d2c08. `GOLDEN_PATH_SEED=<that seed> GOLDEN_PATH_PLACE_KEY=2006075 node --import tsx src/bench/path-check.ts` prints "steps reached none; furthest none" and "no contest the player can enter" in 2027, 2029 and 2031. The player (born February 22, 2007) has no job and $0.00 at every month end for 18 months, with no journal post to or from them; the one earner in the household holds $5,285 on the first day. The council race of November 4, 2025 is offered on April 26 and May 24, 2025 with one unmet check: "filing-fee: needs $20, has $0". By the filing data, 11 places charge a council fee: Michigan, Guam and the Northern Mariana Islands $100, Ohio $30, California and Wyoming $25, Kansas and Kentucky $20, Mississippi $10, Minnesota $5, New Hampshire $1.

**Fix.** The household covers the fee. In `checkEligibility` the `filing-fee` check counts the cash the candidate can reach: their own, then the adults of their household. `payFilingFee` pays from the candidate first and the rest from the household member who holds it, through the money journal, with the payer named on the post. One rule for the player and for world candidates (`weighContest` in src/core2/modules/candidacy.ts reads the same reachable cash). Register it as a stopgap of kind `owner-decision` in the gov family file: whether a parent pays is their own choice (their money and their tie to the candidate), and the first version treats the household's cash as shared for this one fee, as it is for living costs. The fee stays a payment to the treasury.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet (owner, Oct 14): research calibrates the simulation and never adds a step to the player's life, and the rule names a filing fee as its first example. The fee was built under "simulate it, don't ask" (Oct 24) as a money flow; it must not become a job the player has to hold before the golden path's third step. One rule, all 56 places: no state is named in the logic. One model, two tiers. No dice. Never loosen a test to get green.

**Done when.** In a drawn place it names with its seed, in a state whose law charges a council filing fee, a second session starts a new life as a young adult living with family, goes to the filing office when the council race opens and files, on the train or main; the fee shows as paid by a named member of the household on the journal; and `path-check` at Bennington, Kansas with the seed above reaches election night.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/budgets-treasury.ts, src/core2/modules/candidacy.ts, src/core2/elections-filing-fee.test.ts, src/core2/campaign-real-race-played.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Nov 15 (Fable B): the same cause keeps `src/core2/campaign-real-race-played.test.ts` red at its pinned place (`tests-real-race-played-bennington-cannot-file`); this fix should turn it green with no change to the test. The petition in the fee's place is `elections-filing-fee-petition-in-lieu-counts` (open) and does not help here: Kansas's row gives no usable count. Not measured: how many drawn new lives start with no cash of their own; how often the controlled character takes a job when the check plays it (it took none in six years here). OWNER DECISION, flagged and not waited on: should a filing fee ever be able to stop the player from filing, or is it only a payment? Read: OWNER-DECISIONS (Nov 14), DECISION-REGISTER, prior-rulings/laws-and-money.md, LAW; searched: "filing fee", "fee", "filing", "petition". Found: Oct 14 "No one builds a mechanic because real life has it: a filing fee, a tax return, a petition, a form"; Oct 28 "Filing is petition, signatures, the clerk's check, then the ballot (this reverses 'Filing: no fee or petition mechanic')", which names no fee; Oct 24 "simulate it, don't ask", which names a fee as a background flow. Nov 15 (Fable B), built: the fee check, the world's decision to run and the party's ask read `feeCashInReach` (src/core2/modules/elections.ts), and `payFilingFee` pays from the candidate and then the household's adults, each by their own post. Stopgap SG-GOV-filing-fee-household-pays. New pinned test `src/core2/elections-filing-fee-household.test.ts`: at Bennington the player held $0 against $20, person_ff2b4b8e04947c7a paid $20.00, the City of Bennington took in $20.00 and the filing went on the ballot; red without the change ("the fee check $20, has $0"). `src/core2/campaign-real-race-played.test.ts` passes again at its pinned place and `src/core2/elections-filing-fee.test.ts` still passes 2 of 2. The golden-path check at Bennington now files and plays on, and stops later on a fault of its own, filed as `play-path-check-throws-when-a-campaign-closes-while-it-canvasses`, so the last clause of Done when (election night printed by the check) waits on that item.
