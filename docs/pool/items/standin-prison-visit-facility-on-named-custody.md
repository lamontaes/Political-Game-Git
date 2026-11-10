---
id: standin-prison-visit-facility-on-named-custody
title: "A named prisoner's custody row records the facility so the visit scene says the glass and the time only where that kind has them"
area: words
kind: wiring
priority: 4
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** Every prison visit says a guard stands by, you talk through glass and the visit ends when the guard says, for a jail, a prison or a person held before trial alike. Closes stand-in SG-WORDS-prison-visit-limits-fixed.

**Cause.** Found in code: src/core2/modules/justice.ts keeps `facility` on counted custody rows (`CountedCustodyRow`, line 262) but a named prisoner's custody row (written near line 1276) has none; src/director/custody-facts.ts (`custodyFacts`) therefore has nothing to read, and the lines in data/english/parts/scene-talk.json say the glass for every visit.

**Fix.** Give a named custody row a `facility` of the same kinds counted custody uses (jail, prison, juvenile), chosen by the same rule as counted custody (sentence length and charge class, from the justice engine's own parameters, no dice). Have `custodyFacts` put a `facility` fact on the visit scene, and gate the glass and time lines on it through the line rules (data/english/line-rules.json via `npm run words:rules`) so that only a facility kind that has glass says it. Where a kind has no rule, the line says nothing of glass. Delete the marker.

**Time box.** 4 hours.

**Rules.** Effect is a read: the scene reads the facility from the custody row, cited by record id. No hand-written player text. One rule, all 56 places. Speed: the facility is set once when custody begins.

**Done when.** A second session, in a generated world in a drawn place (place and seed named), visits a named prisoner held in a jail and one in a prison and sees the narration differ by facility, each citing the custody row; a visit to someone with no facility kind says nothing of glass.

**Waits on.** Nothing.

**Files.** src/core2/modules/justice.ts, src/director/custody-facts.ts, src/director/prison-visit-scene.test.ts, src/director/data/stopgaps.json

**Notes.** Stand-in triage Nov 10 (chunk 2). The money and word-to-family promises of the same visit (SG-WORDS-prison-visit-promise-unread) are left to stay: prisons' money accounts are not on the golden path.
