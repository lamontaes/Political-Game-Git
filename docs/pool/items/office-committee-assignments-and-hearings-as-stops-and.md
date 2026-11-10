---
id: office-committee-assignments-and-hearings-as-stops-and
title: "Committee assignments and hearings as stops and scenes."
area: office
kind: feature
priority: 2
status: blocked
claimed-by: claude/political-game-pool-yucp92-ss
pr:
blocked-on: words-hearing-chair-question
milestone:
source: "docs/coordination/OFFICE-STATE.md line 19 (unchecked checklist line)"
claimed-at: 2026-10-20T04:59:54.277Z
after:
standard: 2
model: sonnet
effort: medium
root: design-story-director
lead: governing
size: M
checked: fable 2026-11-10
---

**What.** A state legislator's committee seat and committee hearings exist as records, but neither reaches the player as a scene. Assignments (assignCommittees in src/core2/modules/leadership.ts) and hearings with witnesses and a committee vote (committeeRecords in src/core2/modules/legislature.ts) are written, and the state day cites them, but actOn only spends time. Add a learn-your-seat event when the player is seated and an attend-the-hearing stop when their committee hears a bill. The player notices it on the politics screen as a choice among people, never a form. Seen: a learn-your-seat scene and an attend-the-hearing stop for a state legislator.

**Cause.** Design: docs/design/story-director.md (records that change a life become scenes) and the item's own Oct 20 check: the committee day cites the seating and hearing records, but no scene reads them and the hearing bank has no question move yet.

**Fix.** Once words-hearing-chair-question lands, add a learn-your-seat scene when the player is seated and an attend-the-hearing stop when their committee hears a bill, both read from the seating and hearing records and worded by the English engine. Attending is a stop the player opts into; skipping lets the character act.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the hearing reads the bill's sections and the members' stances, and the assignment reads the leader's decision. Ask why: each assignment and each hearing outcome keeps its reasons by record id. One rule, all 56 places: committee structure comes from src/core2/data/legislature/committees.json and state data, and no state is named in code. No hand-written player text: chair questions and witness lines come from the English engine's banks (data/english/parts/hearing.json). No dice: attendance and testimony follow interests and traits.

**Done when.** A second session starts a state legislator in a drawn state (buildBenchWorld, place and seed named in the PR body), sees a learn-your-seat scene on the day the player is seated, and later an attend-the-hearing stop when their committee hears a bill, with the chair's question worded from the hearing bank. A state-day result in src/core2/office-day-state.test.ts lists the committee: assignment record id and a hearing record id with witness ids and the chair's question. Skipping the hearing lets the character act, and the day records that.

**Waits on.** words-hearing-chair-question (the hearing bank needs a question move and a reader in the story director).

**Files.** src/core2/office-day-state.ts, src/core2/office-day-registry.ts, src/core2/legislature-committees.ts, src/core2/data/legislature/committees.json, src/core2/office-day-state.test.ts

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.

Oct 20: PR #5107 merged and the committee day cites the seating and hearing records, but the chair's question and witness lines and a learn-your-seat scene are not built.

Oct 20 (fs11vb): checked before building. `data/english/parts/hearing.json` has 76 parts in seven moves (thanks, confirm, agree, answer, chair-procedure, time, repair) and no question move, and no file under src/director or src/english reads `hearing.` keys. So the chair's question cannot be worded from the bank yet: it needs a mined question move and a reader in the story director (Words line) before the office day can show it. Filed `words-hearing-chair-question` for that. The learn-your-seat scene reads the seating record that `committeeSitting` already cites and waits on the same reader.
