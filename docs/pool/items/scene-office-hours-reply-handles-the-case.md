---
id: scene-office-hours-reply-handles-the-case
title: "What the official says to a constituent at office hours handles the case: take it on, refer it, or say what can't be done"
area: director
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web constituents pass (packet a-constituents-case)"
lead: director
milestone: play-first
claimed-at:
---

**What.** The `office-hours` scene stages a resident with a case, but the official's reply writes only a `scene.reply` that no engine reads. Only the desk's decision calls `handleCase` (`src/core2/office-day-state.ts`, `src/core2/office-day-acts.ts`). So "I'll take it on", "Let me refer you" and "There's nothing I can do" change nothing for the resident. The packet `docs/design/scenes/from-life/a-constituents-case.md` (legislative casework guides and city council records, calibration only) shows what each answer does in real life. A call to the agency, a referral, a letter, or an honest no.

**Rules.** An effect is a read, not a record: the reply must reach the constituent-cases engine, which raises the wage case or records the referral the same way the desk does. Ask why: the resident's view of the official cites the reply. No dice.

**Done when.** In a buildBenchWorld drawn place (seed named), an office-hours scene's reply of take-it-on or refer calls `handleCase` with the matching decision for that resident's case. The case row records it. The resident's impression of the official cites the reply record by id. A test fails when the reply leaves the case untouched.

**Time box.** 3 hours.

**You will see.** You tell the resident at office hours you'll take their case, and the case shows up as handled on your desk, with the resident's view of you changed by it.

**Screenshot.** The office-hours scene and the desk's case list after it, from a drawn place.

**Files.** src/director/purpose-scene.ts, src/core2/modules/constituent-cases.ts

**Notes.** Engine gaps the packet names (offices, housing, jobs): only two kinds of case exist; no eviction, shutoff, benefits or code case; no agency reply or closing for silence.
