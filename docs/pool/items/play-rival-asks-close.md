---
id: play-rival-asks-close
title: "Candidates in the player's own race keep asking the player for money after the player files against them"
area: campaigns
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/blockers-rival-asks
pr:
after:
blocked-on:
lead: world
model: sonnet
effort: medium
root:
source: Blockers' golden-path walk, Nov 17, 2026, for the CTO's 03:25Z priority (the owner's 11 a.m. build, "up to and through his first election")
checked:
---

**What.** Two candidates in the player's own council race asked her for money four days before she filed, and their asks stayed open after she ran against them. Fifteen open asks fill the first page of Elections, ahead of the offices she runs for.
Seen: Papillion, Nebraska (seed 7fcc2c2b-3f38-4e0a-9cf7-52ee1ba13bcc), June 14, 2026, Jared Maxwell and Emil Cook, council member.

**Cause.** Found in code: src/core2/modules/campaigns.ts `askOpen` keeps an ask open while its candidate stands and the race is not yet held, and never reads whether the person asked now stands against them; `donationAnswer` reads no `rivalFiling`, though that helper already shuts rivals out of volunteering, hosting, donor meetings and endorsing.

**Fix.** `askOpen` closes an ask once the person asked has a standing filing in the same race (`rivalFiling`), and `donationAnswer` gives nothing from a rival, for world donors and the player alike.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the rule is the engine's, read alike for world candidates and the player, never a filter on the player's screen.

**Done when.** A second session plays a drawn place it writes down with its seed until a candidate in a race the player may file for asks the player for money, then files for that race at the counter: the ask is gone from Elections, and dev mode's Trace of the campaign shows no gift from the player.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-rival-asks.test.ts (new)

**Notes.** Filed and built by the Blockers lane, Nov 17.
