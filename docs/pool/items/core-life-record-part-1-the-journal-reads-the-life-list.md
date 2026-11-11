---
id: core-life-record-part-1-the-journal-reads-the-life-list
title: "The life record, part 1: the Journal reads the one life list, and its own way of putting a life together is deleted"
area: play
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/fable-journal-reads-life
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** A person's card and the You screen tell a life from one list. The Journal still builds its own lines from the records by its own rules, so the same event can read differently in two places or show in one and not the other. This part makes the Journal a reader of the same list and deletes its own assembly.

**Cause.** Design: docs/design/life-record.md (one list, every screen reads it) and the CTO's line of Nov 10, 2026 on issue 7365: the Journal reads the one shared life list, its own assembly is deleted, and Story's wording is kept as bank sentences. The life record's list (`lifeOf`, `rememberEvent` and `whoRemembers` in src/core2/person-life.ts) arrives on main with pull requests 8115, 8123 and 8139.

**Fix.** Make the Journal's entries about a person's life come from `lifeOf` for the player and from `whoRemembers` for events of people around them. Keep Story's journal wording by moving each sentence into the bank row that tells that kind of event, in the first person where the Journal speaks as the player. Delete the Journal's own assembly of life lines in src/director/journal.ts in the same change and count what was removed. Write no new line: where a kind has no first-person sentence, name the spot on the pull request for Story.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer. A view that computes its own version of a fact is a duplicate (owner, Oct 28). No hand-written player text in code. The journal names no feelings (owner, Nov 10). Words work is split by role (CTO, Nov 10): Story writes every line.

**Done when.** A second session, on main in a drawn place it names with its seed, plays 60 days and sets the Journal beside the player's You screen and the card of one person in the household: every life event in the Journal is on the matching screen with the same facts and date, none appears twice, and Trace on three Journal entries opens the same record the card's sentence opens.

**Waits on.** Nothing. The life record's steps it waited on are on main (pull requests #8115 and #8139, which holds #8123).

**Files.** src/director/journal.ts, src/core2/person-life.ts (new), src/bench/play.mjs

**Notes.** Being built on branch claude/fable-journal-reads-life by a helper on Fable's review (Nov 10). Whoever takes this item takes that branch.
