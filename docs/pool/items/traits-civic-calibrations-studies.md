---
id: traits-civic-calibrations-studies
title: "Ballot measures, backing the incumbent, joining a party and volunteering weigh temperament at studies' sizes"
area: people
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: traits-meetings-take-part-measured,traits-research-weights-civic-money
lead: traits
model: opus
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Four civic decisions weighed temperament at the general weight of 1 or at a size fitted to the wrong measure, so temperament settled them almost alone. A measure vote's trait term decided about half of all measure votes, nearly every identifier joined their party because the case was a fixed base, and most people a campaign asked to volunteer shared one total, so temperament alone sorted them. Give joining and volunteering each person's own circumstances (free time, travel, the reasons anyone backs a campaign, how closely they follow politics), then calibrate ballot-measures.vote, voting.back-incumbent, parties.join and campaigns.volunteer to cited studies. Give the employer's group join its nearest study and record why the lobbyist decision still has no base. Merged in from traits-wire-civic: the unfinished decisions of that family, telling an exit pollster, holding a town hall, a lobbyist speaking up, accepting an interview and taking part at a meeting, are fitted or given a gap row with numbers. Seen: how ballot measures come out, who joins a party and who volunteers for the player's campaign.

**Cause.** Found in code: src/core2/modules/campaigns.ts and src/core2/modules/parties.ts weigh campaigns.volunteer and parties.join at the general weight (src/core2/data/parameters.json rows `traitWeightCampaignsVolunteer` and `traitWeightPartiesJoin`; src/core2/data/campaigns/parameters.json); the item measured the symptoms (a measure vote's trait term decided about half of measure votes; nearly every identifier joined their party).

**Fix.** Give joining and volunteering each person's own circumstances (free time, travel, reasons for backing a campaign, how closely they follow politics), then fit ballot-measures.vote, parties.join and campaigns.volunteer to cited studies; leave voting.back-incumbent to campaign-incumbency-calibrated. Remove the gap rows that are resolved.

**Time box.** 6 hours for one Opus session.

**Rules.** No dice: each case is the person's recorded free time, travel, warmth, agreement and engagement, never a roll. Research before building: every weight cites a study and its spread, and a decision with too few calls keeps a gap row naming why. Sliding scales: no base sits above zero for everyone, so temperament turns the close calls instead of all or none.

**Done when.** A second session plays the election windows of six towns drawn from all 56 (seeds named) and sees that the people a campaign asks to volunteer and the identifiers who join a party differ by their own circumstances, not by temperament alone, with the reasons by record id; the ballot-measures, voting, parties and campaigns trait tests (ballot-measures.traits.test.ts, voting.traits.test.ts, parties.traits.test.ts, campaigns.traits.test.ts) pass on a fresh drawn place; the four fitted decisions are reported with their thirds' odds beside each study's size; the resolved gap rows are gone from data/content/trait-decision-gaps.json.

**Waits on.** campaign-incumbency-calibrated (for back-incumbent only).

**Files.** src/core2/modules/parties.ts, src/core2/modules/campaigns.ts, src/core2/data/parameters.json, src/core2/data/campaigns/parameters.json, data/research/trait-effect-sizes.json, data/content/trait-decision-gaps.json

**Notes.** TODO

Nov 1 (governing lead, CTO ruling Q2 in OWNER-DECISIONS Nov 1): voting.back-incumbent's trait term is now read around the town's average incumbent lean in every race, not only where a race has a public standing record (governing/incumbency-calibration, f520af79ba, item campaign-incumbency-calibrated). `traitWeightVotingBackIncumbent` is fitted there after the counted vote split (elections-counted-vote-splits-by-share), within its spread, and tagged ESTIMATED; the thirds' crossed odds for voting.back-incumbent here are read on that fitted weight.
