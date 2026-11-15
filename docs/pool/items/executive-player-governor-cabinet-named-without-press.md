---
id: executive-player-governor-cabinet-named-without-press
title: "A player who becomes governor has their whole cabinet named for them, without their press"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
root: none
claimed-by:
pr: 9501
after:
blocked-on:
lead: governing
source: "Civic roles builder, Nov 15, found converting tests-state-post-opened-by-written-death"
model: sonnet
effort: medium
---

**What.** When the player takes the governor's seat, the executive engine names every post of the governor's cabinet in the player's name at its next review, about 30 days later, with no press from the player. The ruling "nothing cast for the player without their press" says the player's own posts wait for their choice, as the town's already do. Seen: Edgar, Wisconsin (5522550), seed edgar-petition-1, player seated as governor with `seatPlayerInStateOffice` on 2025-01-20. On 2025-02-19 appointment:US-WI:agriculture is held by person:cabinet:US-WI:agriculture:term:seat:US-WI:governor:2025-01-20:dev-start:0 (Ellen Montgomery), `appointedBy` the player (person_0ac4774205321ee6), confirmed by the state senate 33 to 0, and every other governor's post the same. Seen: a player governor's office panel lists every cabinet post as held by someone they never chose.

**Cause.** Found in code: the review in src/core2/modules/executive.ts (about line 2117) calls `appointStateCabinet(api, worldSeed, `${governor.id}:`)` whenever the governor's seat has a new holder, whoever it is. The branch beside it, which fills a dead or departed cabinet member's post, already skips the player (`memberKey(governor) !== playerId`), and the town's posts skip the player's own (`townAppointer(...)?.personId === playerId`). The new-cabinet branch has no such check.

**Fix.** In that review, when the new governor is the player, do not call `appointStateCabinet`; the sitting cabinet stays until the player names someone through `appointStatePost` (the office panel and the ask to serve), as the town's own posts wait. Decide with the lead whether the sitting members stay serving or their posts stand open: the town keeps its sitting heads, so keep them serving. Re-check tests that seat the player as governor and read a post's holder (governor-pick-from-the-state, post-ask-drawn-refuses, bill-nomination's governor case).

**Time box.** 2 hours for one session.

**Rules.** Wire to the world: the player's choices are the player's (OWNER-DECISIONS.md, Oct 14), and no engine names the player governor's cabinet without their own press. One engine: the same review, with the player's check the vacancy branch already has.

**Done when.** A second session seats the player as governor in a drawn place (named with its seed), plays 60 days, and sees the cabinet still held by the people who held it at the opening, with no appointment `appointedBy` the player until the player names one in the office panel.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. The death-path tests wait for this cabinet before reading a post's holder and say so in a comment; when this item is built, those waits are removed. It may be the cause of tests-bill-nomination-governor-seat-not-taken (the post still held by the opening's agriculture member after the player names someone): not checked.
