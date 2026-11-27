---
id: history-engine-reads-votes
impact: none
---

The voting, candidacy and campaign engines read a person's recorded votes through the one history reader (`votesCast`) instead of the record engine's table. The engines' own past reads go from 80 to 74. The records proof over four years (seed aaecccf215b1) is identical.
