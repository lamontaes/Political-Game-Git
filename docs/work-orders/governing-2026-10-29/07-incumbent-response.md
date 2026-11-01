# The incumbent's response to a gaining challenger (Nov 1)

Read-only design for `campaign-incumbent-hears-the-race` and the played proof's clause (d), from three approaches scored on the Lecompton, Kansas and Vinita, Oklahoma traces (seed 7d00da010de8fe91), then a plan and an adversarial check. **The check's corrected plan at the end is the order to build.** In short:

1. **Unit 1** (branch `governing/incumbent-hears-the-race`): `rivalDay`'s `threat <= 0` gate is a threshold (standing rule: sliding scales). The pull becomes a softplus of the reading's margin, with a new `rivalThreatWidth` (TUNABLE, its research item to file). `cameHome` becomes `homeShare`.
2. **Unit 3** (the played-proof branch, in the same commit that merges a main holding Unit 1): clause (d) is found only when a new told yes for the player, first given after the prior reading, raised the incumbent's door time by at least one door. Never run the proof between Unit 1 landing and this change: it would pass falsely.
3. **Unit 2** (its own item and PR): a told yes follows whoever holds it now. The CTO must accept the widened stopgap reason.
4. **Momentum (approach B) is dropped.** Clause (d) stays missing on seed 7d00 until `campaign-incumbency-calibrated` and `elections-counted-vote-splits-by-share` land: the player never gains there.

## Verdict

Build a combination, in three units: **A's sliding response** (rows per source with a kept prior, not the "over calm" option), then **C's told-yes-follows-holder**, then **clause (d) restated** on the played-proof branch. **Do not build B's momentum.**

- No design produces an honest clause (d) in Lecompton or Vinita on seed 7d00da010de8fe91. The player loses ground there in the world itself:
  - Lecompton: held yeses 53→54 against 156→196. The told gap widened from 154−31=123 to 194−46=148.
  - Vinita: held 97→212 against 194→856. The told gap widened from 190 to 779.
- Lecompton passes momentum only on information growth. Held +1 while told rose +15, so at least 14 of the 15 were yeses the player already held.
- **B is rejected** because the one rule applies to every world candidate, and it would blow up trailing challengers' days.
  - Vinita's 6d69bf32: the rival's told yeses went 126→536, so μ2=(536−126)/1286=0.319 and (1+θ)=1.414.
  - That is a pull of 0.45 at wM=1, and 2.2 to 2.7 at the wM of 4.9 to 6 that B needs for a 15-minute incumbent step-up.
  - Since `ownHours` is uncapped (campaigns.ts:5492), that is 3 to 4 times the base hours.
  - c4f56777 gives 0.42 at wM=1.
- **The PR should not wait** for campaign-incumbency-calibrated or elections-counted-vote-splits-by-share. Ship the units, report (d) as missing with its cause, and re-run the played proof after the calibration lands.

## Unit 1: the response slides (this branch, `Pool item: campaign-incumbent-hears-the-race`)

It lands here because the word test's failure reproduces here (AGENTS "a fix lands on the branch where the failure reproduces"). The fix for the threshold is also the fix for that test.

**Changes (campaigns.ts)**

- **:5512-5515.** Replace `Math.max(0, …)` and `!reading?.rivalId || threat <= 0` with two cases:
  - No reading (no word and no poll): the calm day. This is a gate on a cause (no record reached them), not a threshold.
  - Otherwise: `plan(pull)`, with `pull = wThreat · s · ln(1 + e^{θ/s})`. Use `wThreat·θ` when θ/s > 30.
- **The rival gate.** Keep `rivalId` as the best told rival, or null. Do not borrow `word.rivalId`; that keeps the fix-round's best-rival rule and `expectBestRival`.
  - With no rival told, θ = −own. That stays continuous: the first told yes moves θ by 1/N.
  - `SteppedUp.reading.rivalId` and `SteppedUpRow.rivalId` (:5550) become `string | null`.
- **:5461-5462.** `plan` takes the pull, not the threat.
- **:5466-5467, :5531.** `homePull` is now positive for any reading, so `cameHome` would be true for every away candidate. Replace the boolean `cameHome` (:5167, :5569, the event fact at :5676) with `homeShare` (the number `homePull`). Nothing outside campaigns.ts reads it (SG-GOV-stepped-up-unread).
- **`SteppedUp` and the row** gain `pull` and `ownHours`. Expose `ownHours` because total hours are not monotone when the best act flips: a twin that takes an interview can have more hours than the pressed day.
- **Rows** keep their id `${filingId}:${sourceRecordId}` (:5600). One row per reading source, as now. Every source now writes one, since extraHours > 0.
- **`recordSteppedUp`** adds `priorId`: the filing's previous steppedUp row, read through the `byFiling` index. It copies only the id, not the numbers (one fact, one place).

**Parameter (campaigns/parameters.json, next to :189)**

| Name                     | Value | Tag                | Spread      | Basis                                                                                                                                                                                                                      |
| ------------------------ | ----- | ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rivalThreatWidth` (new) | 0.1   | TUNABLE            | 0.05 to 0.2 | Direction only: incumbents respond to a challenge while still ahead. Checked against played rows where pull equals softplus(threat) and rises with the threat across a filing's rows. A `researcher` item sets the spread. |
| `rivalThreatWeight`      | 1     | TUNABLE, unchanged | 0.5 to 2    | Bardwell 2005 after Green and Krasno 1990 (:192). Its meaning is kept well above a tie.                                                                                                                                    |

**Numbers on the traces** (s = 0.1; extra time = base × pull, base 2 h with a job or 4 h without, parameters.json:130,136). Rows are kept per source.

| Place     | Row   | θ       | pull                         | Over calm       | Compared with the prior row         |
| --------- | ----- | ------- | ---------------------------- | --------------- | ----------------------------------- |
| Lecompton | 09-05 | −0.4767 | 0.1·ln(1+e^−4.767) = 8.47e-4 | 0.10 / 0.20 min | first row                           |
| Lecompton | 09-23 | −0.5222 | 5.38e-4                      | 0.06 / 0.13 min | told player +8, own +26, Δθ −0.0455 |
| Vinita    | 01-13 | −0.2517 | 7.76e-3                      | 0.93 / 1.86 min | first row                           |
| Vinita    | 01-22 | −0.2806 | 5.87e-3                      | 0.70 / 1.41 min | player +1, own +31                  |
| Vinita    | 01-31 | −0.3209 | 3.96e-3                      | 0.48 / 0.95 min | player +2, own +41                  |
| Vinita    | 02-18 | −0.4235 | 1.44e-3                      | 0.17 / 0.35 min | player +18, own +149                |

**Side effects** (the most any candidate gains is s·ln2 = 0.069, at a tie):

| Candidate                           | θ      | Change in pull | Minutes (2 h / 4 h base) |
| ----------------------------------- | ------ | -------------- | ------------------------ |
| Vinita 3e691997                     | 0.0104 | +0.064         | +7.7 / +15.4             |
| Vinita c4f56777 (word, nobody told) | 0      | +0.069         | +8.3 / +16.6             |
| Vinita 6d69bf32                     | 0.156  | +0.019         | +2.3 / +4.6              |
| Vinita 6d69bf32                     | 0.414  | +0.0016        | +0.2 / +0.4              |

Speed: one `log1p(exp())` per world-candidate turn, plus one index read per new row. Expected within noise; the done-when still needs a `speed:year` run.

**Test changes (campaign-incumbent-response.test.ts)**

- **Word draw, :503.** Drop `reading.threat <= 0`. Accept a draw where the word's reading names the challenger with at least one told yes, no poll, and doors on offer. This is what makes it pass on fresh seeds.
- **Delete :564** (`rivalShare > ownShare`).
- **:592-594.** Calm still has `steppedUp` null.
  - The pressed day names the word.
  - `steppedUp.pull` equals `wThreat·softplus(θ)` to 1e-9.
  - `ownHours` exceeds calm's by `baseHours·pull`.
  - Door hours are greater only where both days take the same act. Otherwise name the act that changed.
- **The twin, :616-620.** Restate it as: with the challenger's told yeses removed, θ falls, the pull is strictly smaller and `ownHours` is strictly smaller.
  - The twin's reading names none of those pledge ids.
  - Its rival is the next one told, or null.
  - It is no longer "no stepped-up row".
- **Poll test, :193.** May keep its draw. :233 still holds. :255 becomes `homeShare === min(1, pull)` plus the away door hours being greater.
- **Restate hears-the-race's done-when, with a Notes line:**
  - The twin line becomes: "a twin day whose yeses are removed puts in fewer hours by `rivalThreatWidth`'s slide, on any drawn place word reached".
  - The (d) line moves to campaign-real-race-played-proof (Unit 3). The reason: the player loses ground in both places, by the numbers above.
- The counted test's single-draw failure (Seneca SC, no word by 2025-11-03) needs the same redraw loop as `wordOfDoors`. That is a separate fix.

## Unit 2: a told yes follows its holder (new item, e.g. `campaign-told-yes-follows-holder`, its own PR after Unit 1)

- **Why a separate item.** It changes the door rule away from hears-the-race's done-when line 1 ("told the incumbent's canvass of a yes to that rival").
- **Change at campaigns.ts:5343-5345.**
  - If the latest door answer named a candidate, count `pledgesOf(api, v).find(p => p.contestId === contestId && onBallot.has(p.candidateId))` for whoever holds it now.
  - A "nobody" answer counts nothing.
  - Both maps are keyed by pledge id, so a resident also counted through the circle is not counted twice.
- **What it adds to the record.** The reading gets `followedPledgeIds`. The row gets `toldFollowed`, plus the ids where `keepsWhy` holds.
- **Text to reword.** The `SG-GOV-threat-from-told-yeses` text (stopgaps.json:7746): "…known at once, and a door yes since given to a rival counts for that rival". The docblock at :5270-5291 gets the same change. No new parameter.
- **Ask why.** This widens a registered fake that the stopgap already claims; it adds no record. The stopgap's own replacement (a record of what each person says when in touch) is what fixes it properly. Say this in the PR body.
- **Evidence to re-run.** Kennebunk ME, seed c5b97db128f82f23ee54e666c3ac193e:
  - θ goes from (16−33)/105 = −0.162 to at most (16+47−33)/105 = +0.286.
  - Unit 1 alone gives 0.1·ln(1+e^−1.62) = 0.018, about 2.2 / 4.3 min.
  - Units 1 and 2 together give 0.291, about 35 / 70 min.
  - So once the player really converts the incumbent's supporters, Unit 2 is what makes the reaction visible.
  - On the 13 probe draws, the information designer's bounds have it reading the challenger ahead in 5 of the 9 places where the challenger leads in town, against 0 today, with no false alarm. Those are upper bounds; the PR must run them.
- **Effect on the two played places.** Lecompton stays at or below (53−154)/258 = −0.391 (pull 0.0020, 0.24 min). Vinita stays at or below (97−194)/755 = −0.128 (pull 0.024, 2.9 min). Neither gains ground.
- **Test.** `toldFromRecords` (:333) follows the holder in its own independent recount.
  - After the incumbent's evening of doors (:637), the challenger walks doors again.
  - Assert each resident who told "you" and now holds the challenger's yes is in `toldPledgeIds` for the challenger, and that `toldFollowed` matches the count.
  - Redraw, naming why, when there are no converts. The counted tier gets the same check.

## Unit 3: clause (d) reads two rows (governing/real-race-played-proof, test file only)

- **What "after the player gains" means.** The player gained ground in what reached the incumbent. This follows the owner's Oct 29 words ("gained steam, and then it caused [the incumbent] to try to go back", OWNER-DECISIONS:128).
- **The record.** An incumbent steppedUp row naming the player, with its source kept and its event told, whose `priorId` row exists, where:
  - `toldRival` rose (or `rivalShare` rose, for a poll), naming the new ids as the set difference of the two rows' `rivalToldPledgeIds`. `keepsWhy` holds because the rival is the player.
  - `threat` rose.
  - `pull` rose.
- **Restate the proof item's done-when** from "after reading the player ahead" to the above. The clause's text (:760-769, :823) should stop saying "ahead".
- **Recommend a floor of one door.** Require the row's extra door time to reach one household: `extraDoorHours × doorsPerCanvasserHour` (15, ESTIMATED, parameters.json:39) of at least 1, which is 4 minutes.
  - This is the proof's acceptance criterion, not the simulation's behavior. It is the lead's call.
  - Without it, a +0.33-second change would count as "found".
- **Result on 7d00…** Missing in both places:
  - Lecompton row 09-23 against 09-05: player +8 told, own +26, Δθ −0.046.
  - Vinita: every later row has Δθ < 0 (−0.029, −0.040, −0.103).
- **Pool.** Set `blocked-on: campaign-incumbency-calibrated` on that clause.

## What no unit can fix

- **Why the player stopped gaining.** The race turned when main's 31a6642364 ("A door yes is the voter's current choice, one a race", Oct 30) arrived in merge 315e1a3840.
  - The earlier trace on the same seed had the player ahead (118 to 93 pledges, zz-trace-…-0 on 10-29). The current trace has the player behind (54 to 196). Both scripts count pledge rows by candidate (ihr-played-proof.test.ts:136).
  - A door yes is now `doorChoiceOf` → `countedChoice(doorAppealOf)` (voting.ts:1347-1355), the voter's strict first choice. Incumbency counted twice decides it.
  - That is campaign-incumbency-calibrated (CTO Nov 1, Q2).
- **elections-counted-vote-splits-by-share** changes the tally. It reaches door answers only if it changes `countedChoice` as used at voting.ts:1354. Ask that branch whether a single counted resident at the door keeps first place.
- **The order (d) needs.** Calibration first, so the player converts voters. Then Unit 2, so the incumbent hears it. Then Unit 1, so he responds in proportion. Waiting on either item buys nothing for Units 1 and 2.

## Research

- **Cited in the repo:** only Bardwell 2005 after Green and Krasno 1990 (campaigns/parameters.json:192), and that only for direction.
- **Jacobson is cited**, contrary to the information designer, but only for vote effects and entry: electorate/parameters.json:19,31,37; candidacy:104,170; officials.json:296,312; campaigns:702.
- **"Marginal"** appears only at docs/research/capability-cases-2026-10-14.md:1067,1075, about legislators.
- **Nothing cites incumbent effort responding to challenger strength or margin.** Leads for the `rivalThreatWidth` researcher item (unverified, not SOURCED):
  - Jacobson 1990, AJPS 34(2):334-62
  - Green and Krasno 1988, AJPS 32(4):884-907
  - Erikson and Palfrey 2000, APSR 94(3):595-609 (spending peaks in close races)
  - Mann 1978, _Unsafe at Any Margin_
  - Goldenberg, Traugott and Baumgartner 1986, Political Behavior 8(1):3-20
  - Krasno, Green and Cowden 1994, JOP 56(2):459-74
- **What they support:** a smooth closeness response that keeps slope while the incumbent is ahead (Unit 1). They support "the rival gaining" only through rising closeness, which is not B's absolute growth.

## Standing rules

| Rule                 | Status                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| No dice              | Met by all three units.                                                                                |
| Sliding scales       | Met by Unit 1. The remaining gates are records (a reading exists; a new source is kept).               |
| Ask why              | Unit 1: the row names its source and its prior row. Unit 2: widens a registered fake, as stated above. |
| One model, two tiers | Met. `pledgesOf` covers counted residents by the same rule.                                            |
| Speed                | Met, subject to `speed:year`.                                                                          |

Files read:

- /home/user/gov-proof/src/core2/modules/campaigns.ts
- /home/user/gov-proof/src/core2/campaign-incumbent-response.test.ts
- /home/user/gov-proof/src/core2/data/campaigns/parameters.json
- /home/user/gov-proof/src/core2/data/stopgaps.json
- /home/user/gov-proof/src/core2/modules/voting.ts

Scripts:

- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/ihr-choose/rows.py

## Adversarial check and corrected plan

The plan holds overall: build A's sliding response, then C's told-yes-follows-holder, then restate clause (d), and drop B. It needs about a dozen fixes before it ships. The most serious is an ordering hazard that would make the played proof's clause (d) pass falsely. Nothing was edited or run in /home/user/gov-proof. I computed numbers with inline python over the trace files and wrote no files.

### Per step

### Verdict

- **V1, build A + C + the restated (d), drop B: AGREE.** The fixes are below.
- **V2, no design gives an honest (d) on seed 7d00…: AGREE.**
  - Lecompton told gap: 154−31 = 123, rising to 194−46 = 148.
  - Vinita told gap: 194−4 = 190, rising to 849−70 = 779.
- **V3, Lecompton's told yeses grow from information, not gains: AGREE.** Held yeses rose +1 while told yeses rose +15, so at least 14 were old yeses newly heard.
- **V4, reject B: AGREE on the blow-up, FIX the research wording.**
  - The blow-up is real: μ2 = (536−126)/1286 = 0.319, and 0.319 × 1.414 = 0.45 at wM = 1. At wM = 4.9 to 6 that is 2.2 to 2.7, and `ownHours` at campaigns.ts:5492 has no cap.
  - The research wording is not supported. The plan's own lead, Goldenberg, Traugott and Baumgartner 1986, says incumbents react to "the strength of their challengers' campaign". That is challenger effort, which is closer to B than to closeness. Rest the rejection on the blow-up and on Lecompton's information artifact, not on the research.
- **V5, ship without waiting on calibration: AGREE.**

### Unit 1

- **1a, replace :5514-5515 with "no reading → calm, otherwise `plan(softplus)`": AGREE.**
  - I grepped every reader of `.threat`, `steppedUp`, `cameHome` and `raceReading` in src. The only gate on the reading is :5514-5515.
  - The other spots are harmless:
    - :5466 `min(1, pull)` is a cap, not a flip.
    - :5467 `homePull > 0` is continuous at 0.
    - :5523 gates the row, not the hours.
    - :5353 picks the best rival; the plan handles it.
    - The act argmax at :5476-5487 is a final choice made from sliding scores. That is allowed: OWNER-DECISIONS:571 says the rule "governs causes, not the final yes or no".
  - Note one side effect: a word reading where nobody told anyone a yes reads as a dead heat. c4f56777 on 12-02 and 12-08 heard 0 yeses from 481 and 531 people, giving pull 0.069, about 8.3 or 16.6 minutes. Say this in the parameter text.
  - Note also that campaign-incumbent-comes-home.md:19 (done, #6876) described this hinge as sliding "from zero… never a cutoff". The PR should state the new reading of the rule (a dead zone over the whole half where the incumbent leads), so the CTO can confirm it in one line.
- **1b, `rivalId` is the best told rival or null: AGREE.** `toldTo(reading.rivalId)` and `keepsWhy(…, rivalId)` in `recordSteppedUp` (:5605-5617) must handle null.
- **1c, `plan` takes the pull: AGREE.**
- **1d, `cameHome` becomes `homeShare`: FIX.** "Nothing outside campaigns.ts reads it" is wrong. Three places read it:
  - origin/governing/real-race-played-proof (ede6bf1934), campaign-real-race-played.test.ts:823, reads `row.cameHome`. That breaks typecheck once the branch merges main.
  - campaign-incumbent-response.test.ts:255.
  - campaign-incumbent-comes-home.md:21 (a done item) names `cameHome` in its done-when.
  - Count the removal in the PR body (replace, never layer).
- **1e, add `pull` and `ownHours`: AGREE.**
- **1f, one row per source, every source writes one: FIX.**
  - It is not strictly every source. When the act flips and the gain is not positive, :5523 keeps no row.
  - The event is now told for readings worth seconds. Lecompton 09-05 is worth 0.10 minutes.
  - Reword the SG-GOV-stepped-up-unread `whatItFakes` (stopgaps.json:7762), which says "because they know a rival stands ahead". Note in the PR that any future reader of the event must scale by `extraHours`.
  - Report the row and event count per year from the speed run.
  - The plan also never lists these docblocks, which still say "ahead" or "level or ahead": :5152-5155, :5384-5392, the `CAMPAIGN_STEPPED_UP_EVENT` and `SteppedUpRow` comments (:5539, :5542).
- **1g, `priorId`: AGREE.** It copies an id only, so it is not a second record of the race beside `raceReading`. My grep found no other race-standing engine. Unit 3 needs a rule for a poll row followed by a word row.
- **1h, `rivalThreatWidth` = 0.1, TUNABLE, spread [0.05, 0.2]: FIX.**
  - The value sits at the geometric middle of the spread, so the edge is not the issue.
  - The issue is that "checked against played rows where pull equals softplus(threat)" checks the formula against itself.
  - No repo source covers incumbent effort and margin.
  - The outcome is sensitive across the spread. The response at a tie, s·ln2, is 0.035, 0.069 and 0.139 (4, 8 and 17 minutes on a 2 h base).
  - It also contradicts the plan's own research line ("keeps slope while ahead"). The slope at s = 0.1 is σ(θ/s): 0.27 at −0.1, 0.047 at −0.3, 0.0067 at −0.5.
  - File the `researcher` item with an id now. Its check should be incumbent effort at 10 to 30 point margins (Jacobson 1990; Erikson and Palfrey 2000; Krasno, Green and Cowden 1994), from pages actually fetched.
- **1i, `rivalThreatWeight` unchanged: FIX the text at parameters.json:192.**
  - Its check, "the share of incumbents in played worlds who step up when a challenger gains (steppedUp rows)", would read about 100%, since every reading now writes a row.
  - "A fifth behind → a fifth more" now holds only from about θ ≈ 0.2: softplus(0.2) = 0.213.
- **1j, numbers on the traces: AGREE.** I re-derived every row. For example, (39−180)/270 = −0.5222 and 0.1·ln(1+e^−5.222) = 5.38e-4.
- **1k, side effects: AGREE on the numbers, FIX because nothing measures them.**
  - Mean extra hours on reading days, at s = 0.1, from the Vinita and Lecompton traces:

    | Candidate           | Extra hours |
    | ------------------- | ----------- |
    | Lecompton incumbent | +0.06%      |
    | Vinita incumbent    | +0.21%      |
    | 6d69bf32            | +0.51%      |
    | c4f56777            | +2.2%       |
    | 3e691997            | +5.5%       |

  - At s = 0.2, 3e691997 reaches +12.2%.
  - `speed:year` measures time only, and campaign-calibration.test.ts measures only the player's contact rate.
  - Add a done-when line: world candidates' door knocks per year, plus event and interview counts (the pull is added to `eventScore`), from the same base-against-branch run. One run, one number.
- **1l, speed: AGREE, with one note.**
  - An away candidate with any reading now gets door hours above 0 every turn. campaignTurn (:5766) then calls the canvass choice:
    - `walkWith` floors to 0 doors (:1301);
    - `openDoorWalk` still reads every door row of the campaign (:1264);
    - `recordActivityTime` still writes (:1304).
  - `emitMessage` writes nothing when there are no witnesses (:4070), so no false "evening of doors" appears.
  - Skip the call when floor(hours × 15 × efficiency) = 0, or measure it.
- **1m, test changes: AGREE, FIX one gap.**
  - The checks "pull equals the formula" and "ownHours = base·pull" restate the implementation.
  - The word branch would then be tested only at about 1e-4 hours.
  - Add a material twin: remove the incumbent's own told yeses. Lecompton 09-05 goes to θ = 31/258 = 0.120 and pull 0.147, which is 17.6 minutes. Assert the door gain is at least one door (4 minutes at 15 an hour, parameters.json:39).
- **1n, the restated twin: FIX one edge.** If the next rival ties the challenger's told count, θ does not change and "strictly smaller" fails. Redraw in that case and name why.
- **1o, poll test :255: AGREE.**
- **1p, restate hears-the-race's done-when: AGREE, FIX two things.**
  - campaign-incumbent-reads-own-doors (open) also has a done-when "twin… stepping up nothing", which Unit 1 contradicts. Restate it too.
  - The hears-the-race item's Files line lacks parameters.json.
- **1q, the counted test's Seneca failure is "a separate fix": FIX.**
  - The done-when requires this file to pass.
  - The loop already redraws 6 bench worlds (:720-850). All 6 were passed over on c5b97db1.
  - Either fix it in Unit 1 or file an item with an id now and mark that done-when line unmet.

### Unit 2

- **2a, a separate item: AGREE.** I found no twin. reads-own-doors changes when door answers open a reading; Unit 2 changes whom a told yes counts for. Both edit the door loop (:5331-5346), so put the count in one helper both use.
- **2b, ask why: FIX the framing; the code change is fine.**
  - It credits a rival from the resident's current pledge, which is their true support. The item's Rules (campaign-incumbent-hears-the-race.md:19) say "never to anyone's true support".
  - The stopgap does already claim it ("given to a rival since, is known to the candidate at once", stopgaps.json:7750). So this is code catching up with a registered stopgap.
  - The PR must ask the CTO to accept that reason, and must not mark ask-why as met.
- **2c-2g, records, stopgap rewording, Kennebunk evidence, played places, test: AGREE.** Arithmetic checked:
  - Kennebunk: (16+47−33)/105 = 0.286. 47 is an upper bound on converts. softplus gives 0.2916, about 35 or 70 minutes.
  - Played places stay negative: −0.391 (pull 0.0020) and −0.128 (pull 0.0245).

### Unit 3

- **3a, "gained ground in what reached the incumbent": FIX.**
  - A rise in `toldRival` can come from old yeses newly heard (Lecompton: 14 of 15).
  - Require at least one new told id (the set difference) whose `PledgeRow.firstDate` (:271, kept at :780) is after the prior row's date. That is "after the player gains", by record.
- **3b, "threat rose" and "pull rose": FIX, redundant.** The pull is strictly increasing in θ for fixed parameters. Keep the pull check.
- **3c, require a prior row: FIX.** That excludes the strongest case, a first word row naming the player (Kennebunk with Unit 2 at +0.286). Compare a first row against the day with no reading.
- **3d, the one-door floor: AGREE on the floor, FIX what it measures.**
  - Apply it to the increment: this row's `extraDoorHours` minus the prior row's, or the whole value for a first row.
  - An absolute floor is too weak. At θ = 0.1 the pull is 0.131, about 15.8 minutes. One more told yes out of 258 adds Δθ = 0.0039 and Δpull ≈ 0.73 × 0.0039 = 0.0028, which is 0.34 minutes. That would pass on a 20-second change.
- **3e, restate the done-when and drop "ahead": AGREE.** The owner's words support it (OWNER-DECISIONS:128, "a campaign gaining steam until the incumbent comes home").
- **3f, ordering: FIX, critical.**
  - The live clause (:804-808) checks only `rivalId`, hours above 0 and that the source exists.
  - Once Unit 1 is on main, Lecompton's 09-05 row (+0.0017 h, threat −0.477) prints "found… naming the player ahead". On top of that, :823 fails to compile.
  - Unit 3 needs Unit 1's fields, so it must land in the same commit as the proof branch's merge of main. Never run the proof in between.
- **3g, (d) missing on 7d00…: AGREE.**
- **3h, "blocked-on on that clause": FIX.** `blocked-on` applies to the whole item. Either split (d) into its own item blocked on campaign-incumbency-calibrated, or block the whole proof item. The lead's call, but say which.

### What no unit can fix

- **4a, "the race turned at 31a6642364": FIX.** This is unverified and probably a misread.
  - That commit's own message says that before it, "residents pledged to every candidate who knocked". So the earlier trace's 118-to-93 pledge rows counted voters who pledged to both sides; they are not a lead in voters.
  - The script that wrote the earlier trace is not on disk. ihr-played-proof.test.ts:136 is the current script only.
  - The conclusion, calibration first, still stands on the current trace and on Q2's figures (94% of incumbents hold, against 66 to 78% in real races).
- **4b, "ask the vote-split branch": AGREE, but cite Q1 first.** Q1 (OWNER-DECISIONS, Nov 1 18:20) splits only a counted record's unpledged weight and says "a named voter keeps first place". A door answer is one resident's, so `doorChoiceOf`'s `countedChoice` (voting.ts:1354) likely stays first-choice. Q2 is what changes door answers, through `incumbentLeanOf` in `doorAppealOf` (voting.ts:1322). Confirm by a message to that branch, not by asking the owner.
- **4c, the order: AGREE.**

### Research and standing rules

- **Citations: AGREE.** Bardwell 2005 after Green and Krasno 1990 at parameters.json:192 is direction only. Jacobson is cited only for vote effects and entry: electorate:19/31/37, candidacy:92/104/170, officials:296/312, campaigns:702. Nothing cites incumbent effort against challenger strength or margin.
- **"Keeps slope while ahead": FIX, as in 1h.**
- **Already ruled:**
  - OWNER-DECISIONS:461 keeps the walk order, which rules out C's re-knock option; the plan doesn't use it.
  - OWNER-DECISIONS:516 says rivals campaign "studied from real campaigns", so s needs the research item.
  - Nothing rules on softplus versus a hinge.
- **Standing rules:** no dice and one model, two tiers are met. Sliding scales is met in `rivalDay`. Ask why needs the Unit 2 fix. Speed is subject to `speed:year` and the 1l note.

### Corrected plan

1. **Unit 1** (hears-the-race branch). As planned, plus:
   - Replace `cameHome` with `homeShare`, handle a null `rivalId` in `recordSteppedUp`, and add `pull`, `ownHours` and `priorId`.
   - Rewrite the docblocks (:5152-5155, :5384-5392, :5539, :5542), the SG-GOV-stepped-up-unread text and the `rivalThreatWeight` text and its check.
   - Add `rivalThreatWidth` (0.1, TUNABLE, spread 0.05 to 0.2) with an external check, and file the `researcher` item with its id.
   - Skip or measure the zero-door canvass calls.
   - Tests:
     - pressed against calm;
     - the twin, with fewer hours and a tie redraw;
     - the new material twin (incumbent's own told yeses removed, at least one door);
     - the counted test fixed or filed;
     - the poll test's `homeShare`.
   - Done-when adds `speed:year` plus world door knocks and acts per year, base against branch, and the row and event count.
   - Restate the done-when of hears-the-race and of reads-own-doors.
2. **Unit 3** (proof branch, in the same commit that merges a main holding Unit 1). Clause (d) is found when the incumbent's row names the player and both of these hold against the prior row, or against the no-reading day for a first row:
   - a new told player yes whose `firstDate` is after the prior row's date;
   - the pull rose, with the door-time increment of at least one door.

   Also:
   - Replace :823 and the "ahead" text, and restate the done-when (OWNER-DECISIONS:128).
   - Split (d) into its own item, or block the whole item, on campaign-incumbency-calibrated.
   - Report (d) as missing on 7d00 with Δθ −0.046 in Lecompton and −0.029, −0.040, −0.103 in Vinita.

3. **Unit 2** (new item, its own PR). Follow each told yes to whoever holds it now, in one door-count helper that reads-own-doors will reuse. Add `followedPledgeIds` and `toldFollowed`, reword the stopgap, and get the CTO to accept the widened stopgap reason in the PR. Run the 13 probe draws, the Kennebunk seed and the counted check.
4. **Drop B.** Message the vote-split branch to confirm Q1 leaves door answers at first choice. Strike the 31a6642364 attribution, or mark it unverified. Re-run the played proof after the calibration lands.

Files read:

- /home/user/gov-proof/src/core2/modules/campaigns.ts
- /home/user/gov-proof/src/core2/modules/voting.ts
- /home/user/gov-proof/src/core2/electorate.ts
- /home/user/gov-proof/src/core2/why-kept.ts
- /home/user/gov-proof/src/core2/campaign-incumbent-response.test.ts
- /home/user/gov-proof/src/core2/campaign-calibration.test.ts
- /home/user/gov-proof/src/core2/campaign-turn.test.ts
- /home/user/gov-proof/src/core2/rival-campaign-day-played.test.ts
- /home/user/gov-proof/src/core2/data/campaigns/parameters.json
- /home/user/gov-proof/src/core2/data/stopgaps.json
- origin/governing/real-race-played-proof: src/core2/campaign-real-race-played.test.ts
- origin/main: docs/coordination/OWNER-DECISIONS.md, docs/coordination/DECISION-REGISTER.md
- origin/main: docs/pool/items/campaign-incumbent-hears-the-race.md, campaign-incumbent-comes-home.md, campaign-incumbent-reads-own-doors.md, campaign-real-race-played-proof.md
- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/ihr-fix.md
- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/ihr-played-trace-0.jsonl
- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/ihr-played-trace-5.jsonl
- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/zz-trace-7d00da010de8fe91-0.jsonl
- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/ihr-played-proof.test.ts
- /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/clause-d.ts
