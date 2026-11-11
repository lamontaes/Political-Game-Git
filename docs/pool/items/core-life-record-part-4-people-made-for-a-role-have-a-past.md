---
id: core-life-record-part-4-people-made-for-a-role-have-a-past
title: "The life record, part 4: a person the game makes to hold a role has a working life and a birthplace"
area: people
kind: stopgap
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-core-life-record-part-4-people-made-for-a-role-have-a-past
pr: #8381
after:
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:27:49.911Z
branch: claude/pool-core-life-record-part-4-people-made-for-a-role-have-a-past
---

**What.** A newspaper's owner, an election chief and others the engines make to fill a role open with schooling and almost nothing else. Their cards are the shortest in the game. This part gives them a birthplace and the working life that led to the role, when they are opened or met. Seen: the card of a newspaper owner, an election chief or another role-holder, which now has a birthplace and a working life.

**Cause.** Design: docs/design/life-record.md. The stopgap SG-PEOPLE-role-people-have-no-past (registered in pull request 8123, in src/core2/data/stopgaps/people.json) says what is faked: such a person gets schooling when opened, but no working life when their place is a state with no businesses on record, and no birthplace, parents or partners.

**Fix.** When such a person is opened or met, the whole-past writer everyone else uses gives them a birthplace and a working life that leads to the role they hold: earlier posts in the same body or trade, read from the office's or the organization's own records where those exist, otherwise made from the seed and marked as an estimate. Parents and partners only where opening any person already makes them. Clear the stopgap, or narrow it to exactly what is left and say why.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Two-level population: nobody gets a past until opened or met, and what is filled in matches the records. Estimate, never unknown. No dice. One rule, all 56 places.

**Done when.** A second session, on main in a drawn place it names with its seed, opens the card of the town paper's owner or the state's election chief: it has at least four sentences, one of them work before the role, and reads the same when opened again.

**Waits on.** Nothing. The life record's three steps it waited on are on main (pull requests #8115 and #8139, which holds #8123).

**Files.** src/core2/person-life.ts (new), src/core2/past-work.ts, src/core2/data/stopgaps/people.json

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:27 UTC) on branch claude/pool-core-life-record-part-4-people-made-for-a-role-have-a-past.
