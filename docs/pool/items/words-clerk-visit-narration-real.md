---
id: words-clerk-visit-narration-real
title: "The clerk's visit narrates what really happens at a filing counter"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: words/clerk-visit
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 23:05 UTC (third batch, a Massachusetts life)
lead: words
milestone: play-first
claimed-at: 2026-11-01T23:25:11.139Z
---

**What.** Owner, Nov 1 playtest of v0.73.0, on the first line at the clerk's counter: "You come in with your forms in a folder. Jennifer Rosales, the city clerk, is the one behind the counter. The one behind the counter is weird. Also, how do you know why I came here with my forms in a folder? That would make sense if I was coming back with like the signature stuff, but you know, I used to work at the county clerk's office. You filled out the forms there." On a first visit a resident picks up or fills out the papers at the counter; only a return visit brings signed papers back. The narration reads the player's filing record to know which visit it is, and names the clerk naturally.

**Rules.** Scene standard: narration never restates the screen and says only what the records support. Ask why: a first visit and a return with signatures are told from the filing record's state. Research before building: the visit follows how clerks' offices actually handle nomination papers, from the owner's own account and real procedures.

**Done when.** In two drawn places (named with seeds), a first visit narrates picking up or filling out the papers at the counter and a return visit narrates bringing signatures back, each citing the filing record id; the PR quotes both before and after. The clerk speaks in connected sentences naming the place's own body, the choice reads as the player's reply, and the player is never shown saying a line they did not choose; a test fails on a player line the player did not pick.

**Time box.** 2 hours.

**You will see.** Walking into the clerk's office the first time, you ask for the papers instead of arriving with them.

**Screenshot.** The clerk's first line on a first visit and on a return.

**Files.** data/english/parts/scene-talk.json, src/director/filing-visit.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, third batch (Nov 1, 23:05 UTC, five screenshots, a Massachusetts life). Read: OWNER-DECISIONS (town council seats elected as each place's records say, at-large, by district or mixed; six offices and playerMayFile, Oct 29; every campaign act is a scene), the pool for twins.

Owner, Nov 1 23:30 (Northampton, Massachusetts), on "I want to run for Mayor": "this dialogue is absolutely god-awful. It's just listing things. Unless it calls for it specifically in the dialogue scene, it shouldn't read as a list. That's not how normal people talk." The clerk answered in five stacked one-line facts (pull the papers; straight to the ballot, November 4; a 4-year term; "You'd run the town day to day: the departments, the budget, and whatever the board sends you to sign"; the deadline). "Whatever the board... Do you mean city council?" (Northampton has a City Council: the body's name comes from the place's records). The choice read "File for this office" ("It should be an actual reply"), and the record then had the player say "I see." ("I never said that"). "Your petition is out for signatures" made no sense, and Continue sent him home with nothing explained, which is where the first-filing tutorial belongs (`play-first-filing-campaign-tutorial`).
