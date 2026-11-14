---
id: elections-petition-own-electorate
title: "A statewide or district petition asks its own law's count, gathered across the race by paid circulators"
area: elections
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/project-thread-86yqt4
pr:
blocked-on:
source: owner, Nov 14, 2026 ("obviously one signature U.S. senator, that shouldn't happen"); stopgap rows SG-GOV-petition-town-share and SG-GOV-petition-count-estimated
claimed-at: 2026-11-14T06:40:00Z
after:
lead: elections
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-14
---

**What.** A special U.S. Senate race at Edgar, Wisconsin asked one signature: `petitionNeededHere` scaled a statewide or district count to the town's share of the electorate, at least one (SG-GOV-petition-town-share). Where a place's filing row gave a formula, the petition asked a national median for the family (28 for a town party filing, 2,000 statewide) instead of the law's formula (SG-GOV-petition-count-estimated). The player sees it on the Campaign tab's petition line and at the filing counter.

**Cause.** Found in code: `src/core2/modules/voting.ts` `petitionNeededHere` multiplied the law's count by the town's share of the race's eligible voters; `src/core2/modules/elections.ts` `petitionRule` returned `readCountsFor`'s median for "formula" and "unread" rows; no engine gathered signatures outside the town.

**Fix.** One rules file for every family (`src/core2/data/elections/petition-rules.json`, the municipal rows moved in unchanged, 134 formula sides added); the count is computed for the race's own electorate (`wideElectorate` in `src/core2/race-places.ts`: the race's places, the town set apart; an island area from its villages' people). A campaign pays circulators (`hireCirculators`, `circulatorShift` in `campaigns.ts`) who gather among the race's counted voters outside the town over the days the petition circulates, paid per signature on the journal; the clerk counts them (`checkPetition`). World candidates hire them for the share the town cannot give; the player sets an amount on the Campaign tab.

**Time box.** One session.

**Rules.** No dice; one rule, all 56 places; replace, never layer; money only through the campaign's account.

**Done when.** A second session, in a place and seed it draws, files a candidate for a statewide or district race on main and sees the petition ask the law's whole count (not the town's share), pays circulators from the Campaign tab, and sees the signatures rise over the following days and the clerk's check count them.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/elections.ts, src/core2/modules/campaigns.ts, src/core2/race-places.ts, src/core2/data/elections/petition-rules.json, src/bench/campaign.ts, src/bench/play.mjs

**Notes.** Built on the train branch (claude/project-thread-lhbwzt). Pinned test: src/core2/petition-statewide.test.ts (Edgar WI seed edgar-petition-1; Fort Payne AL seed fort-payne-petition-1).
