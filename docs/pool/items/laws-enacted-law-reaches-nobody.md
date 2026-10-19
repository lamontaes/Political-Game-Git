---
id: laws-enacted-law-reaches-nobody
title: "An enacted town law took effect and no engine read it (Meadow Lakes, Alaska, seed f835dd278d7312a1)"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** An enacted law in Meadow Lakes, Alaska (world seed f835dd278d7312a1) took effect and no engine read it. The finder recorded only the title, so the check that raised it is not known. The first job is to find the check (a law with an effective date that no handler, record or reader touches in a played year) and name the law.

**Rules.** An effect is a read, not a record: a law has an effect only when a different engine reads it at the moment it decides or pays. The chain is the acceptance. One rule, all 56 places.

**Done when.** In a played year of Meadow Lakes (`buildBenchWorld`, the seed above), every law that took effect has a named reader (an engine that read it when deciding or paying, by record id) or a registered reason it has none, and a test lists the laws and their readers.

**Files.** src/core2/law-reach/host.ts, src/core2/modules/housing.ts, src/core2/law-reach-balance.test.ts

**Notes.** Looked at Oct 19 (claude/law-reaches-nobody), not built. Replaying Meadow Lakes for 365 days from the game start: 12 non-state laws took effect, of which the ones with no law-reach handler (`policyHandlerKeys`) are the Matanuska-Susitna Borough's `housing-land-use.inclusionary-requirement` and `allow-multifamily-in-single-family-zones` (read directly by `src/core2/modules/housing.ts` at construction decisions, so not unread, but only when something is built), the state's `rent-stabilization` (value 0, seven rows) and `broaden-local-authority` (value 0), and the borough's property tax and the federal and state amounts (SNAP maximums, Medicaid match, unemployment insurance, local sales and income tax authority), which other engines read as numbers. I could not tell which one the finder meant. Ask the finder for the check, or build the "named reader or registered reason" list above as the detector.
