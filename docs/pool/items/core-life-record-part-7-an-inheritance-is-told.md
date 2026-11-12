---
id: core-life-record-part-7-an-inheritance-is-told
title: "The life record, part 7: an inheritance is told on the heir's card"
area: people
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-life-record-part-7-an-inheritance-is-told
pr: #8604
after:
blocked-on:
lead: lives
model: sonnet
effort: low
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:04:22.686Z
branch: claude/pool-core-life-record-part-7-an-inheritance-is-told
---

**What.** When someone dies and leaves money or a home, the record is kept and the heir's card says nothing, because the kind has no sentence. This part adds the row that tells it, with who left it, the year and the amount. Story writes the sentence. Seen: the heir's card, which says who left the money or home, the year and the amount.

**Cause.** Design: docs/design/life-record.md. Pull request 8139 lists the inheritance among the kinds of record that name a person and are not told, with the reason that it has no sentence yet.

**Fix.** Add the row that tells the inheritance kind in the life record's table of told kinds (src/core2/person-life.ts), with the giver, the year and the amount rounded for reading, and move the kind off the list of kinds left out. Name the bank spot on the pull request; Story writes its sentences in the three persons. The check that every kind is told or listed with a reason must still pass.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text. Player screen text: amounts are rounded and worded. Story writes every line (CTO, Nov 10).

**Done when.** A second session, on main in a drawn place it names with its seed, plays until a death leaves an estate (the Journal or the News names one), opens the heir's card and reads a sentence naming who left it and the year; Trace on it opens the estate's record.

**Waits on.** Nothing. Pull request #8139 is on main. The build does not wait for the sentence: its pull request names the bank spot, and Story writes it after.

**Files.** src/core2/person-life.ts (new)

**Notes.** Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:04 UTC) on branch claude/pool-core-life-record-part-7-an-inheritance-is-told.
