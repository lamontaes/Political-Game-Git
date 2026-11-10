---
id: campaigns-candidate-rally-events
title: "A candidate's rally is an event with a place and a time the player can travel to"
area: core
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: campaigns
standard: 2
model: opus
effort: high
root: rc7-player-cannot-drive
---

**What.** The owner's 'clicking a candidate's rally lets you go there and learn their views' has no rally to go to. Stand-in SG-SCREENS-candidate-rally.

**Cause.** Found in code: src/bench/play.mjs:4296 (no rally link in the race row). src/core2/modules/campaigns.ts keeps filings, contests, bills, stories and terms but no rally record; the rally in src/core2/modules/public-action.ts is a town's demonstration, not a candidate's event.

**Fix.** Have the campaigns engine write a campaign-event row (venue from the place's records, date, speaker, the stances the speaker holds) when a candidate's campaign holds one, from that campaign's own money and reach, not a chance. The director stages it as a scene the player can travel to; the race row links to the next one. Reuse the one scene engine; no second event system. Decide with the lead whether it extends public-action's record.

**Time box.** 16 hours for a Sonnet session; split by the lead if the director part is larger.

**Rules.** One engine per mechanic; no dice; the scene follows scene-standard; words come from the English banks.

**Done when.** A second session, on main in a drawn place and seed, opens a race on the Campaigns tab, clicks a rally link, travels there, hears the candidate's stances from their filing, and sees the record id of the event.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/public-action.ts, src/bench/play.mjs
