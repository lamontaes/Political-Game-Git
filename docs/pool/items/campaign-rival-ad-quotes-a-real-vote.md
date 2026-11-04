---
id: campaign-rival-ad-quotes-a-real-vote
title: "At the player's re-election, a rival's attack ad quotes a real roll-call vote the player cast, and a voter's reason cites it"
area: elections
kind: feature
priority: 2
size: M
status: done
claimed-by: governing/rival-attack-ad
pr: #7174
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T04:05:30.304Z
---

**What.** Path 11 of Lane 1 (the next election uses the record) needs a rival who runs on what the player did in office. Today a rival's attack ad can cite an incumbent's broken promise (src/core2/record.test.ts), but nothing shows an ad built from the player's own recorded roll-call votes in a New Game life that won a seat and voted. The ad's subject should be chosen from the player's votes the rival's supporters disagree with most, read from the legislature's vote records, and a voter who saw the ad should weigh that vote among their reasons. This is a chain through engines that exist (legislature votes, campaigns' ads, voting's reasons), not a new mechanic.

**Rules.** Wire to the world and ask why: the ad names its vote record by id, and a ballot's reasons cite the ad and the vote. No dice: the rival picks the vote by the stance gap of the voters it is courting, never by chance. One engine: campaigns.ts runs the ad as it runs every ad. One rule, all 56 places.

**Done when.** In a played world (buildBenchWorld, drawn place and seed printed) where the player won a local seat and cast roll-call votes, the player's next race has a rival ad whose record names one of the player's vote ids, at least one ballot's reasons cite that ad and that vote by id, and a test fails when the ad's vote reader is removed.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/record.test.ts

**Notes.** TODO
