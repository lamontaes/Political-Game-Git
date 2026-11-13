---
id: laws-contribution-limit-names-carry-office-keys
title: "News names a contribution-limit law by its office key: 'State campaign contribution limit: stateHouse'"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: low
root: none
source: found by opus-5234 on Nov 11, 2026, by src/bench/plain-text.browser.mjs once it reached its text checks (item tests-plain-text-no-travel-filing-place, PR 8795)
---

**What.** News in Junction City, Georgia (place key 1342800, seed a3b686cb-ba71-4137-957b-a2e414912b99) reads "State campaign contribution limit: stateHouse took effect on January 1, 2025." and the same with "stateSenate". A player reads a code name in a news story, and the plain-text check flags it as a field name. Seen: the story names the law in plain words ("the state house contribution limit").

**Cause.** Found in code: src/core2/data/legislature/bill-catalog.json lines 1715 and 1724 name the two policies "State campaign contribution limit: stateSenate" and "State campaign contribution limit: stateHouse", the office keys of src/core2/modules/campaigns.ts `STATE_CONTRIBUTION_SERIES`; the news line `{measure} took effect on {date}.` (data/english/parts/news.json line 1546) prints the policy's catalog name as it is.

**Fix.** Rename the four state policies in bill-catalog.json in plain words ("State contribution limit for governor", "for state senate", "for state house", "for local office"). Change no key or series.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Player screen text: no code name reaches a screen. One rule, all 56 places: the names are the catalog's, read in every place.

**Done when.** `node src/bench/plain-text.browser.mjs` with PLAIN_TEXT_PLACE_KEY=1342800 and PLAIN_TEXT_SEED=a3b686cb-ba71-4137-957b-a2e414912b99 reports no field name in News, and a second session in the running game in a drawn place reads News at 1440x900 and sees any contribution-limit story name the office in plain words, in a screenshot.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/bill-catalog.json
