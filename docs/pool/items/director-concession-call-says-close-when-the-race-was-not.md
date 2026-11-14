---
id: director-concession-call-says-close-when-the-race-was-not
title: "The concession call tells a player who lost badly that it was close"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: campaign events debate run, Nov 14 2026
checked:
---

**What.** On election night after a loss, the campaign manager answers "How close was it?" with "Closer than anybody expected. Not close enough to count again." In the played run at Amherst NH (seed d1f4a9c7e2b0) the player's own totals were 15 of 190 votes, with the winner on 114. A player who lost that badly is told it was close, and the next reply ("I can live on that") rests on it. Seen: on a lopsided loss the manager says it was close.

**Cause.** Found in code: the `concession-call` purpose answers the "ask" move with one wording, `Closer than anybody expected` (data/english/parts/scene-talk.json, concession-call asked-how-close piece), and the packet carries `vote-share` and `turnout` facts that no piece is fitted by, so every loss gets the same answer whatever the totals were.

**Fix.** Fit the answer by the player's share of the vote as a sliding scale, never a threshold: the packet gives a word-fitting fact (`close-loss`, `clear-loss`, `heavy-loss`, each with a weight from the share against the winner's, from the election-result record's totals) and the bank holds at least two wordings for each, none of which says a figure (rule 101). The vote share stays out of every line.

**Time box.** 3 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the answer reads the election result's totals when it is said. People say how it feels, never the figure, so no wording names a percentage. Review: words.

**Done when.** A second session plays three drawn places with a fresh seed, loses a race by a wide margin in at least one, and sees the manager's answer to "How close was it?" match the totals on the election-result record, with the record id named in the packet and no figure said in the line.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** Evidence: /mnt/project-files/words-lead/campaign-events/runs/town-debate1.md (race-lost section).
