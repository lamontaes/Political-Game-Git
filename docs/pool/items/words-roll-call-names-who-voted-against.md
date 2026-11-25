---
id: words-roll-call-names-who-voted-against
title: "The paper's vote story can say who voted against, from the body's own vote rows"
area: words
kind: wiring
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
source: "CTO, Nov 24 19:54Z (7142760180 on #10377): file each missing fact as an engine item for its owner; the Story lead's question, 7142124378 on #10377"
checked:
---

**What.** The news writer (W5) can say a vote's count ("12 to 3") and whether it passed, but never who voted against. So every vote story reads alike, and the sameness gate's part 2 fails for want of a fact, not a wording. Seen: the paper's story on a council or legislature vote.

**Cause.** Found in code: each member's vote is kept as a row in the `votes` table (src/core2/modules/legislature.ts:5025-5034) and as an `office.voted` event (:5012-5014). But the `legislative-vote` event carries only the `yes` and `no` counts (:5058-5085), `bill-failed` is the same (:6050-6071), and the `rollCall` builder (src/bench/printed-words.ts:982) passes only the count, the body and passed or failed. A `{nays}` slot exists only in the cabinet-confirmation lines.

**Fix.** In `rollCall`, read the bill's rows from the `votes` table and carry `nays` (the number against, in words) and `against` (the members who voted no, named through the said-as reader, by vote row id). Do the same for `bill-failed`. Write no new record. W5 writes the lines.

**Time box.** 2 hours.

**Rules.** An effect is a read, not a record: the story reads the body's existing vote rows, with no second tally. No hand-written player text: members are named through the said-as reader, never typed.

**Done when.** In a played year at a drawn place, a vote story with at least one no vote carries `against` naming those members, by vote row id, and a unanimous vote carries none. A second session sees a story that names a member who voted against once W5's lines are in.

**Waits on.** Nothing. The lines wait on W5.

**Files.** src/bench/printed-words.ts, src/core2/modules/legislature.ts
