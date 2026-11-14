---
id: words-paper-bee-winner-a-person-not-a-count
title: "A spelling bee winner is a named person the paper can describe, not a counted student"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: opus
effort: medium
root: none
source: added on branch claude/project-thread-aqtryq (brief M, Nov 14)
checked: m3 2026-11-14
---

**What.** In the played places checked (Canton KS, Newbern TN, Fagasa AS, seeds h1, h2, h3) every bee winner is a counted student, so the story says 'a student' and cannot name the winner, say their grade or their parents. The Words lead wants a winner the paper names to be a person who matters: filled in the same person every time, matching the school's records. Seen: News, the bee story names the winner with grade and family.

**Cause.** Found in code: src/core2/school-honors.ts `decideSchoolHonors` (personIds only holds students who are full people; counted winners are only counted, see its header) and src/bench/printed-words.ts `honor` builder (names only when count is one and read.first() is set).

**Fix.** When a bee has one winner who is counted, fill that student in as a full person (the two-level population's fill-in, seeded so the same person returns, matching the household and school records) before the story is told; keep the unnamed lines as the fallback.

**Time box.** 3 hours.

**Rules.** No dice. A story says only what a reporter could know from a record the world holds; every line is the Words lead's.

**Done when.** In a drawn place, a second session reads the bee story naming the winner, then opens the winner's card and sees the same grade and school.

**Waits on.** Nothing.

**Files.** src/core2/school-honors.ts,src/bench/printed-words.ts
