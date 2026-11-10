---
id: campaign-like-real-races-part-1-path-check-wins
title: "The path check from New Game wins a council seat in most drawn places"
area: elections
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
after: campaign-real-race-played-proof, campaign-incumbent-hears-the-race, campaign-donor-reasons-refit
blocked-on:
lead: governing
source: split from campaign-like-real-races in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** No life started from New Game has won a race. Once the played-year proof, the incumbent who reacts and the money from named donors are on main, the path check must show that the player's life, taking the actions a real underdog takes, wins a council seat in most places. This part runs the path check across ten drawn places, reads the losses by record, and fixes what the campaign engine still does not give an underdog. Seen: the player's first council race from New Game, which now wins in most places (golden path).

**Cause.** Design: owner ruling Oct 29, 2026 (docs/coordination/OWNER-DECISIONS.md, Oct 29 21:40 UTC): look at real races, where an underdog wins with a group, forums, debates, donors and momentum. The path check is src/bench/path-check.ts and the campaign actions are in src/core2/modules/campaigns.ts.

**Fix.** After the three sibling items merge, run the path check over ten drawn places (skill governing-measurement), read each loss by its vote and cause records, and fix the missing underdog action in the campaigns engine. Add no second system.

**Time box.** 6 hours for an Opus session.

**Rules.** No dice: support, money and momentum come from people's reasons and records. Wire to the world: each action moves real voters through the one campaigns engine. This is a game, not a spreadsheet: each action is a stop or a scene, never paperwork.

**Done when.** A second session starts from New Game in ten drawn places (places and seeds named) and sees the path check win a council seat in at least 7 of them, with each loss explained by record id. The win counts are reported from the run and are not tuned toward any real-world rate.

**Waits on.** campaign-real-race-played-proof, campaign-incumbent-hears-the-race and campaign-donor-reasons-refit merged.

**Files.** src/bench/path-check.ts, src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/bench/campaign.ts
