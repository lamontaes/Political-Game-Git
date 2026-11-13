---
id: play-campaign-shows-last-years-finished-race
title: "Campaign and the trail open last year's finished race, so a player running again cannot knock doors or gather signatures"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** On Jan 9, 2026, ten months after the player won her March 2025 selectboard race, Politics then Campaign shows 'Where the race stands', 'You are running against Stephen Pugh', 'Doors knocked 1172' and 'Signatures 31 of 3, due January 27, 2025'. It also offers 'Go out on the trail'. These are all from the finished 2025 race. Stephen Pugh is a fellow board member, and she has not filed for the March 3, 2026 race, whose filing closes Jan 26. Worse, after she filed again on Jan 9, 2026, Travel's campaign trail opened the finished 2025 race every day from Jan 9 to Jan 15. That trail had no outings: Volunteers, Endorsements, Ad, Poll, Mail, Put in your own money and Give a speech, but no Knock on doors. So she gathered no signatures, the Journal said 'The clerk counted 0 good signatures. I needed 3.', and she was off the March 3, 2026 ballot. Seen: the Campaign screen under Politics, and the trail's tiles in Travel.

**Cause.** Found in code: campaignView in src/bench/campaign.ts (line 111) lists every filing the person ever made (`filings.query("byPerson")`), dropping only withdrawn ones. It never checks whether the filing's contest is decided or its election day has passed, so a decided race stays on the trail screen for good. campaignDayChoices in src/core2/campaign-day.ts (line 647) returns no outings for a filing whose election day has passed (contextOf, line 279), and play.mjs's campaignParts (line 1804) builds the trail from those campaigns, with the old one first. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026).

**Fix.** Have campaignView list only filings whose contest is still undecided (election day today or later, or a count still open), and keep a decided race for the record views (Journal, the player's record) rather than the trail. When none is left, Campaign shows what it shows a player who has never filed, which points to the next race open for filing.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. The screen reads the contest's own record, never a date typed in code. No hand-written player text.

**Done when.** A second session plays a drawn place, named with its seed, through a race the player files for and then past its election day on main. Campaign no longer shows that race or offers the trail for it, and shows the next race open for filing. A bench test over a decided filing fails on main's campaignView.

**Waits on.** Nothing.

**Files.** src/bench/campaign.ts, src/bench/play.mjs
