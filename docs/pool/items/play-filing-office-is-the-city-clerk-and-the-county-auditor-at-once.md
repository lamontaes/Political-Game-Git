---
id: play-filing-office-is-the-city-clerk-and-the-county-auditor-at-once
title: "The filing office is the 'County auditor, Danville' on Travel and 'the City Clerk's office' in the scene"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** Travel lists 'WHERE YOU FILE / County auditor, Danville'. The scene there opens 'you head to the City Clerk's office to ask about running', and on the second filing: 'Susan Strickland, the City Clerk, is already at the counter' and then 'Susan Strickland, with the county auditor.' Iowa city candidates file with the county auditor, and the Des Moines County auditor sits in Burlington, not Danville. The same filing counter takes a $65 gift for the player's campaign from Susan Strickland on the first donor calls. Seen: Travel, the filing talk and Call donors.

**Cause.** Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); the petition-checked record says filedWith 'County auditor', while the filing talk's opener names the City Clerk's office. Found in code: not yet; the opener's office words and the counter's office record are read from different places.

**Fix.** The filing scene's words name the office the filing record names (filedWith), and the place on Travel is the county seat's office when the office is a county's. The person at the counter is an election official who is not asked for campaign money. Words for any new office name go through the Words session.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** The simulation is the one layer that knows. One rule, all 56 places.

**Done when.** A second session files on main in a drawn place where a county office takes town filings, named with its seed, and Travel, the scene and the petition record all name the same office.

**Waits on.** Nothing.

**Files.** src/bench/filing.ts, data/english/parts/scene-talk.json, src/core2/campaign-day.ts
