---
id: words-law-subjects-for-bring-it-up
title: "Every law family the golden path can pass has a speakable subject for neighbors"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/law-subjects-bring-it-up
pr: #5177
after:
blocked-on:
source: "audit Oct 19, Part B step 10"
claimed-at: 2026-10-19T21:36:24.585Z
---

**What.** Step 10 of the golden path (people bring the law up) works only when the English engine can name what the law did. Today neighbors can speak only four law amounts (the wage row and three others), so a player who passes any other ordinance hears nothing about it, and step 10 reads as unreached for most of the law families the drafting screen offers. Every law family the player can draft and pass needs a speakable subject: what it changed, for whom, by how much, read from the law record and the family's data, with no hand-written lines per law.

**Rules.** No hand-written player text: the subject comes from the English engine reading the law family's data, not a line per law. Wire to the world: the subject applies to the whole family set the drafting screen offers, not the four named examples.

**Done when.** In a drawn place (`buildBenchWorld`) one law from each family the drafting screen offers is passed and a neighbor's line names it by record id with the amount or rule in words; a test enumerates the families from data and fails on any family with no subject; a screenshot of one line is in the PR. The owner plays it: whatever he passed, someone talks about it.

**Files.** src/presentation/, src/core2/law-reach/, src/director/data/situation-types.json

**Notes.** Child of play-golden-path-one-life. The outlet side (gov-press-outlet-revenue) is separate.
