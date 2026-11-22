---
id: press-interview-story-reports-the-stands
title: "A printed interview says where the candidate stands on every question asked, named as the reporter asked it"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-sew1gc
pr: "#9332"
after: press-first-week-interview-sittings-never-printed
blocked-on:
lead: elections
model: opus
effort: medium
source: "Account lead, Nov 14, 2026, reading the played Cannonville record of #9267"
root: none
claimed-at: 2026-11-14T20:30:00.000Z
---

**What.** At Cannonville, Utah, the player sat for KKVE-TV on Sept 30, 2025 and KJRN-TV on Oct 1, 2025 and answered three questions each. Each story printed in News was one line: "Where Pat Candidate stands on welfare and Medicaid" / "We asked Pat Candidate about welfare and Medicaid." It gave no stand. It named only the first question, so the other two answers appeared nowhere. And it named the subject differently from the question the player was asked: the question was "more spending on land and water", and the story printed "natural resources". Seen: the outlet pages under News, /mnt/project-files/seen/interviews/cannonville-ut-dfca8cf1/ (played.md, screens 17 and 18).

**Cause.** Found in code: the `interview` builder in src/bench/printed-words.ts filled only `name` and `issue`. `issue` came from `read.issue(topic)`, which says a budget line by its budget name (`lineName`: "natural resources") instead of the question's spoken name (`questionAbout`, data/english/question-names.json: "more spending on land and water"), which the sitting itself uses. The `interview` story kind in src/english/english-newscast.ts had no context roles, so nothing beyond the lede could print. The answers were on the record all along (the press engine's interview row, `answers`). Measured: at Cannonville, Utah (4910330), seed 3a5884384393f00611b28a5ce609187c999d9b0f21d97ef4a4e9e0a15f724a08, the row held three answers per sitting while the story said one line.

**Fix.** The builder reads the interview row. The lede says the side the candidate took on the headline's question: the two empty ledes ("We asked {name} about {issue}.", "{name} sat down with us to talk about {issue}.") are replaced by "{name} is for {issue}." (fact `issue-for`) and "{name} is against {issue}." (`issue-against`); one wording per side, since the lines after it already say "backs" and "opposes". The other answers follow as context, by last name (the existing `{last}` slot): "{last} backs {for-issues}.", "{last} opposes {against-issues}." and "{last} declined to take a side on {declined-issues}.". Each question is named the way the reporter asked it (`questionAbout`), and the headline uses the same name. A story with no answered question is still not printed (`publish` in src/core2/modules/press.ts prints only when one answer took a side), so "Where ... stands" never runs on an interview that gave no stand; printing that interview as its own story is press-interview-all-declined-is-news. Test: src/director/interview-story-stands.test.ts (removed), pinned at Cannonville, Utah. The player takes a side, declines, then takes a side. The story says each stand, names each question as it was asked, and gives the full name only once.

**Time box.** 3 hours.

**Rules.** No dice. One rule, all 56 places. Words go to the second reader.

**Done when.** A second session, at a drawn place and seed nobody chose, sits for an interview, takes a side on one question and declines another, and finds on that outlet's page in News a story that names each question the way the reporter asked it and says which side the player took, and that they gave no answer on the one they declined.

**Waits on.** press-first-week-interview-sittings-never-printed (#9267), so the player hears their own interview.

**Files.** src/bench/printed-words.ts, src/english/english-newscast.ts, data/english/parts/news.json, (new)
