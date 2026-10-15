---
id: people-needs-opus-people-22
title: "Needs from other sessions listed in OPUS-PEOPLE.md (line 22): 10 lines"
area: people
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-PEOPLE.md "Needs from other sessions" (line 22)'
---

**What.** Ten requests remain on the press and interviews: an interview subject in the conversation and a bring-it-up row for `news.read`, staff households (SG-PEOPLE-press-staff-households), local businesses buying ads (SG-PEOPLE-press-outlet-revenue), the news archive reading the press's outlets, town reporters leaving through the jobs engine and the position reopening for its seekers, a control to ask an outlet for an interview, and `makeStatements` appending repeated stances with reused ids (elections audit defects 31 and 32). Verify each on main, close what is built and split the rest. The player would notice interviews as real conversations and one consistent list of outlets.

**Rules.** Look before you ask: check docs/ and the register first; the endorsement question (SG-PEOPLE-press-endorsements) is the owner's, read the register before asking; Wire to the world: each line closes when another engine reads what it wrote, by record id; An effect is a read, not a record: the archive reads the press's outlets and the director reads the interview records; No dice: reporter turnover follows the jobs engine's own choices, not a roll; Replace, never layer: the second list of outlets in `past-news.ts` is deleted; No hand-written player text: interview lines come from the English banks; Placeholders: open lines keep their stopgap rows.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): each of the ten lines in `docs/coordination/OPUS-PEOPLE.md` (line 22) is struck with an id or has a pool item, and the year shows an interview opened through the conversation with its answers, one list of outlets used by the archive and the press, and a reporter who left being replaced on the masthead (interview, outlet and hire ids named). The owner plays it: asks the town paper for an interview and reads the story.

**Files.** src/core2/modules/press.ts, src/core2/past-news.ts, src/core2/press-staff.ts, src/director/conversation.ts, docs/coordination/OPUS-PEOPLE.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
