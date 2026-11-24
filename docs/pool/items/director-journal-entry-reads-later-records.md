---
id: director-journal-entry-reads-later-records
title: "A Journal entry is told looking back: it reads the player's later offices and bills"
area: director
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pt-address-journal-later
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-24T20:42:50.226Z
---

**What.** The owner's grading page (Nov 24, 3:30 p.m. Eastern, docs/coordination/grading/2026-11-24-page-1-verbatim.md on claude/cto-playtest-nov23): the Journal is a memoir told looking back, '2025 was my first election. I vividly remember watching President Cunningham's speech... At the time, you know, I didn't pay that much attention', and 'if in 30 years you become a huge healthcare guy, then the journal entry could update... Little did I know'. Today an entry's facts are fixed to the records of its own day, so a later line can never say it. Add one reader of the player's later records, with each record's id, that every Journal entry's packet carries: the first office the player went on to hold, the policy area of the bills the player sponsored after the entry, and whether one of those bills answers the same policy question the entry is about, plus the years between. This item builds the engine side only; the Story lead files and writes the lines that say it (W3). Seen: a Journal entry from the first year reads differently ten years on, naming the office or the policy area the player later took up. Seen: a Journal entry from the player's first year, read ten years on, can say which office the player went on to hold or which policy area the player took up.

**Cause.** Found in code: src/director/journal.ts composeJournal builds each entry's facts from the moment's own causing records (factsById, the per-moment facts, lineFacts) and reads later records only through officeHolding (the offices serving now, for a schoolmate) and the director hindsight rescore (lines 1909-1960, which re-weighs a pair of people, never a policy area or an office the player held). The opening-evening entry (eveningTelling in src/director/journal-evening.ts on story/first-evening) takes its facts from records at or before story.date and returns null for a page whose last day is earlier, so nothing after the evening can reach it.

**Fix.** Add src/director/journal-later.ts with laterFacts(core, personId, since, through, question?) that returns packet facts, each with text and the record ids it stands on, read only from records dated after since and up to through (never the future): later-office (the first term the player began after since, by the offices module's terms table byPerson, text from the office title as officeHolding words it, ids the term and the office), later-topic (the policy area, said by topicInSentence, with the most bills the player sponsored after since in the legislature's bills table, ties to the earliest bill id, ids those bills), later-same-point (yes, when a bill the player sponsored after since has a section whose series equals the entry's own policy question, ids that bill) and later-years (the whole years from since to the latest of those records, as countSaid words, same ids). In composeJournal add the facts to each entry's packet, with since set to the entry's own date, and pass the same call to eveningTelling's facts once journal-evening.ts is on main. Add no line, bank piece or element: a fact no bank line uses changes no text. No dice: the area is the sponsored bills' count, a record, never a draw.

**Time box.** 3 hours

**Rules.** An effect is a read, not a record: the new facts are read by the Journal's packet, and the test names a record id. Everything comes from the simulation: counts of the player's own bills and terms, never a real figure. One rule, all 56 places: no place named in code. No hand-written player text in code: this item writes no words. Replace, never layer: one reader of later records; do not copy officeHolding.

**Done when.** A second session plays a drawn place with buildBenchWorld for at least ten years until the player has sponsored a bill or held an office after the first year (the test draws places and waits, drawn-place-tests), then reads the Journal's first-year entry packet through the dev Journal view or the test's composeJournal call: the packet carries later-office or later-topic with the term or bill record id, dated after the entry, and the test names the place, seed and ids. A packet for an entry dated after the last later record carries no later-* fact. Break-it: remove the call and the test fails. No line a player reads changes (the existing journal tests and tests/guards/english pass).

**Waits on.** Nothing. The Story lead's lines for it wait on this item (W3); eveningTelling's one-line wiring waits on story/first-evening reaching main.

**Files.** src/director/journal.ts, src/director/journal.test.ts, src/director/journal-later.ts (new), src/director/journal-later.test.ts (new), src/core2/modules/offices.ts, src/core2/modules/legislature.ts, src/english/policy-names.ts

**Notes.** Filed from the Coordinator's order (the CTO's 20:39Z line, 7143874990 on #9750, order 4). Story side: the Story lead files the matching writer work for W3 and writes the lines.
