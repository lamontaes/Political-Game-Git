---
id: director-address-point-reasons-lease-relative-story
title: "A housemate's stand on the President's point can come from their lease, a relative in the house or a story they read"
area: director
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-address-point-reasons
pr: 10128
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: CTO, Nov 18 08:47Z on the Story thread (issue 9750), order item 1 for the opening evening at home: "widen `has-reason` to a lease, a relative in the house and a story read"
checked:
---

**What.** On the first evening a housemate raises a point of the President's address and says where they stand "from their own life" (owner, Nov 11). Today their life speaks only through work lost or looked for and money that is hard. In five drawn worlds on Nov 18 (Mableton GA, Puhi HI, Chance OK, Mandan ND, Millsboro DE) no housemate had either, so every stand was said with no reason, and the "what would you do instead" reply was never offered. Seen: the talk box on the first evening at home.

**Cause.** Found in code: `addressPointFor` in `src/director/conversation.ts` picks a work point only for a job lost this year or a job search, and a money point only for hardship stress or an eviction; any other speaker takes a policy point with reason `view` or a year point, which carries no reason fact. `viewReason` in `src/director/view-learned.ts`, which sets `has-reason` for own-view talk, reads only the job and the household's hardship. A lease, a relative in the house whom the question touches, and a printed story the speaker learned are all on record and read by nothing here.

**Fix.** Add three reasons, as data rows by question and side, in the rules file `addressPointFor` already reads (`src/director/data/conversation-rules.json`, `addressPoint`): `lease` (the household rents, and its rent is a real share of its income on the books, so money talk only when the books make it matter); `relative` (a person in the house the question touches: a child in school, someone of retirement age, a student with loans, matched by question); `story` (the speaker holds a printed story's knowledge row on the question; the reason cites that record). Each gives `pointSubject` its mark (`why-lease`, `why-relative`, `why-story`) and record ids, counts for `pointAnswerable`'s "instead" gate, and gets reason pieces in `data/english/parts/conversation.json` with inserts (the relative's name, the outlet). `viewReason` reads the same rows, so own-view talk widens with it. One engine: no second picker.

**Time box.** 4 hours.

**Rules.** The simulation is the one layer that knows (owner, Oct 28). No dice: the reason follows the records. Talk says how it feels, never the figure (owner, Nov 11). Money talk only when the household's real books make it matter (CTO, Nov 18 08:47Z).

**Done when.** A second session, in a played opening evening at a drawn place, a housemate who rents, lives with a relative the point touches, or read a story on it raises the point with that reason, and the dev mode Trace names the lease, the relative's person record or the story's record. `src/director/conversation-address-talk.test.ts` gains a case that finds each reason by drawing places and names what it passed over.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/view-learned.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json

**Notes.** Nov 18 (Story): filed with the rebuilt opening-evening lines; the lines' reason pieces for work and money are in that pull request.
