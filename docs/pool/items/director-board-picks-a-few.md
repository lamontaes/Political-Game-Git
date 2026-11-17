---
id: director-board-picks-a-few
title: "The director weighs every scene that could come to a person today and picks one, by how strongly it is felt, while the life has room (street stops, office hours and the partner's reaction fire far too often)"
area: director
kind: feature
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: claude/story-board-picks
pr: 9841
after:
blocked-on:
model: opus
effort: high
root: rc6-scenes-repeat
lead: director
source: 'Story lead''s director board design, Nov 16, 2026, build plan item 4; owner''s grades of the scene list on #9750 (CTO, Nov 17 00:39Z): on the street stop, "This one happens way too often in a super unrealistic way."; on office hours, "This one also happens way too much."; on the partner''s reaction after filing, "this happens like every time"; on the vote-once-cast and law-reaches scenes, "i have never seen consequences". CTO''s ruling: "Frequency is the director''s job. Street stops, office-hours visits and the partner''s reaction fire far too often. Each needs a cause on record and a cooldown, and the board picks a few."'
---

**What.** The owner graded the scene list: the street stop "happens way too often in a super unrealistic way", office hours "also happens way too much", and the partner's reaction after filing "happens like every time". Each moment decides its own outcome and the day's scenes from circumstance pick one apart from it, so nothing sees the whole day. The board weighs every candidate of the day together, cuts each by the first fact it fails, and picks one while the life has room.
Seen: in a played year the street stop, office hours and the partner's reaction come a few times, each with its cause record.

**Cause.** Found in code: `scheduleMoment` in src/director/scheduling.ts decides each moment's outcome alone (a moment that ranks within the life's pace waits; a scene met where the player is stops the day whatever else came), and `produceCircumstances` in src/director/ledger.ts keeps one pick a week (`directorCircumstanceEveryDays`) apart from the moments; the wordings check (`speaks`, `saysPastOpener`) runs only after the outcome was chosen.

**Fix.** Add src/director/board.ts: `scheduleMoment` moves there and keeps only the gates (each card's first failed gate on the entry) and the record stop rules; every other moment waits on the day's board. `pickFromBoard` runs once a day for each watched person over the waiting moments and every scene from circumstance offered, by the amount felt, checks wordings before the pick, and picks one while the life's pace over the trailing year, counted in picks, leaves room. The weekly spacing and the single circumstance pick are deleted. Dev mode's director's day shows the board's columns on the same row. Where the player sees it: fewer scenes, each the strongest of its day.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the pick is by the amount each candidate was felt, gates are facts of the records, and equal amounts break by the stable hash, never a roll. Replace, never layer: the outcome block, the weekly spacing and the single pick are deleted in the same change.

**Done when.** A second session plays a year at a drawn place, Town, State (seed in the PR body), as a seated legislator, opens dev mode's director's day on a day with candidates, and sees each moment's cards with the first gate each failed, its score, the day's pick and the scenes from circumstance offered beside it, by record id. It counts constituent-stop, office-hours and family-filing per person in the year, with each cause record id, before and after. The year runs under two minutes and no more than 20 percent slower than its base.

**Waits on.** director-board-string-index.

**Files.** src/director/board.ts (new), src/director/scheduling.ts, src/director/ledger.ts, src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/director.json, src/bench/dev-views/director-day.ts, src/bench/ui/dev-director-day.mjs
