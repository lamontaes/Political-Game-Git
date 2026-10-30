---
id: path-check-runs-for-an-open-seat
title: "The headless New Game life runs for an open council seat where one exists, as a candidate who wants to win does"
area: elections
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (measure-m5: the player loses to incumbents)
lead: governing
---

**What.** path-check (src/bench/path-check.ts) files the player for the first council race they may enter, whoever holds the seat. In the m5 measurement the player lost mostly to incumbents: in Salida, Colorado (0867280, seed 59cd061637a2f3f2) races 2 and 3 went 89 to 860 and 38 to 925 against the seat's incumbent, whose incumbency (about 0.4) and door yeses carried them, while Murray, Nebraska won the one time its seat was open. A real first-time candidate who wants to win runs for an open seat where one exists, and the candidacy engine already records whether a seat's holder stands again.

**Rules.** One engine: open is read through the one rule the player's filing uses (playerMayFileFor and playerContests) and the elections module's own records (the seat's holder, the holder's recorded stand-again decision, the filings by contest), never a second list of offices or a new tracker. No dice: the choice is the record's answer. One rule, all 56 places: nothing names a place; the proof names its place and seed.

**Done when.** path-check prefers a council race the player may enter whose seat has no holder, or whose holder's recorded decision is not to stand again or who has not filed by the filing date, and falls back to the first council race; a path-check run in a drawn place with its seed printed logs which race it chose and why, naming the seat's holder and the decision or filing record by id, and the lane reviews the PR.

**Files.** src/bench/path-check.ts

**Notes.** TODO
