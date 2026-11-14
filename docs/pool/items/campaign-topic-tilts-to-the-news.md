---
id: campaign-topic-tilts-to-the-news
title: "A campaign's ad, mailer, door visit or speech leans toward what is in the news that week"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator ruling)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A rival talks about what the week's stories are about: a plant closing in town leads to jobs, a fire to fire service. Today the choice ignores the news, so a rival's ads never answer what the town is reading. Seen: in who a rival's ads, mailers, door visits and speeches are about.

**Cause.** Design: docs/research/platform-emphasis-2026-10-30.md names how a candidate chooses what to talk about, and nextTopic reads no press records. The records exist on the press desk: the week's stories by outlet, each with its topic (press-topics.ts wireItem gives a story its question), and word of a rival's message (rivalWordPassedOn) for what an opponent, including the player, has said.

**Fix.** Weigh each platform question's share by how much of the week's stories in the town's outlets (and the opponent's recent messages) are on it, a smooth multiplier on the share with no threshold or roll; choose the question furthest behind the tilted share. Read stories through the press module's public reader and cache by day so no whole-history scan runs daily.

**Time box.** 4 hours for an Opus session.

**Rules.** No dice: the tilt is a smooth weight on the platform's score shares, never a roll. One model, two tiers: a counted group is read by the same rule as a full person, times its count. Play first: the player sees it in who an ad, mailer, door visit or speech is about. No new stopgap; the words half is the Words session's.

**Done when.** A second session, In a played year at a drawn place with seed printed, a campaign's act in the week after a story on one of its platform questions is about that question more than in a week without one, named by story and message record ids, with before and after counts printed; year-1 time per record at three places with and without.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/press-topics.ts, src/core2/campaign-platform-rotation.test.ts

**Notes.** Follows PR #9155 (nextTopic over platformShares), which spreads a campaign's acts over its platform by score share alone.
