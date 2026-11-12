---
id: words-machine-part-4-every-unattached-note-is-a-rule-or-has-a-reason
title: "The words machine, part 4: each of the owner's notes that no rule holds becomes a rule or carries a written reason"
area: words
kind: feature
priority: 1
size: S
status: done
standard: 2
claimed-by: claude/fable-b3-notes-to-rules
pr: #8203
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: split from words-machine-rules-from-the-owners-notes by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-10T19:03:10.260Z
merged-at: 2026-11-10T20:23:47.857Z
seen-by: second-session-2
seen-at: 2026-11-11T03:10:30.892Z
---

**What.** When every place the owner's rulings live was read, 63 of his notes about words attached to no rule. Each is either a rule nobody has written or something that is not a rule about lines. This part settles each one, so no note of his is left unread by the machine.

**Cause.** Design: docs/design/words-machine.md (every note becomes a rule or a reasoned exception). Pull request 8154 adds data/english/notes-not-rules.json, which lists the 63 notes with where each was said.

**Fix.** Go through the list one note at a time. Attach it to an existing rule that already says it; or write a new rule row with status `awaiting-test` and the right `judges` value; or keep it on the list with one sentence saying why it is not a rule about lines (a design call, a screen note, a one-time remark). A note that asks for a decision goes to the CTO's list, quoted. Write no detector here.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Look before you ask: a note that reads like an open question is searched in OWNER-DECISIONS.md before it goes anywhere. Quote the owner's words exactly, with the file and date. A rule records a ruling and never makes new policy. Look before you ask: a note that reads like an open question is searched in OWNER-DECISIONS.md first.

**Done when.** A second session, on main, opens data/english/notes-not-rules.json and finds every note either gone to a rule (the rule row quotes it) or kept with a reason; it picks five at random and agrees with where each went. `npm run words:rules` still reports no conflicts, and the English guards' test passes. Nothing in play changes in this part, so its check in a drawn place is part 1's.

**Waits on.** Pull request 8154 on main.

**Files.** data/english/notes-not-rules.json (new), data/english/line-rules.json, data/english/rulings-read.json (new)

**Notes.** Seen in the game (2026-11-11, second-session-2): data/english notes-not-rules.json (no place), seed random sample 7, main 67947ae8: all 61 notes in notes-not-rules.json carry a reason, five random ones agree with where they went, words:rules ran clean twice and the English guards passed 64 tests
