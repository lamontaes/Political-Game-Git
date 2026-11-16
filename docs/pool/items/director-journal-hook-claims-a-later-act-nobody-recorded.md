---
id: director-journal-hook-claims-a-later-act-nobody-recorded
title: "The Journal's look-back hook says what a person would do next when the record holds no later act of theirs"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 16: a held bill's entry ended 'Little did I know what Danielle Bailey would do next.' with nothing in the record that she did anything"
claimed-at:
after:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** An entry in the Journal can end "Little did I know what {other} would do next." That tells the player a person is about to matter, yet the record holds no act of theirs after that day. A player who reads it waits for something that never comes. Seen: Texas (place 4846968, seed 8647-mason), where the senator's held paid family leave bill ended with the hook naming the committee chair.

**Cause.** Measured: at place 4846968, seed 8647-mason, by `npx vitest run src/director/journal-held-bill.test.ts` before the row turned the hook off, `composeJournal` in `src/director/journal.ts` adds the hook when `later` is true, and `later` is true when any later story lists the same person among its counterparts (`counterpartIds`), whatever that person did in it. A committee member named in someone else's introduced bill therefore counts as someone who "would do" something.

**Fix.** `later` needs a later moment in which the person is the one who acts (the moment's own subject, `subjectOf`), not a bystander in the counterpart list; the held-bill row's `noLookBack` flag stays until then and is deleted when the hook reads the actor.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** The Journal is a view of the ledger, so nothing new is stored. No dice. The same rule for every row, from data.

**Done when.** At Texas (place 4846968, seed 8647-mason) a test shows a look-back hook is said only where a later moment names the person as its subject, the held-bill entry says it only if the chair later acts toward the sponsor, and a second session on main, in a place and seed it names, reads three entries with the hook and finds the person acting later in each.

**Waits on.** The Journal thread, who own the hook. The player sees fewer hooks, each one kept.

**Files.** src/director/journal.ts; src/director/data/journal-rows.json; src/director/journal-hook-needs-later-act.test.ts (new)
