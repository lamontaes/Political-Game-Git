---
id: elections-petition-circulators-scene
title: "A player whose petition is short is told paid people can carry it past the town line, and their yes hires them"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by: claude/project-thread-p37c46
pr:
after: elections-petition-short-scene
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 trace of five new players (reports/new-player-race-trace.md, section 4): four of five short petitions make it only by hiring paid circulators, and nothing in the game told the player they exist
---

**What.** The petition-short scene (#9536) said the petition was behind but not that a town's doors cannot reach a race whose voters live partly outside the town. The record now carries `circulators` when the race has voters outside town and no fund is running, and `money` when the campaign holds free money. The clerk says how petitions are carried out of town (always, money or not); a helper who knows the campaign's money says it can or cannot be paid for. A new reply, "pay people to carry it", is offered only when money is free; the yes calls `hireCirculators` with what the gap needs at the per-signature price, set aside only up to what is free. Dev mode's Campaign set-up gets a "Petition count" view of who signed and how, what paid circulators brought, the gap and the days left.

**Cause.** Found in code: src/core2/modules/campaigns.ts `tellPetitionShort` wrote no fact about reach, and `hireCirculators` is only reachable from the Campaign tab's tile "Pay people to gather signatures". In the Account lead's trace a new player at Newry SC, Washington DC, Ashaway RI, Kappa IL and Kingston RI came up short and the scene gave no way to learn the tile exists.

**Fix.** `circulatorOffer` and the `hiring` branch of `answerPetitionShort` in campaigns.ts; the `hire` and `take` moves in purpose-arcs.json and data/content/trait-decisions.json; the facts block in purpose-scene.ts; the Words lead's lines in data/english/parts (scene-talk, journal) and the journal row; dev mode's `petitionCount`, route `petition-count` and control.

**Time box.** 6 hours.

**Rules.** The engine offers, the player decides (OWNER-DECISIONS Oct 14). No figure, count, price or date in a line. No dice: the offer reads the contest's reach and the campaign's free money. A hire that cannot make the count is not promised to; the Newry case stays short.

**Done when.** A second session, on main at a drawn place (the pinned places in src/director/petition-circulators.test.ts: Newry SC seed df47a5f4, Kingston RI seed 56b7f0e3, Ashaway RI seed 66b9345b), plays Newry (clerk, money from the player's own calls: the yes sets money aside and the petition still falls short), Newry with no money (the clerk says it, no hire reply), Kingston with and without raised money (helper) and Ashaway (clerk, no money), and sees each outcome on its screen: the talk, the Campaign tab's petition and circulators tile, the Journal line and dev mode's Petition count.

**Waits on.** #9536 on the Train, the Words lead's lines (placed as written) and a second reader's stamp at the exact head.

**Files.** src/core2/modules/campaigns.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, data/content/trait-decisions.json, data/english/parts/scene-talk.json, data/english/parts/journal.json, src/director/data/journal-rows.json, src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/ui/dev-campaign.mjs, src/bench/data/controls.json, src/director/petition-circulators.test.ts

**Notes.** Own PR stacked on #9536 (a38ae7bb). At Ashaway RI the player holds no money at the told day, so the clerk says it and no hire is offered; the petition ends 416 of 1,000. The scene offers circulators only while the clerk's count is not yet met (McKinney KY, 28 signed of 25 needed, is no longer offered). The fact `covers-part` says the free money buys fewer names than the gap to the gather target; the helper and the hire reply say so.
