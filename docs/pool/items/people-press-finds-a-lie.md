---
id: people-press-finds-a-lie
title: "The press may find out a lie an official told, by its own reads of the records"
area: people
kind: feature
priority: 3
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

**What.** OWNER-DECISIONS line 894 says getting caught in a lie depends, as in life, on the person's trust and on whether the press picks it up by its own reads. Today only the one told learns the truth, when the roll call settles it (`exposeVoteLies` in src/core2/told-claims.ts); no reporter ever reads that a member told the sponsor yes and voted no, so a lie never costs the liar anything beyond one tie. Seen: in dev mode, a member whose false yes the roll call exposed sometimes appears in the paper for it, when a reporter covering the body reads the vote and the sponsor talks.

**Cause.** Found in code: `expose()` in src/core2/told-claims.ts emits `claim.found-out` with `publicRecord: false` and writes only the hearer's knowledge and tie; src/core2/press-desk.ts reads no `claim.found-out` event.

**Fix.** Have the press desk read `claim.found-out` the way it reads other events: a reporter on the body's beat learns of it only if the one told tells them (the hearer's own choice through the chooser, from their traits and their tie to the reporter), and a story then reaches readers through the paper's existing route.

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** No dice: whether the press hears comes from the hearer's choice and the reporter's beat, never a chance. Wire to the world: the story reaches readers' views through the paper's existing route.

**Done when.** At the named place 4846968 seed 8647-mason, a test through the game's own path shows a found-out lie becoming a news story the town's readers receive, by record id, and a second case where the hearer keeps it to themselves; a second session sees it in dev mode on main.

**Waits on.** The lying PR (people can lie to the player) on the Train.

**Files.** src/core2/told-claims.ts, src/core2/press-desk.ts
