---
id: standin-inaugural-address-for-every-sworn-executive
title: "Every sworn-in mayor, county executive and governor gives an inaugural address, not only the player"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: governing
standard: 2
model: sonnet
effort: medium
root: design-country-tier
---

**What.** An executive's inaugural address is recorded (a speech.heard record) only when the player plays their own swearing-in scene and chooses to speak. The world's other executives give none, because the office-day engine has only the annual state-of-the-city address. Stand-in SG-WORDS-swearing-in-address-in-scene.

**Cause.** Found in code: src/director/inaugural-address.ts, function giveInauguralAddress (line 58, marker line 56) is the only caller of deliverSpeech with the id `speech:inaugural:<seatId>:<date>`, and it is called only from src/director/purpose-scene.ts line 1848 when the player's swearing-in scene ends. src/core2/office-day-acts.ts has the annual address act ("state-of-the-city", line 672) but no act for the day an executive is sworn in.

**Fix.** Add one act to the office-day engine in src/core2/office-day-acts.ts, next to "state-of-the-city" and run through the same registry as every executive act: on the day an executive term starts (mayor, county executive, governor; the kinds giveInauguralAddress already treats as giving an address, via swornOffice's givesAddress in src/director/swearing-in.ts), the actor delivers the address through deliverSpeech with the same id shape `speech:inaugural:<seatId>:<date>` and an occasion fact, arguing their strongest view as the state-of-the-city act does, to the people who follow the town's outlets. The player's own swearing-in then finds the record already there (giveInauguralAddress returns early when the id exists) and the scene's address type stages it. Keep the player's executive on the existing path: the act skips the player, whose address is their choice in the scene. Clear the stopgap.

**Time box.** 5 hours for one Sonnet session. It stays cheap because the act runs once per executive term start, on the day, reading the followers already kept for the annual address.

**Rules.** The simulation is the one layer that knows: the scene reads the record, never makes its own speech (owner, Oct 28). No dice: the speaker's strongest view decides the topic. Replace, never layer: the director's copy of the logic that decides topic stays one function both callers use. One rule, all 56 places.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named) across an election year with a new mayor or county executive seated, and sees a `speech:inaugural:` record dated the swearing-in day for an executive the player did not play, with its audience and the views it moved named by record id; then plays the player's own swearing-in and sees the one record, not two.

**Waits on.** Nothing.

**Files.** src/core2/office-day-acts.ts, src/director/inaugural-address.ts, src/director/swearing-in.ts, src/director/purpose-scene.ts, src/core2/modules/speech.ts, src/director/data/stopgaps.json
