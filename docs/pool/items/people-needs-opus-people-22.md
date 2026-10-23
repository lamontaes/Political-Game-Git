---
id: people-needs-opus-people-22
title: "Needs from other sessions listed in OPUS-PEOPLE.md (line 22): 10 lines"
area: people
kind: wiring
priority: 2
status: done
claimed-by: claude/people-22
pr: #4549
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OPUS-PEOPLE.md "Needs from other sessions" (line 22)'
claimed-at: 2026-10-16T02:44:30.618Z
---

**What.** Ten requests remain on the press and interviews: an interview subject in the conversation and a bring-it-up row for `news.read`, staff households (SG-PEOPLE-press-staff-households), local businesses buying ads (SG-PEOPLE-press-outlet-revenue), the news archive reading the press's outlets, town reporters leaving through the jobs engine and the position reopening for its seekers, a control to ask an outlet for an interview, and `makeStatements` appending repeated stances with reused ids (elections audit defects 31 and 32). Verify each on main, close what is built and split the rest. The player would notice interviews as real conversations and one consistent list of outlets.

**Rules.** Look before you ask: check docs/ and the register first; the endorsement question (SG-PEOPLE-press-endorsements) is the owner's, read the register before asking; Wire to the world: each line closes when another engine reads what it wrote, by record id; An effect is a read, not a record: the archive reads the press's outlets and the director reads the interview records; No dice: reporter turnover follows the jobs engine's own choices, not a roll; Replace, never layer: the second list of outlets in `past-news.ts` is deleted; No hand-written player text: interview lines come from the English banks; Placeholders: open lines keep their stopgap rows.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): each of the ten lines in `docs/archive/2026-10-23/coordination/OPUS-PEOPLE.md` (line 22) is struck with an id or has a pool item, and the year shows an interview opened through the conversation with its answers, one list of outlets used by the archive and the press, and a reporter who left being replaced on the masthead (interview, outlet and hire ids named). The owner plays it: asks the town paper for an interview and reads the story.

**Files.** src/core2/modules/press.ts, src/core2/past-news.ts, src/core2/press-staff.ts, src/director/conversation.ts, docs/archive/2026-10-23/coordination/OPUS-PEOPLE.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Triage (Oct 16, checked against main).** Line by line:

1. `makeStatements` repeated stances and reused promise ids (defects 31 and 32): built; it dedupes by promise id, so interviews can call it once each. Struck.
2. Interview subject in the conversation: open, kept as SG-PEOPLE-press-interview-conversation under `gov-stopgap-press-missing-mechanic`; it is the Words line's (Opus), so not taken here.
3. Bring-it-up row for `news.read`: open under `gov-stopgap-press-desk-missing-record`; also the Words line's.
4. Staff households: open under `gov-stopgap-press-staff-missing-record`.
5. Local businesses buying ads: open under `gov-stopgap-press-faked-mechanic`.
6. Archive reads the press's outlets: open under `gov-stopgap-past-news-missing-record`. Checked: the stand-in `outlets` table that `past-news.ts` writes has no reader in `src/core2`; only the story's `outletId` is read.
7. Reporter turnover through the jobs engine: open under `gov-stopgap-press-faked-mechanic` (SG-PEOPLE-press-staff-turnover).
8. Favors and leaks and endorsements: open under `people-favors-and-leaks-stopgap-sg-people-press` and `gov-stopgap-press-missing-mechanic`; endorsements stay the owner's question.
9. Control to ask an outlet for an interview: the record side and the character's own interview act exist (`office-day-acts.ts` `interview`, `campaign-day.ts`); the player cannot yet pick the outlet. New item `play-pick-outlet-for-interview`.
