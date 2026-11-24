---
id: director-ten-offers-and-six-visits-in-ten-weeks-each-staged-as-a-scene
title: "Ten offers of help, six interview invitations and six rival-news visits are each staged as a full scene in ten weeks, with the same opener and menu"
area: director
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: opus
effort: medium
root: rc6-scenes-repeat
source: Words lead's read of a played run, Salado TX seed review1:2, class D (/mnt/project-files/words-lead/regression/page-read-salado.md, Nov 15)
claimed-at:
---

**What.** In ten weeks of a candidate's life at Salado, Texas (seed `review1:2`) the director staged ten offers of help, six interview invitations and six news-from-the-race visits as full scenes, each with the same opener and the same four replies whoever the person was. Karen Rivas gave money on August 24 and on September 10 says "I heard you're running for alderman." After the first volunteer in a small town the rest should be a line in the day unless the person is someone to the player. The same measurement showed in the audit of Nov 9 (45 of 64 scenes one job-offer call) and again in this run, so the cost is the player's days read as one long run of callers. Seen: in the days and weeks of a played candidate, one scene after another with the same opener.

**Cause.** Found in code: the director's only limits on a kind coming back are day counts, `repeatDays` and `seasonCap` in `src/director/data/situation-types.json`, read by `scheduleMoment` (`src/director/scheduling.ts`) and `produceCircumstances` (`src/director/ledger.ts`). Neither reads what the player has already seen of this kind, nor whether the person is someone to the player; so every record of the kind becomes a scene. Item director-cap-on-scene-repeats (in a pull request) limits the same caller on the same subject by what the earlier scene settled; this item is the class above it: what a person who has already seen several of the kind is shown as a scene and what stays a line on the bench. Pull request 9369 (a season cap) is near this and is not copied.

**Fix.** Decide what is worth a scene against a line on the bench from records: how many of this kind the player has already been shown in the season, and the tie the player has to the person (read from the relationships table, never a type list). A kind seen several times, from people the player barely knows, goes to the bench's line; a person the player is close to still gets the scene. Every figure is an ESTIMATED or TUNABLE row with a spread in `src/director/data/director.json`, no fixed cap, no dice. Delete `repeatDays` and `seasonCap` rows where this covers them.

**Notes.** Words lead, Nov 15, scenes P27 to P35: a supporter brings "news from the race" on November 6, three days after the player lost. A scene whose cause no longer holds on the day it plays is the same class: the staging reads what the player has seen and whether the cause still stands, from records.

**Time box.** 8 hours for one Opus session at medium effort.

**Rules.** One engine per mechanic: the director's schedule is the one place that decides a record becomes a scene. No dice. Sliding scales, nothing flips at a threshold. Every number a parameter row tagged with its spread.

**Done when.** In a played run at Salado, Texas (seed `review1:2`) for ten weeks the offers, interview invitations and race-news visits staged as scenes fall to a few of each, with the rest on the bench as lines, each named by its moment id; the player's close contacts still get their scene; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** Pull request 9369 and the pool item director-cap-on-scene-repeats, to say which part each holds.

**Files.** src/director/scheduling.ts, src/director/ledger.ts, src/director/data/director.json, src/director/data/situation-types.json
