---
id: words-paper-endorsement-in-its-own-voice
title: "A paper's own endorsement prints as a news item about itself, with no reason; it needs the paper's own voice and its reason"
area: words
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: press-paper-prints-its-own-endorsement
blocked-on:
root: none
lead: words
model: fable
effort: medium
source: Views thread, Nov 15 (Words lead's ruling on #9466)
---

**What.** Since #9466 a paper prints its own endorsement in its own pages, through the existing endorsement story, which reads as a report of someone else's backing with the paper's name put in: "The Marshfield Press endorsed Judith York for the Marshfield Select Board ahead of the November 4, 2025 vote." (Marshfield, Massachusetts, 2538820, world seed 75d9b7ad, Oct 6, 2025). An endorsement in a paper's own pages is its editorial: the paper speaks for itself and gives its reason, and three of the four printed at Marshfield give none. Seen: the News, in the week after a paper endorses, under the paper's name.

**Cause.** Found in code: a paper's own endorsement is worded by the one `endorsement` builder in src/bench/printed-words.ts, which reports a backer's endorsement and has no piece for a paper speaking for itself. The Words lead ruled on #9466 (Nov 15) that in that PR the paper's own endorsement prints as a news item, nothing on the page calls it an editorial, and the editorial in the paper's own voice with its reason is this later item. The facts the record holds for the reason are on the endorsement row (`EndorsementRow` in src/core2/modules/campaigns.ts, kept by `outletWeighsRace`): `reason` (the kind of reason the weighing gave), `agreement` (how far the paper's head agrees with the candidate's platform), `issue` (the platform question the head disagrees with most), `tie`, `backing`, `rivalFilingId` and `score`, with `speakerId` the head who weighed the race. The row's `stance` is left empty for a paper since #9466, so a reason that names the question the paper agrees on most needs the head's own platform read (`platformRead` with the head's views) at the time of the print.

**Fix.** The Story session writes the editorial's own pieces in the bank (the paper in the first person plural, the candidate, the race and one reason from the row's facts, never invented). The printed-words `endorsement` builder in src/bench/printed-words.ts picks those pieces when the endorsement's organization is the printing outlet's own. No new engine.

**Time box.** 3 hours.

**Rules.** No hand-written player text in code: the pieces live in the banks and only the Story session writes them. Ask why, by record: the reason printed is a fact on the endorsement row, named by row id in the played file.

**Done when.** A second session, on main, in a drawn place with a paper and a local race (place and seed named), plays to the week after its papers endorse and reads each paper's endorsement in the paper's own voice with a reason that matches its endorsement row.

**Waits on.** press-paper-prints-its-own-endorsement

**Files.** src/bench/printed-words.ts, src/core2/modules/campaigns.ts

**Notes.**
