---
id: people-lie-weighs-risk-and-need-from-records
title: "A person deciding whether to lie weighs the risk of being found out and what the truth would cost them, from records"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead review of the lying PR (people can lie to the player), Nov 15
---

**What.** OWNER-DECISIONS line 113 (the owner on crime and corruption, which holds for every wrong) says a wrong is weighed from three reasons together through the shared chooser: the person's traits, the risk as they know it from records, and need. A colleague deciding whether to tell the player a false yes about their vote weighs only their temperament and the closeness a refusal or a broken word would cost (`tellsTruth` in src/core2/told-claims.ts), so a member whose roll calls are never read by anyone lies as readily as one the local paper follows, and one whose seat or bill depends on the player as readily as one who owes them nothing. Seen: in dev mode, the same colleague lies less to a player whose earlier lies about votes the record exposed, and more when refusing the player costs them a bill of their own.

**Cause.** Found in code: `tellsTruth` in src/core2/told-claims.ts builds its circumstances from `strainCost` alone (a refusal's strain against a found-out strain times `fact.publicity`, which is always one); nothing reads the speaker's record of past lies found out (`claim.found-out` events), the press's reads of the chamber, or what the asker can give or withhold (`dealValue`, `askPrice` in src/core2/modules/legislature.ts).

**Fix.** Add two reasons to the `claim-circumstances` provider, each read from a record the game keeps: the risk (how many of the speaker's earlier false claims a record exposed, and whether a reporter covers the body, from the press desk's beat), and the need (what the asker can give or withhold at the roll, from `dealValue` and `askPrice`). No new weight: each enters in the same units as the strain.

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** No dice: risk and need come from the speaker's records, never a roll. Ask why: the scene's dev trace names the records each reason was read from.

**Done when.** At the named place 4846968 seed 8647-mason, a test through the game's own ask path shows a mid-temperament colleague telling a false yes before a lie of theirs was exposed and the truth after, by record id; a second session sees it in dev mode on main.

**Waits on.** The lying PR (people can lie to the player) on the Train.

**Files.** src/core2/told-claims.ts, src/core2/modules/legislature.ts, src/core2/press-desk.ts
