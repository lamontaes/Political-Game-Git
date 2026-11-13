---
id: laws-hold-record-names-the-sponsor
title: "A bill held in committee names its sponsor and reaches the press, and a scene reply can put it back on the calendar"
area: laws
kind: wiring
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-laws-hold-record-names-the-sponsor
pr: #8972
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: design-story-director
source: added with npm run pool -- add
claimed-at: 2026-11-12T23:58:29.445Z
checked: fable 2026-11-10
branch: claude/pool-laws-hold-record-names-the-sponsor
---

**What.** The committee record bill-held-in-committee lists the committee's members and chair but not the bill's sponsor, so the sponsor never meets the hold as a moment and no scene can be theirs. It also carries news false, so the paper never says a bill died without a hearing, and nothing reads the scene.reply that the sponsor-asks-chair scene writes, so a chair who says yes in the scene does not set a hearing. Add the sponsor to the record's personIds with a sponsorId fact, set news so the press engine can run a held-bill line, and have the chair's hold decision read a scene.reply of type bill-held-chair that agreed. Found by scene builder C in docs/design/scenes/from-life/bill-held-in-committee.md. Seen: the paper's line that a bill died in committee and the sponsor's scene with the chair.

**Cause.** Found in code: `committeeStage` in src/core2/modules/legislature.ts (line 4274) emits the record with `kind: "bill-held-in-committee"` (line 4409) and `personIds` of the committee members and witnesses only, with news false.

**Fix.** Add the sponsor to the record's `personIds` with a sponsorId fact, set news to heard so the press engine (src/core2/modules/press.ts) can run a held-bill line, and let the chair's decision read an agreed scene.reply of type bill-held-chair as one more recorded reason.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the chair's decision stays `chairHearsBill` (position plus traits); a reply is one more recorded reason, read at the decision, never a roll. Wire to the world: the press line and the re-listing are proven in a generated world. One rule, all 56 places.

**Done when.** A second session, not the builder, plays a place drawn from all 56 with a seed nobody chose (`buildBenchWorld`, both named). src/core2/legislature.test.ts or src/director/hold-scenes.test.ts shows a bill-held-in-committee record whose personIds include the sponsor and whose sponsor meets it as a moment, a press story names the held bill by record id, and a chair's agreed scene.reply moves the bill to a committee-hearing record.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/press.ts, src/core2/legislature.test.ts, src/director/hold-scenes.test.ts

**Notes.** lead: laws-effects. Time box 3 h, Sonnet. Found by scene builder C in docs/design/scenes/from-life/bill-held-in-committee.md. Producers already on PR scenes-c-bill-held.

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/held-bill-names-sponsor` is kept; claiming this item takes it over.

Released by next (2026-11-11): no push to claude/pool-laws-hold-record-names-the-sponsor since 2026-11-11 01:52 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-laws-hold-record-names-the-sponsor.
