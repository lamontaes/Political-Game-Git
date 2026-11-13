---
id: gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint
title: "The people a quiet move shorted learn of it at the month's close and decide whether to tell"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: split from gov-treasury-diversion by Fable after the owner's Nov 10 ruling
checked: fable 2026-11-10
---

**What.** After a diversion, the head of the shorted department sees their line paid less than the budget in force says and learns why. They, and the person who keeps the books, decide whether to tell someone, and whoever hears decides whether to go to the press, with the decisions a bribe already uses. A reported diversion is a scandal like any other. This is part 2 of gov-treasury-diversion. Read docs/design/treasury-diversion.md first; this part builds "Who knows, and how it comes out" except the audit. Seen: the paper's story after a shorted department head tells the press.

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("Yes, keep it": an official can move money from one budget line to another outside the law, found out the way bribery is, through audits, the press or complaints). In code today, the `tell` decision in `onRelationshipChange` in src/core2/modules/corruption.ts looks only for taken bribes between the two people whose tie soured, and `reportToPress` (line 730) writes the fact `bribe-taken`; neither knows a crime of kind `diversion`, and nothing tells a department head why their line came up short at `closeTreasuries` (src/core2/budgets-treasury.ts line 1122).

**Fix.** At the close after a diversion, give the holder of the shorted line's department post (the cabinet or department-head rows the executive module seats, src/core2/modules/executive.ts) a knowledge record of the crime with `api.observe`, citing the close's record for the line. Then let each person who holds the knowledge (the department head, the books' keeper from part 1) make the existing `tell` decision once, at that close and again whenever their tie to the official falls, weighing what the design names: how far the tie fell, their temperament, and what the move cost their department as a share of its line. Generalize the surfaced and reported rows and `reportToPress` to carry the crime's kind, so the event `scandal.reported` and `scandalsOf` (line 877) serve both kinds and every reader of a scandal reads this one unchanged. Add no second path beside the bribe's: change the one path to take a kind. The report to a prosecutor and everything after it is part 5, on the one justice path.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: nobody is caught by a roll; a person learns from a record and decides. Ask why: nobody acts on a diversion they have not learned of, and each knowledge record cites its source. Replace, never layer: one tell path and one report path for both kinds. An effect is a read: the scandal's existing readers (voting, the press, the director) are the proof. One rule, all 56 places. Follow .agents/skills/played-world-proof/SKILL.md.

**Done when.** A second session, on main in a drawn place (place and seed named), uses dev mode to have an official divert from a line with a department head, plays to the next close, and sees the head's knowledge record citing the close, their decision to tell or keep quiet with its reasons, and, where they tell and the listener reports, the scandal in News and on the official's record by record id. A test in src/core2 names the place, the seed and the record ids, and a bribe's telling and reporting still pass their own tests through the same path.

**Waits on.** gov-treasury-diversion-part-1-the-act-and-its-money.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/executive.ts, src/core2/budgets-treasury.ts, src/core2/treasury-diversion.test.ts (new)
