---
id: press-desk-commits-to-a-vote-before-the-call
title: "A reporter calls a member only about a vote the paper has decided to print, and the story prints right after the call"
area: gov
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: high
root: none
source: Words lead rulings 91 to 98 (Nov 14) and the Account lead's routing (Nov 14 05:28Z)
claimed-at:
---

**What.** The reporter's call after a vote is cast with no check that the paper will print the vote; the desk prints weekly, days later, and prints only its top stories. Make the desk decide first: a call plays only about a vote the desk has picked, and the story prints right after with the comment. Seen: the reporter stops a member after a vote the paper will run, and the paper's story of that vote quotes what they said or says they declined.

**Cause.** Measured: on the train head 9114e4ef8d, two drawn places, fresh seed `ends-1e48e4a3`. Doolittle, Texas: the call was on 2025-01-29, the story of the vote printed on 2025-02-03 with the quote. Longville, Louisiana: no story of that vote printed in ten days, so a comment was kept and nothing printed. Found in code: the call's reporter is cast in src/director/civic-roles.ts (`press-corps`) with no check; `pressWeek` in src/core2/modules/press.ts runs `runDesk` in src/core2/press-desk.ts, which scores the fresh wire and prints the top few per reporter and week.

**Fix.** On its press-week day `runDesk` picks the votes it will run and writes one held row per pick (outlet, wire item, print date). A reporter calls only about a vote with a held row, on that day; the story prints with the comment on the outlet's next printing (`printed-words.ts` already adds the quote or "declined to comment" when the story is on or after the comment). A vote with no row stages no call. A call that happens ends in a printed story or a recorded spike reason. The held rows fold into the printed story's record once it prints.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes and set the state honestly.

**Rules.** Nothing daily (cadence-and-summaries): the desk already runs weekly, the added work is one row per picked vote. Speed (owner, Oct 29): year 1 plus time per record at three named drawn places, with and without, tables in the PR body. No dice: the pick is the desk's own score. Wire to the world: a call reads a record the desk wrote.

**Done when.** A second session, on three drawn places with a fresh seed in dev mode, plays a vote the desk picked and sees the call that day and the story with the comment on the outlet's next printing, citing the reply's record id; a vote the desk did not pick staged no call. The PR body carries the speed table.

**Waits on.** Nothing.

**Files.** src/director/civic-roles.ts, src/core2/modules/press.ts, src/core2/press-desk.ts, src/bench/printed-words.ts

**Notes.** Drafted by the Account lead's builder (S5) Nov 14 from /mnt/project-files/words-lead/8910/pool-item-desk-commits-before-the-call.md.
