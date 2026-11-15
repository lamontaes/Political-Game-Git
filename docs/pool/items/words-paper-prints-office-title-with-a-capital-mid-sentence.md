---
id: words-paper-prints-office-title-with-a-capital-mid-sentence
title: "The paper's filing, petition and debate stories print the office with a capital in mid-sentence (Council member, Town board member)"
area: words
kind: bug
priority: 3
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
source: "The carry thread's played lines at Searsboro, Iowa and Averill Park, New York, Nov 14, 2026 (second reader's note on #9299)"
checked:
claimed-at:
---

**What.** At Searsboro, Iowa (1971355) the paper prints "Jennifer Schneider enters the race for Council member", "Jennifer Schneider has enough valid signatures to run for Council member" and "Candidates for Council member debate"; at Averill Park, New York (3603320) "Catherine McLaughlin has filed for Town board member ahead of the election". The title stands with a capital in the middle of a sentence. The race-result stories say it in lower case ("elected mayor"). Seen: the paper's filing, petition-check and debate stories.

**Cause.** Found in code: the filing, petition-check and debate builders in src/bench/printed-words.ts pass the contest record's title (`f.office`, "Council member") straight into the `{office}` slot, while the result builder lowercases it through `officeWords` (rule 34).

**Fix.** One reader says the office for every race story: the title through `officeWords`, or the member word where the body is named for its members (`Reader.contestOffice`, #9299), so no builder passes the raw title.

**Time box.** 1 hour.

**Rules.** No hand-written player text in code. Replace, never layer: the per-builder raw title is deleted.

**Done when.** A second session, in the running game on main, plays a drawn place with a council or a town board (Searsboro, Iowa and Averill Park, New York are two it was seen at), reads the filing, petition-check and debate stories, and none has a capital in mid-sentence; the rest of those lines are unchanged.

**Waits on.** The alderman title change (#9299) for `Reader.contestOffice`.

**Files.** src/bench/printed-words.ts
