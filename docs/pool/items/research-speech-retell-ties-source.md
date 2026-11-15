---
id: research-speech-retell-ties-source
title: "Research: source the number of close ties outside the house a retold speech reaches"
area: elections
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
lead: researcher
source: Account lead thread "Make elections read your record", Nov 14
claimed-at:
---

**What.** `speechRetellTies` in src/core2/data/speech/parameters.json is the game's own estimate (3, spread 1 to 6) of how many people past the household a listener who retells a speech tells. Find a public source for how many people a person talks politics or important matters with outside their household, and replace the estimate with a sourced value and range. Seen: in how far a speech you give travels past the family it was told to.

**Cause.** Design: docs/research/stand-in-figures-2026-10-12.md lists the stand-in figures the research items replace; this estimate was set on Nov 14 with no source fetched (#9248), tagged ESTIMATED with a spread and no named source; the owner's rule is that every number is SOURCED, ESTIMATED or TUNABLE with its source and spread (AGENTS.md, Placeholders).

**Fix.** Replace the row's value, citation and spread with what a fetched source says (publisher, year, URL, unit), keeping the rule in `tiesBeyondHome` in src/core2/modules/speech.ts as it is; the figure only sets how many of the closest ties are told.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real data calibrates the number and never decides who hears a speech; the closest ties are taken in order of closeness, no dice (`no-dice`). Estimate, never UNKNOWN: the number stays an estimate until a source is read.

**Done when.** A second session reads `speechRetellTies` in a drawn place's played world (place and seed named, any of the 56) and finds it SOURCED or ESTIMATED with a fetched citation (publisher, year, URL) and a spread (low, high, unit, citation), and one retold speech in that world reaches that many ties at most, by record id.

**Waits on.** Nothing.

**Files.** src/core2/data/speech/parameters.json

**Notes.** From #9248. The earlier draft cited discussion-network studies from memory; that was removed because nothing was fetched.
