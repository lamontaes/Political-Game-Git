---
id: campaign-topic-tilts-to-the-audience
title: "A campaign's ad, mailer, door visit or speech leans toward what the people it reaches care about"
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

**What.** Today each act's question is the platform question furthest behind its score share (nextTopic). A rival talks about what the people in front of them care about: a night of doors in a neighborhood of renters leans to housing, a speech to a room of retirees leans to what bears on them. This is the half of a rival's choice that today's even split by score share leaves out. Seen: in who a rival's ads, mailers, door visits and speeches are about.

**Cause.** Design: docs/research/platform-emphasis-2026-10-30.md names how a candidate chooses what to talk about, and nextTopic (src/core2/modules/campaigns.ts) reads only the campaign's own counts and platformShares; it never reads who the act will reach. The records to read exist: the household's or crowd's views (the views engine's public entry, via the stance a voter holds on the question and how strongly), a door walk's households (openDoorWalk), an event's audience (whoComes), a mailer's address list, an ad's outlet followers.

**Fix.** Before choosing, weigh each platform question's share by the share of the act's likely audience who hold a view on it and how strongly (counted groups by the same reader, times their count), a smooth multiplier on the share (never a threshold or roll). Choose the question furthest behind the tilted share. Read the views through their public entry so it keeps working when Build voters' views from their lives lands.

**Time box.** 4 hours for an Opus session.

**Rules.** No dice: the tilt is a smooth weight on the platform's score shares, never a roll. One model, two tiers: a counted group is read by the same rule as a full person, times its count. Play first: the player sees it in who an ad, mailer, door visit or speech is about. No new stopgap; the words half is the Words session's.

**Done when.** A second session, In a played year at a drawn place with seed printed, two door nights in different neighborhoods (or a room of renters and a room of homeowners) of one campaign are about different questions, named by record id with the audience's views behind each, and the pooled spread of issues per campaign is printed before and after; year-1 time per record at three places with and without.

**Waits on.** Build voters' views from their lives (how a voter's view is computed).

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-stances.ts, src/core2/campaign-platform-rotation.test.ts

**Notes.** Follows PR #9155 (nextTopic over platformShares), which spreads a campaign's acts over its platform by score share alone.
