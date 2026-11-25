---
id: offices-speaker-role-line
title: "The Speaker of the House shows a role under the name, read from the leadership post the Speaker holds"
area: gov
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "CTO, Nov 24 20:43Z (7143979192 on #10377): the Speaker has no role line in the address; Coordinator, file it for the offices engine. Talk layout's trace, 7143168538"
checked:
---

**What.** In the President's address, everyone on the strip has a role or tie under their name except the Speaker of the House, who shows only a name ("Henry McIntyre"). A player can't tell who the third person behind the President is. The same gap reaches any presiding officer whose standing comes from a post the chamber fills rather than an office won at the polls. Seen: the address scene at Condon, Oregon, seed 747f3448-3f7e-44d0-90e3-a9d196b3407b (Talk layout, 7143168538).

**Cause.** Found in code: the role lookup `roleWord` (src/bench/card.ts:369 on claude/pt-talk-p12, merging with #10349) reads only the person's tie to the viewer and their serving terms (`servingTermsOf`, through `servingOffices`). The Speaker's standing is a leadership post: a row in leadership's `posts` table (`PostRow`, src/core2/modules/leadership.ts:95), read by `leaderOf` (:906) and `presidingOfficer`. `roleWord` never reads that table. Talk layout also found no serving office kept for the Speaker's own seat.

**Fix.** Give leadership one reader for the posts a person holds (beside `leaderOf`, from the same `posts` table) and have `roleWord` read it after serving offices, wording the post through the offices engine's title data, never a typed string. If the person cast as Speaker holds no House seat term, find where leadership fills the post and make it pick from the chamber's serving members, so the holder's seat is on record too.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: every chamber's presiding post (speaker, president pro tempore, council president) gets its line the same way, by data. No hand-written player text: the post's words come from the title data, never a string in code.

**Done when.** In a played world at a drawn place, the address scene shows "Speaker of the House" (or the post's worded title) under the Speaker's name, read from the post's row id. A state legislature's presiding officer gets a line the same way. A second session sees it on the address screen.

**Waits on.** #10349 (where `roleWord` lands).

**Files.** src/bench/card.ts, src/core2/modules/leadership.ts
