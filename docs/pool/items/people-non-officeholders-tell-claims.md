---
id: people-non-officeholders-tell-claims
title: "People who hold no office can tell the player a false claim about their own record"
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

**What.** A false claim can be told today only by a member of a body asked about their vote (`claimRecord` in src/core2/told-claims.ts handles a vote and a run). A resident who says they will vote for the player, a donor who says they will give, a volunteer who says they will come, or a would-be candidate who says they will not run, always tells the truth. Seen: in dev mode, a resident asked at the door says they will vote for the player and the vote they cast says otherwise, where their temperament and the record's risk lead them to it.

**Cause.** Found in code: `tellsTruth` in src/core2/told-claims.ts weighs only `claim.kind === "vote"` (a run returns the truth); `claimRecord` reads only the legislature's votes and the elections' filings, and no door, donor or volunteer scene calls it.

**Fix.** Extend `Claim` with the records that settle a resident's word (a ballot cast, a donation row, a volunteer shift), each through the same `claimRecord` lookup and the same chooser, and have the scenes that ask call `tellsTruth`.

**Time box.** 4 hours, one Opus session at medium effort.

**Rules.** No dice: the claim is weighed through the chooser from the person's traits and records. One model, two tiers: a counted resident filled in when met answers by the same rule.

**Done when.** At the named place 4846968 seed 8647-mason, a test through the game's own door-knock path shows a resident's false yes kept as a lie and settled by the ballot record, by record id; a second session sees it in dev mode on main.

**Waits on.** The lying PR (people can lie to the player) on the Train.

**Files.** src/core2/told-claims.ts, src/director/purpose-scene.ts
