---
id: golden-address-talk-fades
title: "People stop opening talks with the President's speech weeks after it was given"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: golden/address-talk-fades
pr:
blocked-on:
source: golden-path playthrough, Oct 28
lead: play-first
milestone: play-first
---

**What.** In a played campaign season (Gilbert, West Virginia, Oct 28), nearly every talk from January to late March opened with "Did you catch the President's speech?": the partner in February, a neighbor in March, a resident at the door. The address counts as recent news from the day a person learned of it, and a person filled in when the player meets them learns of it that day, so it never ages. The talk should move on to what is happening now.

**Rules.** This is a game, not a spreadsheet: talk depth comes from how people react to what is happening now. Scenes and talks read what is happening in the world now (OWNER-DECISIONS, Oct 27: lines differ by what is happening in the world); a reply continues the conversation and a scene has depth (LAW.md section 4). Every number lives in a parameter table: the two weeks are a TUNABLE parameter with its spread.

**Done when.** The test src/director/household-talk.test.ts, in a buildBenchWorld drawn place with the seed it prints, shows that a month after the address no household member has the address among their talk subjects, fails on main's conversation.ts and passes on the branch.

**Time box.** 2 hours.

**You will see.** A neighbor met in March talks about something from March, not the inaugural address.

**Screenshot.** None needed: a talk's subject, proven by the test in a drawn place.

**Files.** src/director/conversation.ts, src/director/data/director.json, src/director/household-talk.test.ts
