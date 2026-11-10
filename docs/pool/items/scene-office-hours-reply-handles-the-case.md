---
id: scene-office-hours-reply-handles-the-case
title: "What the official says to a constituent at office hours handles the case: take it on, refer it, or say what can't be done"
area: director
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web constituents pass (packet a-constituents-case)"
lead: director
milestone: play-first
claimed-at:
after:
model: sonnet
effort: medium
root: design-director-on-core2
---

**What.** The office-hours scene stages a resident with a case, but the official's reply writes only a scene.reply that no engine reads. Only the desk's decision calls handleCase (src/core2/office-day-state.ts, src/core2/office-day-acts.ts). So "I'll take it on", "Let me refer you" and "There's nothing I can do" change nothing for the resident. The packet docs/design/scenes/from-life/a-constituents-case.md (legislative casework guides and city council records, calibration only) shows what each answer does in real life: a call to the agency, a referral, a letter, or an honest no.

**Cause.** Found in code: replyInScene in src/director/purpose-scene.ts (line 1700) writes the scene-reply record of kind scene.reply and the tie contact and never calls handleCase in src/core2/modules/constituent-cases.ts (line 586, decisions help or decline); nothing under src/director reads constituent-cases.

**Fix.** In replyInScene, for an office-hours scene whose cause is the resident's case, call handleCase with help for a take-it-on or refer reply and decline for a no, for the visiting resident's case, and write the resident's impression of the official citing the reply record id. Add a test that fails when the reply leaves the case row untouched.

**Time box.** 3 hours.

**Rules.** An effect is a read, not a record: the reply must reach the constituent-cases engine, which raises the wage case or records the referral the same way the desk does. Ask why: the resident's view of the official cites the reply. No dice.

**Done when.** A second session, in a buildBenchWorld drawn place (seed named), sees an office-hours scene's reply of take-it-on or refer call handleCase with the matching decision for that resident's case. The case row records it, and the resident's impression of the official cites the reply record by id. A test fails when the reply leaves the case untouched.

**You will see.** You tell the resident at office hours you'll take their case, and the case shows up as handled on your desk, with the resident's view of you changed by it.

**Screenshot.** The office-hours scene and the desk's case list after it, from a drawn place.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/core2/modules/constituent-cases.ts, src/core2/office-day-state.ts, src/core2/office-day-acts.ts

**Notes.** Engine gaps the packet names (offices, housing, jobs): only two kinds of case exist; no eviction, shutoff, benefits or code case; no agency reply or closing for silence.
